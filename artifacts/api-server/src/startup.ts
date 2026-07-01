import fs from "fs";
import path from "path";
import pg from "pg";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dbConfigFile = path.resolve(workspaceRoot, "artifacts/api-server/data/db-config.json");

try {
  if (fs.existsSync(dbConfigFile)) {
    const cfg = JSON.parse(fs.readFileSync(dbConfigFile, "utf-8")) as { url?: string };
    if (cfg.url) {
      process.env.DATABASE_URL = cfg.url;
    }
  }
} catch {
  // ignore — fall back to DATABASE_URL env var
}

// Run additive schema migrations at startup
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: dbUrl });
  pool.query(`
    ALTER TABLE IF EXISTS ui_config
      ADD COLUMN IF NOT EXISTS header_config jsonb,
      ADD COLUMN IF NOT EXISTS featured_slides jsonb;
    ALTER TABLE IF EXISTS announcements
      ADD COLUMN IF NOT EXISTS image_url text;
  `).catch(() => { /* ignore — table may not exist yet on first boot */ })
    .finally(() => pool.end());
}
