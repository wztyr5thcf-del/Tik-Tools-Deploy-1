import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const uiFile = path.resolve(dataDir, "ui-config.json");

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;            // lucide icon name string
  matchPrefix?: string;
  adminOnly?: boolean;
  requiresPlan?: string;
  visible: boolean;
}

export interface NavSectionConfig {
  id: string;
  label?: string;
  items: NavItemConfig[];
}

export interface UIConfig {
  navType: "sidebar" | "topbar";
  primaryColor: string;    // HSL values string e.g. "180 100% 50%"
  secondaryColor: string;
  logoText: string;
  logoUrl: string;         // optional image URL
  sidebarSections: NavSectionConfig[];
  updatedAt: string;
}

const DEFAULT_UI_CONFIG: UIConfig = {
  navType: "sidebar",
  primaryColor: "180 100% 50%",
  secondaryColor: "333 99% 52%",
  logoText: "Creatools",
  logoUrl: "",
  sidebarSections: [
    {
      id: "main",
      items: [
        { id: "dashboard",    label: "Dashboard",    href: "/",                icon: "LayoutDashboard", visible: true },
        { id: "monitor",      label: "Monitor",      href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor",              visible: true },
        { id: "gift-gallery", label: "Gift Gallery", href: "/gift-gallery",    icon: "Diamond",         visible: true },
      ],
    },
    {
      id: "streamer",
      label: "Streamer Tools",
      items: [
        { id: "lookup",      label: "Lookup",            href: "/streamer/lookup",      icon: "Search",   matchPrefix: "/streamer/lookup",      visible: true },
        { id: "bulk-check",  label: "Bulk Check",        href: "/streamer/bulk-check",  icon: "Users",    matchPrefix: "/streamer/bulk-check",  requiresPlan: "basic", visible: true },
        { id: "watchlist",   label: "Watchlist",         href: "/streamer/watchlist",   icon: "Star",     matchPrefix: "/streamer/watchlist",   visible: true },
        { id: "jwt",         label: "JWT / WebSocket",   href: "/streamer/jwt",         icon: "Key",      matchPrefix: "/streamer/jwt",         visible: true },
        { id: "rate-limits", label: "Rate Limits",       href: "/streamer/rate-limits", icon: "BarChart2",matchPrefix: "/streamer/rate-limits", visible: true },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      items: [
        { id: "leaderboards", label: "Leaderboards", href: "/leaderboards", icon: "Crown", matchPrefix: "/leaderboards", visible: true },
      ],
    },
    {
      id: "account",
      items: [
        { id: "pricing",  label: "Planos",    href: "/pricing",  icon: "Tag",      visible: true },
        { id: "settings", label: "Ajustes",   href: "/settings", icon: "Settings", visible: true },
      ],
    },
    {
      id: "admin",
      items: [
        { id: "admin", label: "Admin Panel", href: "/admin", icon: "Shield", adminOnly: true, visible: true },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
};

export function loadUIConfig(): UIConfig {
  try {
    if (fs.existsSync(uiFile)) {
      return JSON.parse(fs.readFileSync(uiFile, "utf-8")) as UIConfig;
    }
  } catch { /* ignore */ }
  saveUIConfig(DEFAULT_UI_CONFIG);
  return DEFAULT_UI_CONFIG;
}

export function saveUIConfig(config: UIConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(uiFile, JSON.stringify(config, null, 2));
}
