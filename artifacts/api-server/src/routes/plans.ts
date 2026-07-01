import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import { loadPlans, savePlans, type Plan } from "../lib/plans-store";
import { ALL_PERMISSIONS } from "../lib/roles-store";
import { loadUsers } from "../lib/users-store";

function requireAdmin(req: Request, res: Response, next: () => void): void {
  requireAuth(req, res, () => {
    const userId = (req as Request & { userId: string }).userId;
    const store = loadUsers();
    const user = store.users.find((u) => u.id === userId);
    if (!user?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    next();
  });
}

const router: IRouter = Router();

// GET /admin/plans — list all plans + available permissions
router.get("/admin/plans", (_req, res): void => {
  const store = loadPlans();
  res.json({ plans: store.plans, permissions: ALL_PERMISSIONS });
});

// PATCH /admin/plans/:id — update an existing plan
router.patch("/admin/plans/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const body = req.body as Partial<Plan>;

  const store = loadPlans();
  const idx = store.plans.findIndex((p) => p.id === id);
  if (idx === -1) { res.status(404).json({ error: "Plan not found" }); return; }

  const p = store.plans[idx];
  if (body.name !== undefined) p.name = body.name;
  if (body.description !== undefined) p.description = body.description;
  if (body.price !== undefined) p.price = Number(body.price);
  if (body.currency !== undefined) p.currency = body.currency;
  if (body.billingPeriod !== undefined) p.billingPeriod = body.billingPeriod;
  if (Array.isArray(body.permissions)) p.permissions = body.permissions;
  if (body.tiktokUsernameChangesPerWeek !== undefined) p.tiktokUsernameChangesPerWeek = Number(body.tiktokUsernameChangesPerWeek);
  if (body.maxConcurrentWs !== undefined) p.maxConcurrentWs = Number(body.maxConcurrentWs);
  if (body.maxApiCallsPerWindow !== undefined) p.maxApiCallsPerWindow = Number(body.maxApiCallsPerWindow);
  if (body.maxLiveHoursPerMonth !== undefined) p.maxLiveHoursPerMonth = Number(body.maxLiveHoursPerMonth);
  if (body.maxLiveAnalyses !== undefined) p.maxLiveAnalyses = Number(body.maxLiveAnalyses);
  if (body.maxWebhooks !== undefined) p.maxWebhooks = Number(body.maxWebhooks);
  if (Array.isArray(body.features)) p.features = body.features;
  if (body.color !== undefined) p.color = body.color;
  if (body.isActive !== undefined) p.isActive = body.isActive;
  if (body.order !== undefined) p.order = Number(body.order);

  savePlans(store);
  res.json({ plan: store.plans[idx] });
});

// POST /admin/plans — create a new plan
router.post("/admin/plans", requireAdmin, (req, res): void => {
  const body = req.body as Partial<Plan> & { id?: string; name?: string };
  if (!body.id || !body.name) { res.status(400).json({ error: "id e name são obrigatórios" }); return; }

  const store = loadPlans();
  if (store.plans.find((p) => p.id === body.id)) {
    res.status(409).json({ error: "Já existe um plano com este ID" }); return;
  }

  const newPlan: Plan = {
    id: body.id,
    name: body.name,
    description: body.description ?? "",
    price: Number(body.price ?? 0),
    currency: body.currency ?? "BRL",
    billingPeriod: body.billingPeriod ?? "monthly",
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
    tiktokUsernameChangesPerWeek: Number(body.tiktokUsernameChangesPerWeek ?? 1),
    maxConcurrentWs: Number(body.maxConcurrentWs ?? 1),
    maxApiCallsPerWindow: Number(body.maxApiCallsPerWindow ?? 50),
    maxLiveHoursPerMonth: Number(body.maxLiveHoursPerMonth ?? 10),
    maxLiveAnalyses: Number(body.maxLiveAnalyses ?? 50),
    maxWebhooks: Number(body.maxWebhooks ?? 0),
    features: Array.isArray(body.features) ? body.features : [],
    color: body.color ?? "gray",
    order: Number(body.order ?? store.plans.length),
    isActive: body.isActive ?? false,
  };

  store.plans.push(newPlan);
  savePlans(store);
  res.status(201).json({ plan: newPlan });
});

// DELETE /admin/plans/:id — remove a custom plan (cannot delete free/basic/pro)
router.delete("/admin/plans/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const PROTECTED = ["free", "basic", "pro"];
  if (PROTECTED.includes(id)) { res.status(403).json({ error: "Os planos padrão não podem ser removidos" }); return; }

  const store = loadPlans();
  const idx = store.plans.findIndex((p) => p.id === id);
  if (idx === -1) { res.status(404).json({ error: "Plan not found" }); return; }

  store.plans.splice(idx, 1);
  savePlans(store);
  res.json({ ok: true });
});

// GET /admin/plans/:id/username-change-stats — see how many users hit the limit
router.get("/admin/plans/:id/username-change-stats", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const store = loadPlans();
  const plan = store.plans.find((p) => p.id === id);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const users = loadUsers();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = users.users
    .filter((u) => u.plan === id)
    .map((u) => {
      const changesThisWeek = (u.tiktokUsernameChangeLog ?? [])
        .filter((ts) => new Date(ts).getTime() > weekAgo).length;
      const limit = plan.tiktokUsernameChangesPerWeek;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        changesThisWeek,
        limit: limit === -1 ? "unlimited" : limit,
        blocked: limit !== -1 && changesThisWeek >= limit,
      };
    });

  res.json({ planId: id, stats });
});

export default router;
