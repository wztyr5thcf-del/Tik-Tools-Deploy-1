import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import { loadRoles, saveRoles, makeRoleId, ALL_PERMISSIONS, type Role } from "../lib/roles-store";
import { loadUsers, saveUsers } from "../lib/users-store";

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

// GET /admin/roles — list all roles
router.get("/admin/roles", requireAdmin, (_req, res): void => {
  const store = loadRoles();
  res.json({ roles: store.roles, permissions: ALL_PERMISSIONS });
});

// POST /admin/roles — create role
router.post("/admin/roles", requireAdmin, (req, res): void => {
  const { name, description, color, permissions } = req.body as Partial<Role>;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  const store = loadRoles();
  const now = new Date().toISOString();
  const role: Role = {
    id: makeRoleId(),
    name: name.trim(),
    description: description?.trim() ?? "",
    color: color ?? "#6366f1",
    permissions: Array.isArray(permissions) ? permissions : [],
    createdAt: now,
    updatedAt: now,
  };
  store.roles.push(role);
  saveRoles(store);
  res.status(201).json({ role });
});

// PATCH /admin/roles/:id — update role
router.patch("/admin/roles/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const { name, description, color, permissions } = req.body as Partial<Role>;

  const store = loadRoles();
  const idx = store.roles.findIndex((r) => r.id === id);
  if (idx === -1) { res.status(404).json({ error: "Role not found" }); return; }

  if (name?.trim()) store.roles[idx].name = name.trim();
  if (description !== undefined) store.roles[idx].description = description.trim();
  if (color) store.roles[idx].color = color;
  if (Array.isArray(permissions)) store.roles[idx].permissions = permissions;
  store.roles[idx].updatedAt = new Date().toISOString();

  saveRoles(store);
  res.json({ role: store.roles[idx] });
});

// DELETE /admin/roles/:id — delete role
router.delete("/admin/roles/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const store = loadRoles();
  const idx = store.roles.findIndex((r) => r.id === id);
  if (idx === -1) { res.status(404).json({ error: "Role not found" }); return; }

  store.roles.splice(idx, 1);
  saveRoles(store);

  // Remove role from any users who had this role
  const users = loadUsers();
  let changed = false;
  for (const u of users.users) {
    if (u.roleId === id) { u.roleId = undefined; changed = true; }
  }
  if (changed) saveUsers(users);

  res.json({ ok: true });
});

// PATCH /admin/users/:id/role — assign role to user
router.patch("/admin/users/:id/role", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const { roleId } = req.body as { roleId?: string | null };

  const { loadUsers: lu, saveUsers: su } = require("../lib/users-store") as typeof import("../lib/users-store");
  const store = lu();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  if (roleId === null || roleId === undefined || roleId === "") {
    store.users[idx].roleId = undefined;
  } else {
    const roles = loadRoles();
    if (!roles.roles.find((r) => r.id === roleId)) {
      res.status(404).json({ error: "Role not found" }); return;
    }
    store.users[idx].roleId = roleId;
  }

  su(store);
  res.json({ ok: true, roleId: store.users[idx].roleId ?? null });
});

export default router;
