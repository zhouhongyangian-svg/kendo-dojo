import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["admin", "course_admin", "member"]);
export const statusEnum = pgEnum("status", ["active", "inactive"]);

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("member"),
  status: statusEnum("status").notNull().default("active"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  joinedAt: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
