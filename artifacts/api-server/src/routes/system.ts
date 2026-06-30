/**
 * System status, alternative API config, and admin diagnostics.
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { requireAuth } from "./auth";
import { loadUsers } from "../lib/users-store";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const userId = (req as Request & { userId: string }).userId;
    const store = loadUsers();
    const user = store.users.find((u) => u.id === userId);
    if (!user?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    next();
  });
}

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const altApiConfigFile = path.resolve(dataDir, "alt-api-config.json");
const configFile = path.resolve(dataDir, "config.json");

interface AltApiConfig {
  enabled: boolean;
  provider: "custom" | "tikapi" | "none";
  baseUrl: string;
  apiKeyHeader: string;
  apiKey: string;
  testPath: string;
  notes: string;
}

function loadAltApiConfig(): AltApiConfig {
  try {
    if (fs.existsSync(altApiConfigFile)) {
      return JSON.parse(fs.readFileSync(altApiConfigFile, "utf-8")) as AltApiConfig;
    }
  } catch { /* ignore */ }
  return {
    enabled: false,
    provider: "none",
    baseUrl: "",
    apiKeyHeader: "x-api-key",
    apiKey: "",
    testPath: "/api/live/top-channels",
    notes: "",
  };
}

function saveAltApiConfig(cfg: AltApiConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(altApiConfigFile, JSON.stringify(cfg, null, 2));
}

function loadConfig(): { apiKey?: string } {
  try {
    if (fs.existsSync(configFile)) return JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
  } catch { /* ignore */ }
  return {};
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

// GET /api/admin/system-status
router.get("/admin/system-status", requireAdmin, async (req, res): Promise<void> => {
  const store = loadUsers();
  const altCfg = loadAltApiConfig();
  const tiktoolsKey = process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;

  // Quick health checks (non-blocking, 5s timeout each)
  const checks: Record<string, { ok: boolean; message: string; latencyMs?: number }> = {};

  // tik.tools
  const tiktoolsStart = Date.now();
  try {
    const r = await fetch("https://api.tik.tools/api/live/top-channels", {
      headers: tiktoolsKey ? { "x-api-key": tiktoolsKey } : {},
      signal: AbortSignal.timeout(5000),
    });
    checks.tiktools = {
      ok: r.ok,
      message: r.ok ? "Online" : `Status ${r.status}`,
      latencyMs: Date.now() - tiktoolsStart,
    };
  } catch (err) {
    checks.tiktools = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - tiktoolsStart };
  }

  // Alternative API (if configured)
  if (altCfg.enabled && altCfg.baseUrl) {
    const altStart = Date.now();
    try {
      const url = `${altCfg.baseUrl.replace(/\/$/, "")}${altCfg.testPath || "/"}`;
      const headers: Record<string, string> = {};
      if (altCfg.apiKey && altCfg.apiKeyHeader) headers[altCfg.apiKeyHeader] = altCfg.apiKey;
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      checks.altApi = {
        ok: r.ok,
        message: r.ok ? "Online" : `Status ${r.status}`,
        latencyMs: Date.now() - altStart,
      };
    } catch (err) {
      checks.altApi = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - altStart };
    }
  } else {
    checks.altApi = { ok: false, message: "Não configurado" };
  }

  // Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const stripeStart = Date.now();
    try {
      const Stripe = (await import("stripe")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as any });
      const balance = await stripe.balance.retrieve();
      checks.stripe = {
        ok: true,
        message: balance.livemode ? "🔴 Live (produção)" : "🟡 Test (sandbox)",
        latencyMs: Date.now() - stripeStart,
      };
    } catch (err) {
      checks.stripe = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - stripeStart };
    }
  } else {
    checks.stripe = { ok: false, message: "STRIPE_SECRET_KEY não configurada" };
  }

  const byPlan = { free: 0, basic: 0, pro: 0 };
  for (const u of store.users) byPlan[u.plan] = (byPlan[u.plan] ?? 0) + 1;

  res.json({
    checks,
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
      cpus: os.cpus().length,
    },
    config: {
      tiktoolsKeySet: !!tiktoolsKey,
      tiktoolsKeyMasked: tiktoolsKey ? maskKey(tiktoolsKey) : null,
      stripeKeySet: !!stripeKey,
      jwtSecretIsDefault: !process.env.JWT_SECRET,
    },
    users: {
      total: store.users.length,
      admins: store.users.filter((u) => u.isAdmin).length,
      byPlan,
    },
  });
});

