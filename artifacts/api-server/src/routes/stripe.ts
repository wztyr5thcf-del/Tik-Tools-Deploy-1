import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { requireAuth } from "./auth";
import { loadUsers, saveUsers } from "../lib/users-store";

const router = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
}

function planForPrice(priceId: string): "basic" | "pro" | null {
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  return null;
}

function getAppUrl(): string {
  return (process.env.APP_URL ?? "https://creatools.co").replace(/\/$/, "");
}

// POST /api/stripe/checkout ───────────────────────────────────────────────────
router.post("/stripe/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Payments not configured on this server" }); return; }

  const userId = (req as Request & { userId: string }).userId;
  const { priceId } = req.body as { priceId?: string };
  if (!priceId) { res.status(400).json({ error: "priceId is required" }); return; }

  // Validate priceId against server-known price IDs only
  const allowedPriceIds = [
    process.env.STRIPE_PRICE_ID_BASIC,
    process.env.STRIPE_PRICE_ID_PRO,
  ].filter(Boolean);
  if (allowedPriceIds.length > 0 && !allowedPriceIds.includes(priceId)) {
    res.status(400).json({ error: "Invalid priceId" });
    return;
  }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }
  const user = store.users[idx];

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    store.users[idx].stripeCustomerId = customerId;
    saveUsers(store);
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/pricing?success=1`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });

  req.log.info({ userId, priceId }, "Stripe checkout session created");
  res.json({ url: session.url });
});

// POST /api/stripe/portal ─────────────────────────────────────────────────────
router.post("/stripe/portal", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Payments not configured on this server" }); return; }

  const userId = (req as Request & { userId: string }).userId;
  const store = loadUsers();
  const user = store.users.find((u) => u.id === userId);
  if (!user?.stripeCustomerId) {
    res.status(404).json({ error: "No billing account found. Please subscribe first." });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/pricing`,
  });

  res.json({ url: session.url });
});

// GET /api/stripe/config ──────────────────────────────────────────────────────
router.get("/stripe/config", (req: Request, res: Response): void => {
  // Read publishable key / price IDs from stripe-config.json (admin-managed fallback)
  let storedCfg: { publishableKey?: string; priceIdBasic?: string; priceIdPro?: string; paymentsEnabled?: boolean } = {};
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
      ? path.resolve(process.cwd(), "../..")
      : process.cwd();
    const cfgFile = path.resolve(workspaceRoot, "artifacts/api-server/data/stripe-config.json");
    if (fs.existsSync(cfgFile)) {
      storedCfg = JSON.parse(fs.readFileSync(cfgFile, "utf-8")) as typeof storedCfg;
    }
  } catch { /* ignore */ }

  const paymentsEnabled = storedCfg.paymentsEnabled ?? true;

  res.json({
    publishableKey: storedCfg.publishableKey ?? process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    basicPriceId: storedCfg.priceIdBasic ?? process.env.STRIPE_PRICE_ID_BASIC ?? null,
    proPriceId: storedCfg.priceIdPro ?? process.env.STRIPE_PRICE_ID_PRO ?? null,
    configured: !!process.env.STRIPE_SECRET_KEY && paymentsEnabled,
    paymentsEnabled,
  });
});

// Webhook handler (exported separately — registered in app.ts before express.json())
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Payments not configured" }); return; }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ error: "Missing stripe signature or webhook secret" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      Array.isArray(sig) ? sig[0] : sig,
      webhookSecret,
    );
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${String(err)}` });
    return;
  }

  const store = loadUsers();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId && session.subscription) {
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = planForPrice(priceId) ?? "basic";

      const idx = store.users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        store.users[idx].plan = plan;
        store.users[idx].stripeSubscriptionId = subscriptionId;
        saveUsers(store);
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (userId) {
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = planForPrice(priceId) ?? "basic";
      const idx = store.users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        store.users[idx].plan = subscription.status === "active" ? plan : "free";
        store.users[idx].stripeSubscriptionId = subscription.id;
        saveUsers(store);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (userId) {
      const idx = store.users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        store.users[idx].plan = "free";
        store.users[idx].stripeSubscriptionId = undefined;
        saveUsers(store);
      }
    }
  }

  res.json({ received: true });
}

export default router;
