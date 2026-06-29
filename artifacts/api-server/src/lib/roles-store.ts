import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const rolesFile = path.resolve(dataDir, "roles.json");

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RolesStore {
  roles: Role[];
}

export const ALL_PERMISSIONS: Array<{ id: string; label: string; category: string }> = [
  { id: "view_dashboard",           label: "Dashboard",              category: "Páginas" },
  { id: "view_monitor",             label: "Monitor",                category: "Páginas" },
  { id: "view_bulk_check",          label: "Bulk Check",             category: "Páginas" },
  { id: "view_gaming_leaderboard",  label: "Gaming Leaderboard",     category: "Páginas" },
  { id: "view_gifters",             label: "Gifters Leaderboard",    category: "Páginas" },
  { id: "view_webhooks",            label: "Webhooks",               category: "Páginas" },
  { id: "view_live_captions",       label: "Live Captions",          category: "Páginas" },
  { id: "view_live_analytics",      label: "Live Analytics",         category: "Páginas" },
  { id: "view_country_leaderboard", label: "Country Leaderboard",    category: "Páginas" },
  { id: "view_gift_gallery",        label: "Gift Gallery",           category: "Páginas" },
  { id: "use_watchlist",            label: "Watchlist",              category: "Funcionalidades" },
  { id: "use_jwt",                  label: "JWT / WebSocket",        category: "Funcionalidades" },
  { id: "change_tiktok_username",   label: "Alterar TikTok Username", category: "Funcionalidades" },
  { id: "view_admin_panel",         label: "Painel Admin",           category: "Admin" },
];

export function makeRoleId(): string {
  return "role_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadRoles(): RolesStore {
  try {
    if (fs.existsSync(rolesFile)) {
      return JSON.parse(fs.readFileSync(rolesFile, "utf-8")) as RolesStore;
    }
  } catch { /* ignore */ }
  return { roles: [] };
}

export function saveRoles(store: RolesStore): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(rolesFile, JSON.stringify(store, null, 2));
}
