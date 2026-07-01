import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "./auth";
import {
  getTicketsByUser, getAllTickets, getTicketById, getPendingTicketByUser,
  createTicket, updateTicket, getMessagesByTicket, addMessage,
} from "../lib/support-store";
import { getUserById, updateUser, getAllUsers, publicUser } from "../lib/users-store";

const router: IRouter = Router();
type AuthReq = Request & { userId: string };

// GET /support/tickets — user's own tickets
router.get("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const tickets = (await getTicketsByUser(userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const messages = await Promise.all(tickets.map((t) => getMessagesByTicket(t.id)));
  res.json({ tickets, messages: messages.flat() });
});

// POST /support/tickets — create TikTok username change request
router.post("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { newTiktokUsername, reason, customReason } = req.body as { newTiktokUsername?: string; reason?: string; customReason?: string };

  if (!newTiktokUsername || !reason) {
    res.status(400).json({ error: "newTiktokUsername and reason are required" }); return;
  }

  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const pending = await getPendingTicketByUser(userId, "tiktok_username_change");
  if (pending) { res.status(409).json({ error: "Você já possui uma solicitação pendente.", ticketId: pending.id }); return; }

  const ticket = await createTicket({
    type: "tiktok_username_change",
    userId,
    userEmail: user.email,
    userName: user.name,
    oldValue: user.tiktokUsername ?? undefined,
    newValue: newTiktokUsername.trim().replace(/^@/, ""),
    reason,
    customReason: customReason ?? undefined,
  });

  req.log.info({ userId, ticketId: ticket.id }, "Support ticket created");
  res.status(201).json({ ticket });
});

// PATCH /support/tickets/:id/cancel
router.patch("/support/tickets/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const ticket = await getTicketById(id);
  if (!ticket || ticket.userId !== userId) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status !== "pending") { res.status(400).json({ error: "Só é possível cancelar tickets pendentes" }); return; }
  const updated = await updateTicket(id, { status: "cancelled", resolvedAt: new Date().toISOString() });
  res.json({ ticket: updated });
});

// GET /support/tickets/:id/messages
router.get("/support/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await getMessagesByTicket(id);
  res.json({ messages });
});

// POST /support/tickets/:id/messages
router.post("/support/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const msg = await addMessage({ ticketId: id, fromAdmin: !!reqUser?.isAdmin, authorName: reqUser?.name ?? "?", text: text.trim() });
  res.json({ message: msg });
});

// GET /admin/support/tickets
router.get("/admin/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }
  const tickets = (await getAllTickets()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ tickets });
});

// PATCH /admin/support/tickets/:id — approve or deny
router.patch("/admin/support/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const adminId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const { action, adminNote } = req.body as { action: "approve" | "deny"; adminNote?: string };

  const adminUser = await getUserById(adminId);
  if (!adminUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }

  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status !== "pending") { res.status(400).json({ error: "Ticket already resolved" }); return; }

  if (action === "approve") {
    const targetUser = await getUserById(ticket.userId);
    if (targetUser) {
      const log = [...(targetUser.tiktokUsernameChangeLog ?? []), new Date().toISOString()];
      await updateUser(ticket.userId, { tiktokUsername: ticket.newValue || undefined, tiktokUsernameChangeLog: log });
    }
  }

  const updated = await updateTicket(id, {
    status: action === "approve" ? "approved" : "denied",
    adminNote: adminNote?.trim() || undefined,
    resolvedAt: new Date().toISOString(),
    resolvedBy: adminId,
  });

  if (adminNote?.trim()) {
    await addMessage({ ticketId: id, fromAdmin: true, authorName: adminUser.name, text: adminNote.trim() });
  }

  req.log.info({ adminId, ticketId: id, action }, "Support ticket resolved");
  res.json({ ticket: updated });
});

// GET /support/online — heuristic: any admin logged in last 15 min
router.get("/support/online", async (_req, res): Promise<void> => {
  const users = await getAllUsers();
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const isOnline = users.some((u) => u.isAdmin && u.lastLoginAt && new Date(u.lastLoginAt).getTime() > fifteenMinutesAgo);
  res.json({ online: isOnline });
});

export default router;
