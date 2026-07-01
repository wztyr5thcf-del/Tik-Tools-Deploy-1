import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sizeOf from "image-size";
import { requireAuth } from "./auth";
import { getUserById } from "../lib/users-store";

const router = Router();

const MEDIA_ROOT = path.join(process.cwd(), "data", "media");

// Allowed MIME types → safe file extension
const SAFE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

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

/**
 * Detect actual image MIME type from file magic bytes — independent of client-supplied headers.
 * Returns undefined when the file does not match any allowed image signature.
 */
function detectImageMime(filePath: string): string | undefined {
  try {
    // Read only first 12 bytes — sufficient for all four signatures
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return "image/png";
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return "image/jpeg";
    }
    // GIF: GIF87a or GIF89a
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return "image/gif";
    }
    // WebP: RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
      return "image/webp";
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// Multer stores with .tmp extension — final extension assigned after magic-byte check
const diskStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as Request & { userId: string }).userId;
    const dir = userDir(userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${crypto.randomUUID()}.tmp`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  // Client MIME pre-filter — early guard only; not trusted for security
  fileFilter: (_req, file, cb) => {
    if (Object.keys(SAFE_EXTENSIONS).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não suportado. Use PNG, JPG, GIF ou WebP."));
    }
  },
});

// GET /media — list user media
router.get("/media", requireAuth, (req: Request, res: Response): void => {
  const userId = (req as Request & { userId: string }).userId;
  const items = readIndex(userId);
  res.json({ items });
});

// GET /media/storage — storage usage (plan fetched server-side from DB)
router.get("/media/storage", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const items = readIndex(userId);
  const used = totalUsed(items);
  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  res.json({ used, limit, plan, count: items.length, categories: CATEGORIES });
});

// POST /media/upload — upload a file
router.post("/media/upload", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  // 1. Fetch plan server-side — do NOT trust client-supplied value
  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // 2. Run multer
  const multerErr = await new Promise<Error | null>((resolve) => {
    upload.single("file")(req, res, (err) => resolve(err as Error | null));
  });

  if (multerErr) { res.status(400).json({ error: multerErr.message }); return; }
  if (!req.file) { res.status(400).json({ error: "Nenhum arquivo enviado." }); return; }

  const tmpPath = req.file.path;

  // 3. Magic-byte validation — detect ACTUAL file type from content, not from client headers
  const detectedMime = detectImageMime(tmpPath);
  const safeExt = detectedMime ? SAFE_EXTENSIONS[detectedMime] : undefined;

  if (!safeExt) {
    fs.unlinkSync(tmpPath);
    res.status(400).json({
      error: "Conteúdo do arquivo inválido. Apenas PNG, JPG, GIF e WebP são aceitos.",
    });
    return;
  }

  // 4. Rename .tmp → verified safe extension (prevents serving .html or other active content)
  const baseId = path.basename(tmpPath, ".tmp");
  const safeFilename = `${baseId}${safeExt}`;
  const safePath = path.join(userDir(userId), safeFilename);
  fs.renameSync(tmpPath, safePath);

  // 5. Quota check against server-side plan
  const items = readIndex(userId);
  if (totalUsed(items) + req.file.size > limit) {
    fs.unlinkSync(safePath);
    res.status(413).json({ error: "Limite de armazenamento atingido. Faça upgrade do plano." });
    return;
  }

  // 6. Extract image dimensions
  const { width, height } = extractDimensions(safePath);

  // 7. Build and persist metadata
  const category = CATEGORIES.includes(req.body.category) ? (req.body.category as string) : "Geral";
  const item: MediaItem = {
    id: crypto.randomUUID(),
    filename: safeFilename,
    originalName: (req.body.name as string)?.trim() || req.file.originalname,
    category,
    size: req.file.size,
    mimeType: detectedMime as string,
    width,
    height,
    createdAt: new Date().toISOString(),
  };

  items.unshift(item);
  writeIndex(userId, items);

  res.json({ item, url: `/api/media/files/${userId}/${safeFilename}` });
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