// GET /api/admin/alt-api-config
router.get("/admin/alt-api-config", requireAdmin, (_req, res): void => {
  const cfg = loadAltApiConfig();
  // Mask the API key
  res.json({ ...cfg, apiKey: cfg.apiKey ? maskKey(cfg.apiKey) : "" });
});

// PATCH /api/admin/alt-api-config
router.patch("/admin/alt-api-config", requireAdmin, (req, res): void => {
  const body = req.body as Partial<AltApiConfig> & { apiKey?: string };
  const existing = loadAltApiConfig();
  const updated: AltApiConfig = {
    enabled: body.enabled ?? existing.enabled,
    provider: body.provider ?? existing.provider,
    baseUrl: body.baseUrl ?? existing.baseUrl,
    apiKeyHeader: body.apiKeyHeader ?? existing.apiKeyHeader,
    apiKey: (body.apiKey && !body.apiKey.includes("...")) ? body.apiKey : existing.apiKey,
    testPath: body.testPath ?? existing.testPath,
    notes: body.notes ?? existing.notes,
  };
  saveAltApiConfig(updated);
  (req as Request & { log: { info: (...a: unknown[]) => void } }).log.info({ provider: updated.provider }, "Alt API config updated");
  res.json({ ok: true });
});

// POST /api/admin/test-alt-api
router.post("/admin/test-alt-api", requireAdmin, async (req, res): Promise<void> => {
  const { baseUrl, apiKeyHeader, apiKey, testPath } = req.body as {
    baseUrl?: string;
    apiKeyHeader?: string;
    apiKey?: string;
    testPath?: string;
  };

  if (!baseUrl?.trim()) {
    res.json({ ok: false, message: "URL base não fornecida" });
    return;
  }

  try {
    const url = `${baseUrl.trim().replace(/\/$/, "")}${testPath?.trim() || "/"}`;
    const headers: Record<string, string> = {};
    if (apiKey?.trim() && apiKeyHeader?.trim()) headers[apiKeyHeader.trim()] = apiKey.trim();
    const start = Date.now();
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const latencyMs = Date.now() - start;
    if (r.ok) {
      let preview = "";
      try {
        const text = await r.text();
        preview = text.slice(0, 300);
      } catch { /* ignore */ }
      res.json({ ok: true, message: `Conectado! Latência: ${latencyMs}ms`, preview, latencyMs });
    } else {
      res.json({ ok: false, message: `Status ${r.status} — ${r.statusText}`, latencyMs });
    }
  } catch (err) {
    res.json({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
  }
});

// GET /api/admin/tiktool-config-full — returns unmasked key (for editing)
router.get("/admin/tiktools-config", requireAdmin, (_req, res): void => {
  const key = process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;
  res.json({
    apiKeySet: !!key,
    apiKeyMasked: key ? maskKey(key) : null,
  });
});

// PATCH /api/admin/tiktools-config — update tik.tools API key from admin panel
router.patch("/admin/tiktools-config", requireAdmin, (req, res): void => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.trim()) { res.status(400).json({ error: "apiKey é obrigatória" }); return; }
  const cfg = loadConfig();
  cfg.apiKey = apiKey.trim();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
  process.env.TIKTOOLS_API_KEY = apiKey.trim();
  (req as Request & { log: { info: (...a: unknown[]) => void } }).log.info("tik.tools API key updated via admin panel");
  res.json({ ok: true, apiKeyMasked: maskKey(apiKey.trim()) });
});

export default router;
