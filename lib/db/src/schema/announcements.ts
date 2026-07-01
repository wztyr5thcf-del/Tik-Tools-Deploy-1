import { pgTable, text, boolean, bigint } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id:        text("id").primaryKey(),
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  type:      text("type").notNull().default("info"),
  pinned:    boolean("pinned").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  emoji:     text("emoji"),
});

export type AnnouncementRow = typeof announcementsTable.$inferSelect;
export type InsertAnnouncementRow = typeof announcementsTable.$inferInsert;
