import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { coursesTable, bookingsTable } from "@workspace/db";
import { eq, gte, lte, and, count } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  requireCourseAdmin,
} from "../middlewares/requireAuth";

const router = Router();

// 輔助函數：解決 string | string[] 型別問題
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

async function getCourseWithCount(courseId: number) {
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId))
    .limit(1);
  if (!course) return null;
  const [countResult] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.courseId, courseId),
        eq(bookingsTable.status, "confirmed"),
      ),
    );
  return {
    ...course,
    scheduledAt: course.scheduledAt.toISOString(),
    enrolledCount: Number(countResult?.count ?? 0),
  };
}

router.get("/upcoming", requireAuth, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const courses = await db
      .select()
      .from(coursesTable)
      .where(
        and(
          gte(coursesTable.scheduledAt, now),
          lte(coursesTable.scheduledAt, thirtyDaysLater),
        ),
      )
      .orderBy(coursesTable.scheduledAt);
    const withCounts = await Promise.all(
      courses.map(async (course) => {
        const [countResult] = await db
          .select({ count: count() })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.courseId, course.id),
              eq(bookingsTable.status, "confirmed"),
            ),
          );
        return {
          ...course,
          scheduledAt: course.scheduledAt.toISOString(),
          enrolledCount: Number(countResult?.count ?? 0),
        };
      }),
    );
    return res.json(withCounts);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const courses = await db
      .select()
      .from(coursesTable)
      .orderBy(coursesTable.scheduledAt);
    const withCounts = await Promise.all(
      courses.map(async (course) => {
        const [countResult] = await db
          .select({ count: count() })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.courseId, course.id),
              eq(bookingsTable.status, "confirmed"),
            ),
          );
        return {
          ...course,
          scheduledAt: course.scheduledAt.toISOString(),
          enrolledCount: Number(countResult?.count ?? 0),
        };
      }),
    );
    return res.json(withCounts);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireCourseAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      instructor,
      scheduledAt,
      durationMinutes,
      maxCapacity,
      level,
    } = req.body;
    if (
      !title ||
      !instructor ||
      !scheduledAt ||
      !durationMinutes ||
      !maxCapacity
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [course] = await db
      .insert(coursesTable)
      .values({
        title,
        description: description || null,
        instructor,
        scheduledAt: new Date(scheduledAt),
        durationMinutes,
        maxCapacity,
        level: level || "all",
      })
      .returning();
    return res.status(201).json({
      ...course,
      scheduledAt: course.scheduledAt.toISOString(),
      enrolledCount: 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/:id",
  requireCourseAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id));
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

      const {
        title,
        description,
        instructor,
        scheduledAt,
        durationMinutes,
        maxCapacity,
        level,
      } = req.body;
      const updates: Partial<typeof coursesTable.$inferInsert> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (instructor !== undefined) updates.instructor = instructor;
      if (scheduledAt !== undefined)
        updates.scheduledAt = new Date(scheduledAt);
      if (durationMinutes !== undefined)
        updates.durationMinutes = durationMinutes;
      if (maxCapacity !== undefined) updates.maxCapacity = maxCapacity;
      if (level !== undefined) updates.level = level;

      const [course] = await db
        .update(coursesTable)
        .set(updates)
        .where(eq(coursesTable.id, id))
        .returning();
      if (!course) return res.status(404).json({ error: "Course not found" });

      const updated = await getCourseWithCount(id);
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/:id",
  requireCourseAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id));
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

      const [deleted] = await db
        .delete(coursesTable)
        .where(eq(coursesTable.id, id))
        .returning();
      if (!deleted) return res.status(404).json({ error: "Course not found" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
