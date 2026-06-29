import { Router, type IRouter } from "express";
import {
  GetLiveStatusQueryParams,
  MintJwtBody,
  GetRoomInfoBody,
  BulkLiveCheckBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TIKTOOLS_API = "https://api.tik.tools";

function getApiKey(): string {
  const key = process.env.TIKTOOLS_API_KEY;
  if (!key) throw new Error("TIKTOOLS_API_KEY not set");
  return key;
}

router.get("/tiktok/top-channels", async (req, res): Promise<void> => {
  try {
    const r = await fetch(`${TIKTOOLS_API}/api/live/top-channels`);
    const json = await r.json() as { channels?: Array<{ uniqueId?: string; nickname?: string; profilePictureUrl?: string; roomId?: string; viewerCount?: number; title?: string }> };
    const channels = (json.channels ?? []).map((c) => ({
      uniqueId: c.uniqueId ?? "",
      nickname: c.nickname ?? null,
      profilePictureUrl: c.profilePictureUrl ?? null,
      roomId: c.roomId ?? null,
      viewerCount: c.viewerCount ?? null,
      title: c.title ?? null,
    }));
    res.json(channels);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch top channels");
    res.status(500).json({ error: "Failed to fetch top channels" });
  }
});

router.get("/tiktok/live-status", async (req, res): Promise<void> => {
  const parsed = GetLiveStatusQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&uniqueId=${encodeURIComponent(parsed.data.uniqueId)}`
    );
    const json = await r.json() as { data?: { unique_id?: string; is_live?: boolean; room_id?: string; cached?: boolean } };
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

router.post("/tiktok/jwt", async (req, res): Promise<void> => {
  const parsed = MintJwtBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const expireAfter = parsed.data.expireAfter ?? 600;
    const r = await fetch(
      `${TIKTOOLS_API}/authentication/jwt?apiKey=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_creators: [parsed.data.uniqueId],
          expire_after: expireAfter,
          max_websockets: 1,
        }),
      }
    );
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

router.post("/tiktok/room-info", async (req, res): Promise<void> => {
  const parsed = GetRoomInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const body: Record<string, string> = {};
    if (parsed.data.uniqueId) body.unique_id = parsed.data.uniqueId;
    if (parsed.data.roomId) body.room_id = parsed.data.roomId;

    const r = await fetch(`${TIKTOOLS_API}/webcast/room_info?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await r.json() as {
      data?: {
        room_id?: string;
        alive?: boolean;
        title?: string;
        user_count?: number;
        like_count?: number;
        owner?: { uniqueId?: string; nickname?: string; profilePictureUrl?: string; display_id?: string };
      }
    };
    const data = json.data ?? {};
    res.json({
      roomId: data.room_id ?? null,
      alive: data.alive ?? false,
      title: data.title ?? null,
      viewerCount: data.user_count ?? null,
      likeCount: data.like_count ?? null,
      owner: data.owner
        ? {
            uniqueId: data.owner.uniqueId ?? data.owner.display_id ?? null,
            nickname: data.owner.nickname ?? null,
            profilePictureUrl: data.owner.profilePictureUrl ?? null,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch room info");
    res.status(500).json({ error: "Failed to fetch room info" });
  }
});

router.post("/tiktok/bulk-check", async (req, res): Promise<void> => {
  const parsed = BulkLiveCheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/bulk_live_check?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unique_ids: parsed.data.uniqueIds }),
    });
    const json = await r.json() as {
      data?: Array<{
        unique_id?: string;
        is_live?: boolean;
        room_id?: string;
        title?: string;
        userCount?: number;
      }>
    };
    const results = (json.data ?? []).map((c) => ({
      uniqueId: c.unique_id ?? "",
      isLive: c.is_live ?? false,
      roomId: c.room_id ?? null,
      title: c.title ?? null,
      viewerCount: c.userCount ?? null,
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to bulk check");
    res.status(500).json({ error: "Failed to bulk check" });
  }
});

router.get("/tiktok/rate-limits", async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/rate_limits?apiKey=${apiKey}`);
    const json = await r.json() as {
      data?: {
        tier?: string;
        api?: { limit?: number; remaining?: number; reset_at?: number };
        websocket?: { limit?: number; current?: number };
      }
    };
    const data = json.data ?? {};
    res.json({
      tier: data.tier ?? "unknown",
      apiLimit: data.api?.limit ?? 0,
      apiRemaining: data.api?.remaining ?? 0,
      apiResetAt: data.api?.reset_at ?? null,
      wsLimit: data.websocket?.limit ?? 0,
      wsCurrent: data.websocket?.current ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rate limits");
    res.status(500).json({ error: "Failed to fetch rate limits" });
  }
});

export default router;
