import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const plansFile = path.resolve(dataDir, "plans.json");

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: "monthly" | "yearly" | "lifetime" | "free";
  permissions: string[];
  tiktokUsernameChangesPerWeek: number;
  maxConcurrentWs: number;
  maxApiCallsPerWindow: number;
  maxLiveHoursPerMonth: number;
  maxLiveAnalyses: number;
  maxWebhooks: number;
  features: string[];
  color: string;
  order: number;
  isActive: boolean;
}

export interface PlansStore {
  plans: Plan[];
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Gratuito para testes e exploração",
    price: 0,
    currency: "BRL",
    billingPeriod: "free",
    permissions: [
      "view_dashboard",
      "view_monitor",
      "view_gift_gallery",
    ],
    tiktokUsernameChangesPerWeek: 0,
    maxConcurrentWs: 1,
    maxApiCallsPerWindow: 20,
    maxLiveHoursPerMonth: 5,
    maxLiveAnalyses: 10,
    maxWebhooks: 0,
    features: ["Dashboard", "Monitor (básico)", "Gift Gallery", "5h de live/mês"],
    color: "gray",
    order: 0,
    isActive: true,
  },
  {
    id: "basic",
    name: "Basic",
    description: "Para criadores que precisam de mais ferramentas",
    price: 2990,
    currency: "BRL",
    billingPeriod: "monthly",
    permissions: [
      "view_dashboard",
      "view_monitor",
      "view_bulk_check",
      "view_gifters",
      "view_country_leaderboard",
      "view_gift_gallery",
      "use_watchlist",
    ],
    tiktokUsernameChangesPerWeek: 1,
    maxConcurrentWs: 3,
    maxApiCallsPerWindow: 100,
    maxLiveHoursPerMonth: 30,
    maxLiveAnalyses: 100,
    maxWebhooks: 3,
    features: ["Tudo do Gratuito", "Bulk Check", "Gifters Leaderboard", "Watchlist", "30h de live/mês", "3 webhooks"],
    color: "cyan",
    order: 1,
    isActive: true,
  },
  {
    id: "pro",
    name: "PRO",
    description: "Acesso completo a todas as funcionalidades",
    price: 5990,
    currency: "BRL",
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
    ],
    tiktokUsernameChangesPerWeek: -1,
    maxConcurrentWs: 10,
    maxApiCallsPerWindow: 500,
    maxLiveHoursPerMonth: -1,
    maxLiveAnalyses: -1,
    maxWebhooks: -1,
    features: ["Tudo do Basic", "Gaming Leaderboard", "Webhooks ilimitados", "Live Captions", "Live Analytics", "JWT/WebSocket", "Live ilimitada"],
    color: "violet",
    order: 2,
    isActive: true,
  },
];

export function loadPlans(): PlansStore {
  try {
    if (fs.existsSync(plansFile)) {
      const stored = JSON.parse(fs.readFileSync(plansFile, "utf-8")) as PlansStore;
      // Migrate existing plans to include new fields with defaults
      stored.plans = stored.plans.map((p) => ({
        ...p,
        maxLiveHoursPerMonth: (p.maxLiveHoursPerMonth as number | undefined) ?? -1,
        maxLiveAnalyses: (p.maxLiveAnalyses as number | undefined) ?? -1,
        maxWebhooks: (p.maxWebhooks as number | undefined) ?? 0,
      }));
      return stored;
    }
  } catch { /* ignore */ }
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
