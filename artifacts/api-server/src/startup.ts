import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dbConfigFile = path.resolve(workspaceRoot, "artifacts/api-server/data/db-config.json");

if (!process.env.DATABASE_URL) {
  try {
    if (fs.existsSync(dbConfigFile)) {
      const cfg = JSON.parse(fs.readFileSync(dbConfigFile, "utf-8")) as { url?: string };
      if (cfg.url) {
        process.env.DATABASE_URL = cfg.url;
      }
    }
  } catch {
    // ignore — DATABASE_URL will remain unset and lib/db will throw
  }
}
