import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { membersTable, coursesTable, bookingsTable } from "@workspace/db";
import { count, eq, gte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalMembersResult] = await db.select({ count: count() }).from(membersTable);
    const [activeMembersResult] = await db
      .select({ count: count() })
      .from(membersTable)
      .where(eq(membersTable.status, "active"));
    const [totalCoursesResult] = await db.select({ count: count() }).from(coursesTable);

    const now = new Date();
    const [upcomingCoursesResult] = await db
      .select({ count: count() })
      .from(coursesTable)
      .where(gte(coursesTable.scheduledAt, now));

    const [totalBookingsResult] = await db
      .select({ count: count() })
      .from(bookingsTable)
      .where(eq(bookingsTable.status, "confirmed"));

    const recentMembers = await db
      .select({
        id: membersTable.id,
        name: membersTable.name,
        email: membersTable.email,
        phone: membersTable.phone,
        role: membersTable.role,
        status: membersTable.status,
        joinedAt: membersTable.joinedAt,
      })
      .from(membersTable)
      .orderBy(membersTable.joinedAt)
      .limit(5);

    return res.json({
      totalMembers: Number(totalMembersResult?.count ?? 0),
      activeMembers: Number(activeMembersResult?.count ?? 0),
      totalCourses: Number(totalCoursesResult?.count ?? 0),
      upcomingCourses: Number(upcomingCoursesResult?.count ?? 0),
      totalBookings: Number(totalBookingsResult?.count ?? 0),
      recentMembers: recentMembers.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
