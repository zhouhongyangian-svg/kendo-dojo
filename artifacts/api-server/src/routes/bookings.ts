import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { bookingsTable, coursesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// 輔助函數：解決 string | string[] 型別問題
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const memberId = req.session.memberId!;
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.memberId, memberId))
      .orderBy(bookingsTable.createdAt);
    const withCourses = await Promise.all(
      bookings.map(async (booking) => {
        const [course] = await db
          .select()
          .from(coursesTable)
          .where(eq(coursesTable.id, booking.courseId))
          .limit(1);
        const [countResult] = await db
          .select({ count: count() })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.courseId, booking.courseId),
              eq(bookingsTable.status, "confirmed"),
            ),
          );
        return {
          ...booking,
          createdAt: booking.createdAt.toISOString(),
          course: course
            ? {
                ...course,
                scheduledAt: course.scheduledAt.toISOString(),
                enrolledCount: Number(countResult?.count ?? 0),
              }
            : undefined,
        };
      }),
    );
    return res.json(withCourses);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const memberId = req.session.memberId!;
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .limit(1);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const existing = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.memberId, memberId),
          eq(bookingsTable.courseId, courseId),
          eq(bookingsTable.status, "confirmed"),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Already booked this course" });
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.courseId, courseId),
          eq(bookingsTable.status, "confirmed"),
        ),
      );
    const enrolled = Number(countResult?.count ?? 0);

    if (enrolled >= course.maxCapacity) {
      return res.status(400).json({ error: "Course is full" });
    }

    const [booking] = await db
      .insert(bookingsTable)
      .values({ memberId, courseId, status: "confirmed" })
      .returning();

    const enrolledCount = enrolled + 1;
    return res.status(201).json({
      ...booking,
      createdAt: booking.createdAt.toISOString(),
      course: {
        ...course,
        scheduledAt: course.scheduledAt.toISOString(),
        enrolledCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const memberId = req.session.memberId!;
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(
        and(eq(bookingsTable.id, id), eq(bookingsTable.memberId, memberId)),
      )
      .limit(1);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, booking.courseId))
      .limit(1);

    if (course) {
      const hoursUntilStart =
        (course.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilStart < 6) {
        return res.status(400).json({ error: "距开课不足6小时，无法取消预约" });
      }
    }

    await db
      .update(bookingsTable)
      .set({ status: "cancelled" })
      .where(eq(bookingsTable.id, id));

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
