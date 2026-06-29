import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const plansFile = path.resolve(dataDir, "plans.json");

export interface Plan {
  id: string;           // "free" | "basic" | "pro" or custom
  name: string;
  description: string;
  price: number;        // in USD cents (0 = free)
  currency: string;     // "USD", "BRL", etc.
  billingPeriod: "monthly" | "yearly" | "lifetime" | "free";
  permissions: string[];
  tiktokUsernameChangesPerWeek: number; // 0 = blocked, -1 = unlimited
  maxConcurrentWs: number;
  maxApiCallsPerWindow: number;
  features: string[];   // human-readable feature list for display
  color: string;        // badge color (tailwind class fragment)
  order: number;        // display order
  isActive: boolean;
}

export interface PlansStore {
  plans: Plan[];
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "free",
    name: "Sandbox",
    description: "Gratuito para testes e exploração",
    price: 0,
    currency: "USD",
    billingPeriod: "free",
    permissions: [
      "view_dashboard",
      "view_monitor",
      "view_gift_gallery",
      "change_tiktok_username",
    ],
    tiktokUsernameChangesPerWeek: 1,
    maxConcurrentWs: 3,
    maxApiCallsPerWindow: 20,
    features: ["Dashboard", "Monitor (básico)", "Gift Gallery"],
    color: "gray",
    order: 0,
    isActive: true,
  },
  {
    id: "basic",
    name: "Basic+",
    description: "Para criadores que precisam de mais ferramentas",
    price: 1999,
    currency: "USD",
    billingPeriod: "monthly",
    permissions: [
      "view_dashboard",
      "view_monitor",
      "view_bulk_check",
      "view_gifters",
      "view_country_leaderboard",
      "view_gift_gallery",
      "use_watchlist",
      "change_tiktok_username",
    ],
    tiktokUsernameChangesPerWeek: 3,
    maxConcurrentWs: 5,
    maxApiCallsPerWindow: 100,
    features: ["Tudo do Sandbox", "Bulk Check", "Gifters Leaderboard", "Watchlist"],
    color: "cyan",
    order: 1,
    isActive: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Acesso completo a todas as funcionalidades",
    price: 4999,
    currency: "USD",
    billingPeriod: "monthly",
    permissions: [
      "view_dashboard",
      "view_monitor",
      "view_bulk_check",
      "view_gaming_leaderboard",
      "view_gifters",
      "view_webhooks",
      "view_live_captions",
      "view_live_analytics",
      "view_country_leaderboard",
      "view_gift_gallery",
      "use_watchlist",
      "use_jwt",
      "change_tiktok_username",
    ],
    tiktokUsernameChangesPerWeek: -1,
    maxConcurrentWs: 10,
    maxApiCallsPerWindow: 500,
    features: ["Tudo do Basic+", "Gaming Leaderboard", "Webhooks", "Live Captions", "Live Analytics", "JWT/WebSocket"],
    color: "violet",
    order: 2,
    isActive: true,
  },
];

export function loadPlans(): PlansStore {
  try {
    if (fs.existsSync(plansFile)) {
      return JSON.parse(fs.readFileSync(plansFile, "utf-8")) as PlansStore;
    }
  } catch { /* ignore */ }
  // Seed with defaults
  const store: PlansStore = { plans: DEFAULT_PLANS };
  savePlans(store);
  return store;
}

export function savePlans(store: PlansStore): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(plansFile, JSON.stringify(store, null, 2));
}

export function getPlanById(id: string): Plan | undefined {
  return loadPlans().plans.find((p) => p.id === id);
}
