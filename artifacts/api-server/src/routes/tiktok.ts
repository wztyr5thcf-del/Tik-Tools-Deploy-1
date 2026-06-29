import { Router, type IRouter } from "express";
import {
  GetLiveStatusQueryParams,
  MintJwtBody,
  GetRoomInfoBody,
  BulkLiveCheckBody,
  GetUserProfileQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

const TIKTOOLS_API = "https://api.tik.tools";

function getApiKey(): string {
  const key = process.env.TIKTOOLS_API_KEY;
  if (!key) throw new Error("TIKTOOLS_API_KEY not set");
  return key;
}

// Gift catalog is cached in memory to avoid repeated API calls
let giftCatalogCache: { data: unknown; ts: number } | null = null;
const GIFT_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// ── Top Channels ─────────────────────────────────────────────────────────────
router.get("/tiktok/top-channels", async (req, res): Promise<void> => {
  try {
    const r = await fetch(`${TIKTOOLS_API}/api/live/top-channels`);
    const json = await r.json() as {
      channels?: Array<{
        uniqueId?: string;
        displayName?: string;
        profilePictureUrl?: string | null;
        roomId?: string;
        viewerCount?: number;
        title?: string | null;
        region?: string | null;
      }>;
    };
    const channels = (json.channels ?? []).map((c) => ({
      uniqueId: c.uniqueId ?? "",
      nickname: c.displayName ?? null,
      profilePictureUrl: c.profilePictureUrl ?? null,
      roomId: c.roomId ?? null,
      viewerCount: c.viewerCount ?? null,
      title: c.title ?? null,
      region: c.region ?? null,
    }));
    res.json(channels);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch top channels");
    res.status(500).json({ error: "Failed to fetch top channels" });
  }
});

// ── Live Status ───────────────────────────────────────────────────────────────
router.get("/tiktok/live-status", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetLiveStatusQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
    );
    const json = await r.json() as {
      status_code?: number;
      data?: { unique_id?: string; is_live?: boolean; room_id?: string; cached?: boolean };
    };
    const data = json.data ?? {};
    res.json({
      uniqueId: data.unique_id ?? parsed.data.uniqueId,
      isLive: data.is_live ?? false,
      roomId: data.room_id ?? null,
      cached: data.cached ?? false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to check live status");
    res.status(500).json({ error: "Failed to check live status" });
  }
});

// ── JWT Mint ──────────────────────────────────────────────────────────────────
router.post("/tiktok/jwt", requireAuth, async (req, res): Promise<void> => {
  const parsed = MintJwtBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const expireAfter = parsed.data.expireAfter ?? 600;
    const r = await fetch(`${TIKTOOLS_API}/authentication/jwt?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_creators: [parsed.data.uniqueId],
        expire_after: expireAfter,
        max_websockets: 1,
      }),
    });
    const json = await r.json() as { data?: { token?: string } };
    const token = json.data?.token;
    if (!token) {
      req.log.warn({ json }, "JWT mint returned no token");
      res.status(502).json({ error: "Failed to mint JWT token" });
      return;
    }
    res.json({ token, uniqueId: parsed.data.uniqueId });
  } catch (err) {
    req.log.error({ err }, "Failed to mint JWT");
    res.status(500).json({ error: "Failed to mint JWT" });
  }
});

// ── Room Info ─────────────────────────────────────────────────────────────────
router.post("/tiktok/room-info", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetRoomInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();

    // Resolve room_id via live_status if not provided directly
    let roomId = parsed.data.roomId ?? null;
    if (!roomId && parsed.data.uniqueId) {
      const statusR = await fetch(
        `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
      );
      const statusJson = await statusR.json() as { data?: { room_id?: string } };
      roomId = statusJson.data?.room_id ?? null;
    }

    if (!roomId) {
      res.json({ roomId: null, alive: false, title: null, viewerCount: null, likeCount: null, owner: null });
      return;
    }

    const r = await fetch(`${TIKTOOLS_API}/webcast/room_info?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId }),
    });
    const json = await r.json() as {
      status_code?: number;
      data?: {
        room_id?: string;
        alive?: boolean;
        title?: string;
        user_count?: number;
        like_count?: number;
        owner?: {
          unique_id?: string;
          display_id?: string;
          nickname?: string;
          avatar_thumb?: { url_list?: string[] };
        };
      };
    };

    const data = json.data ?? {};
    res.json({
      roomId: data.room_id ?? roomId,
      alive: data.alive ?? false,
      title: data.title ?? null,
      viewerCount: data.user_count ?? null,
      likeCount: data.like_count ?? null,
      owner: data.owner
        ? {
            uniqueId: data.owner.unique_id ?? data.owner.display_id ?? null,
            nickname: data.owner.nickname ?? null,
            profilePictureUrl: data.owner.avatar_thumb?.url_list?.[0] ?? null,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch room info");
    res.status(500).json({ error: "Failed to fetch room info" });
  }
});

// ── Bulk Live Check ───────────────────────────────────────────────────────────
router.post("/tiktok/bulk-check", requireAuth, async (req, res): Promise<void> => {
  const parsed = BulkLiveCheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const { uniqueIds } = parsed.data;

    // Try bulk endpoint first (Basic+ only)
    const bulkR = await fetch(`${TIKTOOLS_API}/webcast/bulk_live_check?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unique_ids: uniqueIds }),
    });
    const bulkJson = await bulkR.json() as {
      status_code?: number;
      data?: Array<{
        unique_id?: string;
        is_live?: boolean;
        room_id?: string;
        title?: string;
        user_count?: number;
      }>;
    };

    if (bulkJson.status_code === 0 && Array.isArray(bulkJson.data)) {
      const results = bulkJson.data.map((c) => ({
        uniqueId: c.unique_id ?? "",
        isLive: c.is_live ?? false,
        roomId: c.room_id ?? null,
        title: c.title ?? null,
        viewerCount: c.user_count ?? null,
      }));
      res.json(results);
      return;
    }

    // Sandbox fallback: parallel individual live_status calls
    req.log.info("bulk_live_check unavailable, falling back to parallel live_status calls");
    const results = await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const r = await fetch(
            `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(uid)}`
          );
          const json = await r.json() as { data?: { is_live?: boolean; room_id?: string } };
          return {
            uniqueId: uid,
            isLive: json.data?.is_live ?? false,
            roomId: json.data?.room_id ?? null,
            title: null,
            viewerCount: null,
          };
        } catch {
          return { uniqueId: uid, isLive: false, roomId: null, title: null, viewerCount: null };
        }
      })
    );
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to bulk check");
    res.status(500).json({ error: "Failed to bulk check" });
  }
});

