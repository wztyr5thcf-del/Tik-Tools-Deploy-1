import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loadUsers, saveUsers, makeId, publicUser, type StoredUser } from "../lib/users-store";

export type { StoredUser };

const router: IRouter = Router();

const DEFAULT_JWT_SECRET = "creatools-secret-change-in-production";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable must be set in production");
}
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;
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

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name, tiktokUsername, tiktokProfilePicture, tiktokDisplayName, tiktokFollowerCount } =
    req.body as {
      email?: string;
      password?: string;
      name?: string;
      tiktokUsername?: string;
      tiktokProfilePicture?: string;
      tiktokDisplayName?: string;
      tiktokFollowerCount?: number;
    };

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password e name são obrigatórios" }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" }); return;
  }

  const store = loadUsers();
  if (store.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(409).json({ error: "E-mail já cadastrado" }); return;
  }

  // Check TikTok username uniqueness if provided
  const handle = tiktokUsername?.trim().replace(/^@/, "") || undefined;
  if (handle && store.users.find((u) => u.tiktokUsername?.toLowerCase() === handle.toLowerCase())) {
    res.status(409).json({ error: "Este usuário do TikTok já está vinculado a outra conta" }); return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const isFirst = store.users.length === 0;
  const now = new Date().toISOString();

  const user: StoredUser = {
    id: makeId(),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    createdAt: now,
    lastLoginAt: now,
    plan: "free",
    isAdmin: isFirst,
    ...(handle
      ? {
          tiktokUsername: handle,
          tiktokVerified: true,
          tiktokProfilePicture,
          tiktokDisplayName,
          tiktokFollowerCount,
          tiktokLinkedAt: now,
        }
      : {}),
  };

  store.users.push(user);
  saveUsers(store);

  const token = signToken(user.id);
  req.log.info({ userId: user.id, isAdmin: user.isAdmin }, "User registered");
  res.status(201).json({ token, user: publicUser(user) });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios" }); return;
  }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) { res.status(401).json({ error: "E-mail ou senha inválidos" }); return; }

  const valid = await bcrypt.compare(password, store.users[idx].passwordHash);
  if (!valid) { res.status(401).json({ error: "E-mail ou senha inválidos" }); return; }

  // Track last login
  store.users[idx].lastLoginAt = new Date().toISOString();
  saveUsers(store);

  const token = signToken(store.users[idx].id);
  req.log.info({ userId: store.users[idx].id }, "User logged in");
  res.json({ token, user: publicUser(store.users[idx]) });
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
  const { name, email, tiktokUsername } = req.body as {
    name?: string; email?: string; tiktokUsername?: string;
  };

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  if (email) {
    const conflict = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId);
    if (conflict) { res.status(409).json({ error: "E-mail já em uso" }); return; }
    store.users[idx].email = email.toLowerCase().trim();
  }
  if (name) store.users[idx].name = name.trim();

  if (tiktokUsername !== undefined) {
    const newHandle = tiktokUsername.trim().replace(/^@/, "") || undefined;
    const currentHandle = store.users[idx].tiktokUsername;

    if (newHandle !== currentHandle) {
      // Check uniqueness
      if (newHandle && store.users.find((u) => u.tiktokUsername?.toLowerCase() === newHandle.toLowerCase() && u.id !== userId)) {
        res.status(409).json({ error: "Este usuário do TikTok já está vinculado a outra conta" }); return;
      }

      try {
        const { getPlanById } = await import("../lib/plans-store");
        const plan = getPlanById(store.users[idx].plan);
        if (plan) {
          const limit = plan.tiktokUsernameChangesPerWeek;
          if (limit === 0) {
            res.status(403).json({ error: "Seu plano não permite alterar o username do TikTok." }); return;
          }
          if (limit > 0) {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const log = store.users[idx].tiktokUsernameChangeLog ?? [];
            const changesThisWeek = log.filter((ts) => new Date(ts).getTime() > weekAgo).length;
            if (changesThisWeek >= limit) {
              res.status(429).json({
                error: `Limite de ${limit} alteração(ões) por semana atingido.`,
                changesThisWeek,
                limit,
                requiresRequest: true,
              }); return;
            }
          }
        }
      } catch { /* if plans store fails, allow */ }

      const log = store.users[idx].tiktokUsernameChangeLog ?? [];
      log.push(new Date().toISOString());
      store.users[idx].tiktokUsernameChangeLog = log;
    }

    store.users[idx].tiktokUsername = newHandle;
  }

  saveUsers(store);
  req.log.info({ userId }, "Profile updated");
  res.json({ user: publicUser(store.users[idx]) });
});

// ── Change password ───────────────────────────────────────────────────────────
router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string; newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword e newPassword são obrigatórios" }); return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" }); return;
  }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, store.users[idx].passwordHash);
  if (!valid) { res.status(401).json({ error: "Senha atual incorreta" }); return; }

  store.users[idx].passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  saveUsers(store);
  req.log.info({ userId }, "Password changed");
  res.json({ ok: true });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => {
  res.json({ ok: true });
});

