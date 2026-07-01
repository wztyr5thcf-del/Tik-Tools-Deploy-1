import { Router, type Request, type Response as ExpressResponse } from "express";
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

export interface TopGifter {
  username: string;
  displayName: string;
  avatar: string | null;
  diamondCount: number;
}

function parseSocialLinks(raw: string | null | undefined): SocialLinks {
  if (!raw) return {};
  try { return JSON.parse(raw) as SocialLinks; } catch { return {}; }
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

async function fetchWithTimeout(url: string, opts?: RequestInit, ms = 5000): Promise<Response> {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
}

// GET /profile — current user's public profile settings (auth required)
router.get("/profile", requireAuth, async (req: Request, res: ExpressResponse): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(publicProfileData(user));
});

// PATCH /profile — update public profile settings (auth required)
router.patch("/profile", requireAuth, async (req: Request, res: ExpressResponse): Promise<void> => {
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
  if (socialLinks !== undefined) updates.socialLinks = JSON.stringify(socialLinks);

  const updated = await updateUser(userId, updates);
  if (!updated) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json(publicProfileData(updated));
});

// GET /profile/public/:username — public, no auth required
router.get("/profile/public/:username", async (req: Request, res: ExpressResponse): Promise<void> => {
  const username = String(req.params.username);

  let user: Awaited<ReturnType<typeof getUserByTiktokUsername>>;
  try { user = await getUserByTiktokUsername(username); } catch { user = null; }

  if (!user || !user.publicProfileEnabled) {
    res.status(404).json({ error: "Perfil não encontrado ou não está público." });
    return;
  }

  const apiKey = getApiKey();

  // Parallel: live_status + top gifters (best-effort, no apiKey guard on gifters)
  let isLive = false;
  let roomId: string | null = null;
  let viewerCount: number | null = null;
  let likeCount: number | null = null;
  let topGifters: TopGifter[] = [];

  if (apiKey) {
    const [liveRes, giftersRes] = await Promise.allSettled([
      fetchWithTimeout(
        `${TIKTOOLS_API}/webcast/live_status?apiKey=${encodeURIComponent(apiKey)}&unique_id=${encodeURIComponent(username)}`
      ),
      fetchWithTimeout(
        `${TIKTOOLS_API}/api/gifters/top?apiKey=${encodeURIComponent(apiKey)}&creator=${encodeURIComponent(username)}&limit=5`
      ),
    ]);

    // Parse live status
    if (liveRes.status === "fulfilled" && liveRes.value.ok) {
      try {
        const d = await liveRes.value.json() as {
          data?: { is_live?: boolean; room_id?: string };
        };
        isLive = d.data?.is_live ?? false;
        roomId = d.data?.room_id ?? null;
      } catch { /* ignore */ }
    }

    // If live, fetch room_info for viewer + like count
    if (isLive && roomId) {
      try {
        const roomRes = await fetchWithTimeout(`${TIKTOOLS_API}/webcast/room_info?apiKey=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId }),
        });
        if (roomRes.ok) {
          const d = await roomRes.json() as {
            data?: { user_count?: number; like_count?: number };
          };
          viewerCount = d.data?.user_count ?? null;
          likeCount = d.data?.like_count ?? null;
        }
      } catch { /* ignore — live stats are informational */ }
    }

    // Parse top gifters
    if (giftersRes.status === "fulfilled" && giftersRes.value.ok) {
      try {
        const d = await giftersRes.value.json() as {
          data?: Array<{
            username?: string;
            nickname?: string;
            avatar_thumb?: { url_list?: string[] };
            diamond_count?: number;
          }>;
        };
        topGifters = (d.data ?? []).slice(0, 5).map((g) => ({
          username: g.username ?? "",
          displayName: g.nickname ?? g.username ?? "",
          avatar: g.avatar_thumb?.url_list?.[0] ?? null,
          diamondCount: g.diamond_count ?? 0,
        }));
      } catch { /* ignore */ }
    }
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
    likeCount,
    topGifters,
  });
});

export default router;
