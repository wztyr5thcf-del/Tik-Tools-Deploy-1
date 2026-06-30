import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const supportFile = path.resolve(dataDir, "support.json");

export type TicketStatus = "pending" | "approved" | "denied" | "cancelled";
export type TicketType = "tiktok_username_change";

export interface SupportTicket {
  id: string;
  type: TicketType;
  userId: string;
  userEmail: string;
  userName: string;
  // for tiktok_username_change
  oldValue?: string;
  newValue: string;
  reason: string;         // predefined key
  customReason?: string;  // when reason === "other"
  status: TicketStatus;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;    // admin userId
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  fromAdmin: boolean;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface SupportStore {
  tickets: SupportTicket[];
  messages: SupportMessage[];
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadSupport(): SupportStore {
  try {
    if (fs.existsSync(supportFile)) {
      return JSON.parse(fs.readFileSync(supportFile, "utf-8")) as SupportStore;
    }
  } catch { /* ignore */ }
  return { tickets: [], messages: [] };
}

export function saveSupport(store: SupportStore): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(supportFile, JSON.stringify(store, null, 2));
}

export function createTicket(data: Omit<SupportTicket, "id" | "createdAt" | "status">): SupportTicket {
  const store = loadSupport();
  const ticket: SupportTicket = {
    ...data,
    id: makeId(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.tickets.push(ticket);
  saveSupport(store);
  return ticket;
}

export function addMessage(data: Omit<SupportMessage, "id" | "createdAt">): SupportMessage {
  const store = loadSupport();
  const msg: SupportMessage = {
    ...data,
    id: makeId(),
    createdAt: new Date().toISOString(),
  };
  store.messages.push(msg);
  saveSupport(store);
  return msg;
}
