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
  if (Array.isArray(body.features)) p.features = body.features;
  if (body.color !== undefined) p.color = body.color;
  if (body.isActive !== undefined) p.isActive = body.isActive;
  if (body.order !== undefined) p.order = Number(body.order);

  savePlans(store);
  res.json({ plan: store.plans[idx] });
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
