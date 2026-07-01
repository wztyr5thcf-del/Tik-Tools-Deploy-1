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
    CREATE TABLE IF NOT EXISTS event_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      trigger_type TEXT NOT NULL,
      trigger_filters JSONB NOT NULL DEFAULT '{}',
      actions JSONB NOT NULL DEFAULT '[]',
      cooldown_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS event_rules_user_id_idx ON event_rules(user_id);
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS profile_bio text,
      ADD COLUMN IF NOT EXISTS profile_banner text,
      ADD COLUMN IF NOT EXISTS social_links text,
      ADD COLUMN IF NOT EXISTS profile_sections text,
      ADD COLUMN IF NOT EXISTS total_live_sessions integer NOT NULL DEFAULT 0;
  `).catch(() => { /* ignore — table may not exist yet on first boot */ })
    .finally(() => pool.end());
}
