import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const usersFile = path.resolve(dataDir, "users.json");

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  plan: "free" | "basic" | "pro";
  isAdmin: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  tiktokUsername?: string;
}

export interface UsersStore {
  users: StoredUser[];
}

export function loadUsers(): UsersStore {
  try {
    if (fs.existsSync(usersFile)) {
      return JSON.parse(fs.readFileSync(usersFile, "utf-8")) as UsersStore;
    }
  } catch { /* ignore */ }
  return { users: [] };
}

export function saveUsers(store: UsersStore): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(usersFile, JSON.stringify(store, null, 2));
}

export function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function publicUser(u: StoredUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    hasStripe: !!u.stripeCustomerId,
    tiktokUsername: u.tiktokUsername ?? null,
  };
}
