import { pgTable, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod/v4";
import { membersTable } from "./members";
import { coursesTable } from "./courses";

export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  status: bookingStatusEnum("booking_status").notNull().default("confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookingsRelations = relations(bookingsTable, ({ one }) => ({
  member: one(membersTable, { fields: [bookingsTable.memberId], references: [membersTable.id] }),
  course: one(coursesTable, { fields: [bookingsTable.courseId], references: [coursesTable.id] }),
}));

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
