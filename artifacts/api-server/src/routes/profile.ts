import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "./auth";
import { getUserByTiktokUsername, updateUser, getUserById } from "../lib/users-store";

const router = Router();

const TIKTOOLS_API = "https://api.tik.tools";
const configFile = path.join(process.cwd(), "data", "config.json");

function getApiKey(): string | undefined {
  const key = process.env.TIKTOOLS_API_KEY;
  if (key) return key;
  try {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
    return cfg.apiKey || undefined;
  } catch {
    return undefined;
  }
}

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  discord?: string;
  custom?: Array<{ label: string; url: string }>;
}

function parseSocialLinks(raw: string | null | undefined): SocialLinks {
  if (!raw) return {};
  try { return JSON.parse(raw) as SocialLinks; } catch { return {}; }
}

function serializeSocialLinks(links: SocialLinks): string {
  return JSON.stringify(links);
}

function publicProfileData(user: Awaited<ReturnType<typeof getUserById>>) {
  if (!user) return null;
  return {
    publicProfileEnabled: user.publicProfileEnabled ?? false,
    profileBio: user.profileBio ?? null,
    profileBanner: user.profileBanner ?? null,
    socialLinks: parseSocialLinks(user.socialLinks),
  };
}

// GET /profile — current user's public profile settings (auth required)
router.get("/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(publicProfileData(user));
});

// PATCH /profile — update public profile settings (auth required)
router.patch("/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { publicProfileEnabled, profileBio, profileBanner, socialLinks } = req.body as {
    publicProfileEnabled?: boolean;
    profileBio?: string;
    profileBanner?: string;
    socialLinks?: SocialLinks;
  };

  const updates: Record<string, unknown> = {};
  if (typeof publicProfileEnabled === "boolean") updates.publicProfileEnabled = publicProfileEnabled;
  if (typeof profileBio === "string") updates.profileBio = profileBio.trim().slice(0, 300) || null;
  if (typeof profileBanner === "string") updates.profileBanner = profileBanner.trim() || null;
  if (socialLinks !== undefined) updates.socialLinks = serializeSocialLinks(socialLinks);

  const updated = await updateUser(userId, updates);
  if (!updated) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json(publicProfileData(updated));
});

// GET /profile/public/:username — public, no auth required
router.get("/profile/public/:username", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);

  let user: Awaited<ReturnType<typeof getUserByTiktokUsername>>;
  try { user = await getUserByTiktokUsername(username); } catch { user = null; }

  if (!user || !user.publicProfileEnabled) {
    res.status(404).json({ error: "Perfil não encontrado ou não está público." });
    return;
  }

  // Fetch live status — best-effort, never fails the request
  let isLive = false;
  let viewerCount: number | null = null;
  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const r = await fetch(
        `${TIKTOOLS_API}/webcast/live_status?apiKey=${encodeURIComponent(apiKey)}&unique_id=${encodeURIComponent(username)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (r.ok) {
        const d = await r.json() as {
          data?: { is_live?: boolean; live_room?: { viewer_count?: number } };
        };
        isLive = d.data?.is_live ?? false;
        viewerCount = isLive ? (d.data?.live_room?.viewer_count ?? null) : null;
      }
    } catch { /* ignore — live status is informational */ }
  }

  res.json({
    username: user.tiktokUsername,
    displayName: user.tiktokDisplayName ?? user.tiktokUsername ?? username,
    avatar: user.tiktokProfilePicture ?? null,
    followerCount: user.tiktokFollowerCount ?? null,
    verified: user.tiktokVerified ?? false,
    bio: user.profileBio ?? null,
    banner: user.profileBanner ?? null,
    socialLinks: parseSocialLinks(user.socialLinks),
    isLive,
    viewerCount,
  });
});

export default router;
