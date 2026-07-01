import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sizeOf from "image-size";
import { requireAuth } from "./auth";
import { getUserById } from "../lib/users-store";

const router = Router();

const MEDIA_ROOT = path.join(process.cwd(), "data", "media");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PLAN_LIMITS: Record<string, number> = {
  free: 50 * 1024 * 1024,
  basic: 200 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
};
const CATEGORIES = ["Geral", "Banners", "Logos", "QR Codes", "Thumbnails"];

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  category: string;
  size: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

function userDir(userId: string): string {
  return path.join(MEDIA_ROOT, userId);
}

function indexPath(userId: string): string {
  return path.join(userDir(userId), "index.json");
}

function readIndex(userId: string): MediaItem[] {
  const p = indexPath(userId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as MediaItem[]; } catch { return []; }
}

function writeIndex(userId: string, items: MediaItem[]): void {
  fs.mkdirSync(userDir(userId), { recursive: true });
  fs.writeFileSync(indexPath(userId), JSON.stringify(items, null, 2));
}

function totalUsed(items: MediaItem[]): number {
  return items.reduce((sum, it) => sum + it.size, 0);
}

function extractDimensions(filePath: string): { width: number | null; height: number | null } {
  try {
    const buf = fs.readFileSync(filePath);
    const dims = sizeOf(buf);
    return { width: dims.width ?? null, height: dims.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

const diskStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as Request & { userId: string }).userId;
    const dir = userDir(userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error("Tipo de arquivo não suportado. Use PNG, JPG, GIF ou WebP.");
      cb(err);
    }
  },
});

// GET /media — list user media
router.get("/media", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;
  const items = readIndex(userId);
  res.json({ items });
});

// GET /media/storage — storage usage (plan fetched server-side)
router.get("/media/storage", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const items = readIndex(userId);
  const used = totalUsed(items);

  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  res.json({ used, limit, plan, count: items.length, categories: CATEGORIES });
});

// POST /media/upload — upload a file (plan enforced server-side)
router.post("/media/upload", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  // 1. Fetch user plan server-side — do NOT trust client-supplied plan
  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // 2. Run multer (wrap callback in promise)
  const multerErr = await new Promise<Error | null>((resolve) => {
    upload.single("file")(req, res, (err) => resolve(err as Error | null));
  });

  if (multerErr) {
    res.status(400).json({ error: multerErr.message });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado." });
    return;
  }

  // 3. Check quota against server-side plan
  const items = readIndex(userId);
  const used = totalUsed(items);

  if (used + req.file.size > limit) {
    fs.unlinkSync(req.file.path);
    res.status(413).json({ error: "Limite de armazenamento atingido. Faça upgrade do plano." });
    return;
  }

  // 4. Extract image dimensions
  const { width, height } = extractDimensions(req.file.path);

  // 5. Build metadata entry
  const category = CATEGORIES.includes(req.body.category) ? (req.body.category as string) : "Geral";
  const item: MediaItem = {
    id: crypto.randomUUID(),
    filename: req.file.filename,
    originalName: req.body.name?.trim() || req.file.originalname,
    category,
    size: req.file.size,
    mimeType: req.file.mimetype,
    width,
    height,
    createdAt: new Date().toISOString(),
  };

  items.unshift(item);
  writeIndex(userId, items);

  res.json({ item, url: `/api/media/files/${userId}/${item.filename}` });
});

// PATCH /media/:id — rename / change category
router.patch("/media/:id", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;
  const { id } = req.params;
  const { name, category } = req.body as { name?: string; category?: string };

  const items = readIndex(userId);
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) { res.status(404).json({ error: "Item não encontrado." }); return; }

  if (name?.trim()) items[idx].originalName = name.trim();
  if (category && CATEGORIES.includes(category)) items[idx].category = category;

  writeIndex(userId, items);
  res.json({ item: items[idx] });
});

// DELETE /media/:id — delete file and metadata
router.delete("/media/:id", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;
  const { id } = req.params;

  const items = readIndex(userId);
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) { res.status(404).json({ error: "Item não encontrado." }); return; }

  const [removed] = items.splice(idx, 1);
  const filePath = path.join(userDir(userId), removed.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  writeIndex(userId, items);
  res.json({ ok: true });
});

export default router;
