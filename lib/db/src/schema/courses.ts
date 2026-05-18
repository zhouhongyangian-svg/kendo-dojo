import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courseLevelsTable = pgTable("course_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseLevelSchema = createInsertSchema(courseLevelsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCourseLevel = z.infer<typeof insertCourseLevelSchema>;
export type CourseLevel = typeof courseLevelsTable.$inferSelect;

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  instructor: text("instructor").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  maxCapacity: integer("max_capacity").notNull().default(20),
  level: text("level").notNull().default("全部"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
