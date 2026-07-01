import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./auth";

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

const storage = multer.diskStorage({
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
  storage,
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

// GET /media/storage — storage usage
router.get("/media/storage", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;
  const items = readIndex(userId);
  const used = totalUsed(items);
  const plan = (req.query.plan as string) ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  res.json({ used, limit, count: items.length, categories: CATEGORIES });
});

// POST /media/upload — upload a file
router.post("/media/upload", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;

  const doUpload = upload.single("file");
  doUpload(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado." });
      return;
    }

    const items = readIndex(userId);
    const plan = (req.body.plan as string) ?? "free";
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    const used = totalUsed(items);

    if (used + req.file.size > limit) {
      fs.unlinkSync(req.file.path);
      res.status(413).json({ error: "Limite de armazenamento atingido. Faça upgrade do plano." });
      return;
    }

    const category = CATEGORIES.includes(req.body.category) ? (req.body.category as string) : "Geral";

    const item: MediaItem = {
      id: crypto.randomUUID(),
      filename: req.file.filename,
      originalName: req.body.name?.trim() || req.file.originalname,
      category,
      size: req.file.size,
      mimeType: req.file.mimetype,
      createdAt: new Date().toISOString(),
    };

    items.unshift(item);
    writeIndex(userId, items);

    res.json({ item, url: `/api/media/files/${userId}/${item.filename}` });
  });
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