// ── Rate Limits ───────────────────────────────────────────────────────────────
router.get("/tiktok/rate-limits", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/rate_limits?apiKey=${apiKey}`);
    const json = await r.json() as {
      data?: {
        tier?: string;
        api?: { limit?: number; remaining?: number; reset_at?: number };
        websocket?: { limit?: number; current?: number };
        bulk_check_limit?: number;
      };
    };
    const data = json.data ?? {};
    res.json({
      tier: data.tier ?? "unknown",
      apiLimit: data.api?.limit ?? 0,
      apiRemaining: data.api?.remaining ?? 0,
      apiResetAt: data.api?.reset_at ?? null,
      wsLimit: data.websocket?.limit ?? 0,
      wsCurrent: data.websocket?.current ?? 0,
      bulkCheckLimit: data.bulk_check_limit ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rate limits");
    res.status(500).json({ error: "Failed to fetch rate limits" });
  }
});

// ── Gift Catalog ──────────────────────────────────────────────────────────────
router.get("/tiktok/gift-catalog", async (req, res): Promise<void> => {
  try {
    const now = Date.now();
    if (giftCatalogCache && now - giftCatalogCache.ts < GIFT_CACHE_TTL) {
      res.json(giftCatalogCache.data);
      return;
    }

    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/gift_info?apiKey=${apiKey}`);
    const json = await r.json() as {
      status_code?: number;
      data?: {
        gifts?: Array<{
          id?: string;
          name?: string;
          icon_url?: string;
          diamond_count?: number;
          value_usd?: number;
        }>;
      };
    };

    const gifts = (json.data?.gifts ?? []).map((g) => ({
      id: g.id ?? "",
      name: g.name ?? "Unknown Gift",
      iconUrl: g.icon_url ?? "",
      diamondCount: g.diamond_count ?? 0,
      valueUsd: g.value_usd ?? 0,
    }));

    giftCatalogCache = { data: gifts, ts: now };
    res.json(gifts);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gift catalog");
    res.status(500).json({ error: "Failed to fetch gift catalog" });
  }
});

// ── User Profile ──────────────────────────────────────────────────────────────
router.get("/tiktok/user-profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetUserProfileQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/user_profile?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
    );
    const json = await r.json() as {
      status_code?: number;
      required_tier?: string;
      data?: {
        unique_id?: string;
        nickname?: string;
        avatar_thumb?: { url_list?: string[] };
        follower_count?: number;
        following_count?: number;
        video_count?: number;
        total_favorited?: number;
        signature?: string;
      };
    };

    // Tier error — return gracefully with available: false
    if (json.status_code !== 0) {
      res.json({
        uniqueId: parsed.data.uniqueId,
        nickname: null,
        profilePictureUrl: null,
        followerCount: null,
        followingCount: null,
        videoCount: null,
        likeCount: null,
        bio: null,
        available: false,
        requiredTier: json.required_tier ?? "pro",
      });
      return;
    }

    const d = json.data ?? {};
    res.json({
      uniqueId: d.unique_id ?? parsed.data.uniqueId,
      nickname: d.nickname ?? null,
      profilePictureUrl: d.avatar_thumb?.url_list?.[0] ?? null,
      followerCount: d.follower_count ?? null,
      followingCount: d.following_count ?? null,
      videoCount: d.video_count ?? null,
      likeCount: d.total_favorited ?? null,
      bio: d.signature ?? null,
      available: true,
      requiredTier: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch user profile");
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

export default router;
