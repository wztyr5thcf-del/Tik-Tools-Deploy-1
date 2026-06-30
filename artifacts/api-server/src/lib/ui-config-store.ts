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
  icon: string;
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
  primaryColor: string;
  secondaryColor: string;
  logoText: string;
  logoUrl: string;
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
        { id: "dashboard",     label: "Dashboard",    href: "/",                icon: "LayoutDashboard", visible: true },
        { id: "monitor",       label: "Monitor",      href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor",       visible: true },
        { id: "notifications", label: "Notificações", href: "/notifications",   icon: "Bell",            matchPrefix: "/notifications", visible: true },
        { id: "gift-gallery",  label: "Gift Gallery", href: "/gift-gallery",    icon: "Diamond",         visible: true },
      ],
    },
    {
      id: "streamer",
      label: "Streamer Tools",
      items: [
        { id: "overlays",     label: "Overlay Studio",   href: "/overlays",             icon: "Monitor",   matchPrefix: "/overlays",             visible: true },
        { id: "stream-tools", label: "Stream Tools",    href: "/stream-tools",         icon: "Tv2",       matchPrefix: "/stream-tools",         visible: true },
        { id: "scoreboards",  label: "Scoreboards",     href: "/scoreboards",          icon: "Trophy",    matchPrefix: "/scoreboards",          visible: true },
        { id: "minigames",    label: "Minigames",       href: "/minigames",            icon: "Gamepad2",  matchPrefix: "/minigames",            visible: true },
        { id: "lookup",       label: "Lookup",          href: "/streamer/lookup",      icon: "Search",    matchPrefix: "/streamer/lookup",      visible: true },
        { id: "bulk-check",   label: "Bulk Check",      href: "/streamer/bulk-check",  icon: "Users",     matchPrefix: "/streamer/bulk-check",  requiresPlan: "basic", visible: true },
        { id: "watchlist",    label: "Watchlist",       href: "/streamer/watchlist",   icon: "Star",      matchPrefix: "/streamer/watchlist",   visible: true },
        { id: "jwt",          label: "JWT / WebSocket", href: "/streamer/jwt",         icon: "Key",       matchPrefix: "/streamer/jwt",         requiresPlan: "basic", visible: true },
        { id: "rate-limits",  label: "Rate Limits",     href: "/streamer/rate-limits", icon: "BarChart2", matchPrefix: "/streamer/rate-limits", visible: true },
        { id: "dev-tools",    label: "Dev Tools",       href: "/dev-tools",            icon: "Code2",     matchPrefix: "/dev-tools",            requiresPlan: "pro",   visible: true },
      ],
    },
    {
      id: "live-tools",
      label: "Live Tools",
      items: [
        { id: "live-counts",    label: "Live Counts",    href: "/live-counts",    icon: "Radio",     matchPrefix: "/live-counts",    requiresPlan: "basic", visible: true },
        { id: "live-captions",  label: "Live Captions",  href: "/live-captions",  icon: "Subtitles", matchPrefix: "/live-captions",  requiresPlan: "pro",   visible: true },
        { id: "live-analytics", label: "Live Analytics", href: "/live-analytics", icon: "BarChart2", matchPrefix: "/live-analytics", requiresPlan: "pro",   visible: true },
        { id: "webhooks",       label: "Webhooks",       href: "/webhooks",       icon: "Webhook",   matchPrefix: "/webhooks",       requiresPlan: "pro",   visible: true },
      ],
    },
    {
      id: "leaderboards",
      label: "Leaderboards",
      items: [
        { id: "leaderboards",         label: "Leagues",  href: "/leaderboards",         icon: "Crown",    matchPrefix: "/leaderboards",         visible: true },
        { id: "leaderboards-country", label: "Country",  href: "/leaderboards/country", icon: "Globe",    matchPrefix: "/leaderboards/country", visible: true },
        { id: "leaderboards-gaming",  label: "Gaming",   href: "/leaderboards/gaming",  icon: "Gamepad2", matchPrefix: "/leaderboards/gaming",  visible: true },
        { id: "gifters",              label: "Gifters",  href: "/gifters",               icon: "Diamond",  matchPrefix: "/gifters",              visible: true },
      ],
    },
    {
      id: "account",
      items: [
        { id: "pricing",  label: "Planos",  href: "/pricing",  icon: "Tag",      visible: true },
        { id: "settings", label: "Ajustes", href: "/settings", icon: "Settings", visible: true },
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
      const stored = JSON.parse(fs.readFileSync(uiFile, "utf-8")) as UIConfig;
      return stored;
    }
  } catch { /* ignore */ }
  saveUIConfig(DEFAULT_UI_CONFIG);
  return DEFAULT_UI_CONFIG;
}

export function getDefaultUIConfig(): UIConfig {
  return { ...DEFAULT_UI_CONFIG, updatedAt: new Date().toISOString() };
}

export function saveUIConfig(config: UIConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(uiFile, JSON.stringify(config, null, 2));
}
