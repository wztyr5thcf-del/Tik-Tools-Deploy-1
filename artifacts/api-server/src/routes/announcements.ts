import { Router, type Request, type Response } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "./auth";
import { loadUsers } from "../lib/users-store";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, "../../data/announcements.json");

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "new" | "update";
  pinned: boolean;
  createdAt: number;
  emoji?: string;
}

interface AnnouncementsStore {
  announcements: Announcement[];
}

function loadStore(): AnnouncementsStore {
  if (!existsSync(DATA_FILE)) return { announcements: [] };
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as AnnouncementsStore;
  } catch {
    return { announcements: [] };
  }
}

function saveStore(store: AnnouncementsStore): void {
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function requireAdmin(req: Request, res: Response, next: () => void): void {
  requireAuth(req, res, () => {
    const userId = (req as Request & { userId: string }).userId;
    const store = loadUsers();
    const user = store.users.find((u) => u.id === userId);
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// GET /api/announcements - all authenticated users
router.get("/announcements", requireAuth, (_req: Request, res: Response): void => {
  const store = loadStore();
  const sorted = [...store.announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });
  res.json({ announcements: sorted });
});

// POST /api/announcements - admin only
router.post("/announcements", (req: Request, res: Response): void => {
  requireAdmin(req, res, () => {
    const { title, body, type = "info", pinned = false, emoji } = req.body as {
      title?: string;
      body?: string;
      type?: Announcement["type"];
      pinned?: boolean;
      emoji?: string;
    };

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "title e body são obrigatórios" });
      return;
    }

    const store = loadStore();
    const ann: Announcement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      body: body.trim(),
      type,
      pinned: !!pinned,
      createdAt: Date.now(),
      emoji: emoji?.trim() || undefined,
    };
    store.announcements.unshift(ann);
    saveStore(store);
    res.status(201).json(ann);
  });
});

// PATCH /api/announcements/:id - admin only (toggle pin, edit)
router.patch("/announcements/:id", (req: Request, res: Response): void => {
  requireAdmin(req, res, () => {
    const store = loadStore();
    const idx = store.announcements.findIndex((a) => a.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }

    const { title, body, type, pinned, emoji } = req.body as Partial<Announcement>;
    const ann = store.announcements[idx];
    if (title !== undefined) ann.title = title.trim();
    if (body !== undefined) ann.body = body.trim();
    if (type !== undefined) ann.type = type;
    if (pinned !== undefined) ann.pinned = !!pinned;
    if (emoji !== undefined) ann.emoji = emoji?.trim() || undefined;
    saveStore(store);
    res.json(ann);
  });
});

// DELETE /api/announcements/:id - admin only
router.delete("/announcements/:id", (req: Request, res: Response): void => {
  requireAdmin(req, res, () => {
    const store = loadStore();
    const before = store.announcements.length;
    store.announcements = store.announcements.filter((a) => a.id !== req.params.id);
    if (store.announcements.length === before) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    saveStore(store);
    res.json({ ok: true });
  });
});

export default router;
