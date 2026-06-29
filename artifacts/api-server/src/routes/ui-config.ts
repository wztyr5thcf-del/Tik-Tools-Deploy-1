import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "./auth";
import { loadUIConfig, saveUIConfig, type UIConfig } from "../lib/ui-config-store";
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

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uiFile = path.resolve(workspaceRoot, "artifacts/api-server/data/ui-config.json");

const router: IRouter = Router();

// GET /ui-config — public, used by frontend on startup
router.get("/ui-config", (_req, res): void => {
  res.json(loadUIConfig());
});

// PATCH /admin/ui-config — update UI config (admin only)
router.patch("/admin/ui-config", requireAdmin, (req, res): void => {
  const body = req.body as Partial<UIConfig>;
  const cfg = loadUIConfig();

  if (body.navType !== undefined) cfg.navType = body.navType;
  if (body.primaryColor !== undefined) cfg.primaryColor = body.primaryColor;
  if (body.secondaryColor !== undefined) cfg.secondaryColor = body.secondaryColor;
  if (body.logoText !== undefined) cfg.logoText = body.logoText;
  if (body.logoUrl !== undefined) cfg.logoUrl = body.logoUrl;
  if (Array.isArray(body.sidebarSections)) cfg.sidebarSections = body.sidebarSections;
  cfg.updatedAt = new Date().toISOString();

  saveUIConfig(cfg);
  res.json(cfg);
});

// POST /admin/ui-config/reset — restore defaults
router.post("/admin/ui-config/reset", requireAdmin, (_req, res): void => {
  try { fs.unlinkSync(uiFile); } catch { /* ok if not found */ }
  res.json(loadUIConfig()); // recreates defaults
});

export default router;