// ── TikTok OAuth: get authorization URL ───────────────────────────────────────
router.get("/auth/tiktok/url", (req, res): void => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    res.status(503).json({ error: "TikTok OAuth não configurado. Configure TIKTOK_CLIENT_KEY no painel admin." }); return;
  }

  const redirectUri = process.env.TIKTOK_REDIRECT_URI ?? `${req.protocol}://${req.get("host")}/api/auth/tiktok/callback`;
  const state = Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,user.info.profile",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  const url = `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
  res.json({ url, state });
});

// ── TikTok OAuth: callback ─────────────────────────────────────────────────────
router.get("/auth/tiktok/callback", async (req, res): Promise<void> => {
  const { code, error: oauthError } = req.query as { code?: string; error?: string };
  const frontendBase = process.env.FRONTEND_URL ?? "";

  if (oauthError || !code) {
    res.redirect(`${frontendBase}/login?error=tiktok_denied`); return;
  }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI ?? `${req.protocol}://${req.get("host")}/api/auth/tiktok/callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json() as {
      access_token?: string;
      open_id?: string;
      refresh_token?: string;
      error_description?: string;
    };

    if (!tokenData.access_token || !tokenData.open_id) {
      req.log.error({ tokenData }, "TikTok OAuth token exchange failed");
      res.redirect(`${frontendBase}/login?error=tiktok_token`); return;
    }

    // Fetch user info
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const userData = await userRes.json() as {
      data?: {
        user?: {
          open_id?: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          follower_count?: number;
        };
      };
    };

    const tiktokUser = userData.data?.user;
    const openId = tokenData.open_id;
    const tiktokUsername = tiktokUser?.username ?? "";
    const displayName = tiktokUser?.display_name ?? "";
    const avatarUrl = tiktokUser?.avatar_url ?? "";
    const followerCount = tiktokUser?.follower_count ?? 0;

    const store = loadUsers();
    const now = new Date().toISOString();

    // Find existing user by OAuth ID or tiktokUsername
    let existing = store.users.find((u) => u.tiktokOAuthId === openId);
    if (!existing && tiktokUsername) {
      existing = store.users.find((u) => u.tiktokUsername?.toLowerCase() === tiktokUsername.toLowerCase());
    }

    let userId: string;
    if (existing) {
      // Update profile and tokens
      const idx = store.users.findIndex((u) => u.id === existing!.id);
      store.users[idx].tiktokOAuthId = openId;
      store.users[idx].tiktokOAuthAccessToken = tokenData.access_token;
      store.users[idx].tiktokOAuthRefreshToken = tokenData.refresh_token;
      store.users[idx].tiktokProfilePicture = avatarUrl || store.users[idx].tiktokProfilePicture;
      store.users[idx].tiktokDisplayName = displayName || store.users[idx].tiktokDisplayName;
      store.users[idx].tiktokFollowerCount = followerCount;
      store.users[idx].lastLoginAt = now;
      if (!store.users[idx].tiktokUsername && tiktokUsername) {
        store.users[idx].tiktokUsername = tiktokUsername;
        store.users[idx].tiktokVerified = true;
        store.users[idx].tiktokLinkedAt = now;
      }
      saveUsers(store);
      userId = existing.id;
    } else {
      // Create new account
      const isFirst = store.users.length === 0;
      const newUser: StoredUser = {
        id: makeId(),
        email: `tiktok-${openId}@oauth.creatools`, // placeholder — user can set real email later
        name: displayName || tiktokUsername || "TikTok User",
        passwordHash: "",
        createdAt: now,
        lastLoginAt: now,
        plan: "free",
        isAdmin: isFirst,
        tiktokOAuthId: openId,
        tiktokOAuthAccessToken: tokenData.access_token,
        tiktokOAuthRefreshToken: tokenData.refresh_token,
        tiktokUsername: tiktokUsername || undefined,
        tiktokDisplayName: displayName,
        tiktokProfilePicture: avatarUrl,
        tiktokFollowerCount: followerCount,
        tiktokVerified: true,
        tiktokLinkedAt: now,
      };
      store.users.push(newUser);
      saveUsers(store);
      userId = newUser.id;
    }

    const appToken = signToken(userId);
    res.redirect(`${frontendBase}/login?tiktok_token=${appToken}`);
  } catch (err) {
    req.log.error({ err }, "TikTok OAuth callback error");
    res.redirect(`${frontendBase}/login?error=tiktok_error`);
  }
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
    if (conflict) { res.status(409).json({ error: "E-mail já em uso" }); return; }
    store.users[idx].email = email.toLowerCase().trim();
  }

  saveUsers(store);
  res.json({ user: publicUser(store.users[idx]) });
});

// ── Admin: delete user ────────────────────────────────────────────────────────
router.delete("/auth/users/:id", requireAdmin, (req, res): void => {
  const { id } = req.params as { id: string };
  const adminId = (req as Request & { userId: string }).userId;

  if (id === adminId) {
    res.status(400).json({ error: "Não é possível deletar sua própria conta" }); return;
  }

  const store = loadUsers();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "User not found" }); return; }

  store.users.splice(idx, 1);
  saveUsers(store);
  res.json({ ok: true });
});

export default router;
