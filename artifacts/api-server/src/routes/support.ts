/**
 * Support routes — TikTok username change requests & tickets
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import {
  loadSupport, saveSupport, createTicket, addMessage,
  type TicketStatus,
} from "../lib/support-store";
import { loadUsers, saveUsers, publicUser } from "../lib/users-store";

const router: IRouter = Router();

type AuthRequest = Request & { userId: string };

// ── User: list my tickets ──────────────────────────────────────────────────────
router.get("/support/tickets", requireAuth, (req, res): void => {
  const userId = (req as AuthRequest).userId;
  const store = loadSupport();
  const tickets = store.tickets
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const messages = store.messages.filter((m) =>
    tickets.some((t) => t.id === m.ticketId)
  );
  res.json({ tickets, messages });
});

// ── User: create a TikTok username change request ──────────────────────────────
router.post("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const { newTiktokUsername, reason, customReason } = req.body as {
    newTiktokUsername?: string;
    reason?: string;
    customReason?: string;
  };

  if (!newTiktokUsername || !reason) {
    res.status(400).json({ error: "newTiktokUsername and reason are required" }); return;
  }

  const userStore = loadUsers();
  const user = userStore.users.find((u) => u.id === userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Only allow one pending request per user at a time
  const support = loadSupport();
  const pending = support.tickets.find(
    (t) => t.userId === userId && t.status === "pending" && t.type === "tiktok_username_change"
  );
  if (pending) {
    res.status(409).json({ error: "Você já possui uma solicitação pendente.", ticketId: pending.id }); return;
  }

  const ticket = createTicket({
    type: "tiktok_username_change",
    userId,
    userEmail: user.email,
    userName: user.name,
    oldValue: user.tiktokUsername,
    newValue: newTiktokUsername.trim().replace(/^@/, ""),
    reason,
    customReason,
  });

  req.log.info({ userId, ticketId: ticket.id }, "Support ticket created");
  res.status(201).json({ ticket });
});

// ── User: cancel a ticket ──────────────────────────────────────────────────────
router.patch("/support/tickets/:id/cancel", requireAuth, (req, res): void => {
  const userId = (req as AuthRequest).userId;
  const { id } = req.params as { id: string };
  const store = loadSupport();
  const idx = store.tickets.findIndex((t) => t.id === id && t.userId === userId);
  if (idx === -1) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (store.tickets[idx].status !== "pending") {
    res.status(400).json({ error: "Só é possível cancelar tickets pendentes" }); return;
  }
  store.tickets[idx].status = "cancelled";
  store.tickets[idx].resolvedAt = new Date().toISOString();
  saveSupport(store);
  res.json({ ticket: store.tickets[idx] });
});

// ── User/Admin: get messages for a ticket ──────────────────────────────────────
router.get("/support/tickets/:id/messages", requireAuth, (req, res): void => {
  const userId = (req as AuthRequest).userId;
  const { id } = req.params as { id: string };
  const store = loadSupport();
  const ticket = store.tickets.find((t) => t.id === id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  // Only ticket owner or admin can read messages
  const userStore = loadUsers();
  const reqUser = userStore.users.find((u) => u.id === userId);
  if (!reqUser?.isAdmin && ticket.userId !== userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const messages = store.messages.filter((m) => m.ticketId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.json({ messages });
});

// ── User/Admin: send a message ─────────────────────────────────────────────────
router.post("/support/tickets/:id/messages", requireAuth, (req, res): void => {
  const userId = (req as AuthRequest).userId;
  const { id } = req.params as { id: string };
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

  const store = loadSupport();
  const ticket = store.tickets.find((t) => t.id === id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const userStore = loadUsers();
  const reqUser = userStore.users.find((u) => u.id === userId);
  const isAdmin = !!reqUser?.isAdmin;
  if (!isAdmin && ticket.userId !== userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const msg = addMessage({
    ticketId: id,
    fromAdmin: isAdmin,
    authorName: reqUser?.name ?? "?",
    text: text.trim(),
  });
  res.json({ message: msg });
});

// ── Admin: list all tickets ────────────────────────────────────────────────────
router.get("/admin/support/tickets", requireAuth, (req, res): void => {
  const userId = (req as AuthRequest).userId;
  const userStore = loadUsers();
  const reqUser = userStore.users.find((u) => u.id === userId);
  if (!reqUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }

  const store = loadSupport();
  const tickets = [...store.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ tickets });
});

// ── Admin: approve or deny a ticket ───────────────────────────────────────────
router.patch("/admin/support/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const adminId = (req as AuthRequest).userId;
  const { id } = req.params as { id: string };
  const { action, adminNote } = req.body as { action: "approve" | "deny"; adminNote?: string };

  const userStore = loadUsers();
  const adminUser = userStore.users.find((u) => u.id === adminId);
  if (!adminUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }

  const store = loadSupport();
  const idx = store.tickets.findIndex((t) => t.id === id);
  if (idx === -1) { res.status(404).json({ error: "Ticket not found" }); return; }

  const ticket = store.tickets[idx];
  if (ticket.status !== "pending") {
    res.status(400).json({ error: "Ticket already resolved" }); return;
  }

  if (action === "approve") {
    // Apply the change to the user's profile
    const uIdx = userStore.users.findIndex((u) => u.id === ticket.userId);
    if (uIdx !== -1) {
      userStore.users[uIdx].tiktokUsername = ticket.newValue || undefined;
      const log = userStore.users[uIdx].tiktokUsernameChangeLog ?? [];
      log.push(new Date().toISOString());
      userStore.users[uIdx].tiktokUsernameChangeLog = log;
      saveUsers(userStore);
    }
    store.tickets[idx].status = "approved";
  } else {
    store.tickets[idx].status = "denied";
  }

  store.tickets[idx].adminNote = adminNote?.trim() || undefined;
  store.tickets[idx].resolvedAt = new Date().toISOString();
  store.tickets[idx].resolvedBy = adminId;
  saveSupport(store);

  // Auto-post admin note as message
  if (adminNote?.trim()) {
    addMessage({
      ticketId: id,
      fromAdmin: true,
      authorName: adminUser.name,
      text: adminNote.trim(),
    });
  }

  req.log.info({ adminId, ticketId: id, action }, "Support ticket resolved");
  res.json({ ticket: store.tickets[idx] });
});

// ── Check if support (any admin) is online ────────────────────────────────────
// Simple heuristic: any admin who logged in within the last 15 minutes
router.get("/support/online", (req, res): void => {
  const store = loadUsers();
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const isOnline = store.users.some(
    (u) => u.isAdmin && u.lastLoginAt && new Date(u.lastLoginAt).getTime() > fifteenMinutesAgo
  );
  res.json({ online: isOnline });
});

export default router;
