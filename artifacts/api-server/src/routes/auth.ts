import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loadUsers, saveUsers, makeId, publicUser, type StoredUser } from "../lib/users-store";

export type { StoredUser };

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "creatools-secret-change-in-production";
const SALT_ROUNDS = 10;

// ── Auth middleware ────────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as Request & { userId: string }).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const userId = (req as Request & { userId: string }).userId;
    const store = loadUsers();
    const user = store.users.find((u) => u.id === userId);
    if (!user?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    next();
  });
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email || !password || !name) { res.status(400).json({ error: "email, password, and name are required" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const store = loadUsers();
  if (store.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(409).json({ error: "Email already registered" }); return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const isFirst = store.users.length === 0;
  const user: StoredUser = {
    id: makeId(),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
    plan: "free",
    isAdmin: isFirst,
  };

  store.users.push(user);
  saveUsers(store);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  req.log.info({ userId: user.id, isAdmin: user.isAdmin }, "User registered");
  res.status(201).json({ token, user: publicUser(user) });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(400).json({ error: "email and password are required" }); return; }

  const store = loadUsers();
  const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ token, user: publicUser(user) });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, (req, res): void => {
  const userId = (req as Request & { userId: string }).userId;
  const store = loadUsers();
  const user = store.users.find((u) => u.id === userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: publicUser(user) });
});

// ── Update profile ────────────────────────────────────────────────────────────
router.patch("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { name, email, tiktokUsername } = req.body as { name?: string; email?: string; tiktokUsername?: string };

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  if (email) {
    const conflict = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId);
    if (conflict) { res.status(409).json({ error: "Email already in use" }); return; }
    store.users[idx].email = email.toLowerCase().trim();
  }
  if (name) store.users[idx].name = name.trim();
  if (tiktokUsername !== undefined) {
    store.users[idx].tiktokUsername = tiktokUsername.trim().replace(/^@/, "") || undefined;
  }

  saveUsers(store);
  req.log.info({ userId }, "Profile updated");
  res.json({ user: publicUser(store.users[idx]) });
});

// ── Change password ───────────────────────────────────────────────────────────
router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) { res.status(400).json({ error: "currentPassword and newPassword are required" }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, store.users[idx].passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  store.users[idx].passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  saveUsers(store);
  req.log.info({ userId }, "Password changed");
  res.json({ ok: true });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => {
  res.json({ ok: true });
});

// ── Admin: list users ─────────────────────────────────────────────────────────
router.get("/auth/users", requireAdmin, (_req, res): void => {
  const store = loadUsers();
  res.json({ users: store.users.map(publicUser) });
});

// ── Admin: update user ────────────────────────────────────────────────────────
router.patch("/auth/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const { plan, isAdmin, name, email } = req.body as {
    plan?: "free" | "basic" | "pro";
    isAdmin?: boolean;
    name?: string;
    email?: string;
  };

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  if (plan !== undefined) store.users[idx].plan = plan;
  if (isAdmin !== undefined) store.users[idx].isAdmin = isAdmin;
  if (name) store.users[idx].name = name.trim();
  if (email) {
    const conflict = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (conflict) { res.status(409).json({ error: "Email already in use" }); return; }
    store.users[idx].email = email.toLowerCase().trim();
  }

  saveUsers(store);
  res.json({ user: publicUser(store.users[idx]) });
});

// ── Admin: delete user ────────────────────────────────────────────────────────
router.delete("/auth/users/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const adminId = (req as Request & { userId: string }).userId;

  if (id === adminId) { res.status(400).json({ error: "Cannot delete your own account" }); return; }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  store.users.splice(idx, 1);
  saveUsers(store);
  res.json({ ok: true });
});

export default router;
