import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";

const router = Router();

// 輔助函數：解決 string | string[] 型別問題
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

const fmt = (a: typeof announcementsTable.$inferSelect) => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
});

// Members see only published; admins see all
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const isAdmin =
      session?.memberRole === "admin" || session?.memberRole === "course_admin";
    const rows = await db
      .select()
      .from(announcementsTable)
      .where(isAdmin ? undefined : eq(announcementsTable.isPublished, true))
      .orderBy(
        desc(announcementsTable.isPinned),
        desc(announcementsTable.createdAt),
      );
    return res.json(rows.map(fmt));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, isPinned, isPublished } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    const [announcement] = await db
      .insert(announcementsTable)
      .values({
        title,
        content,
        isPinned: isPinned ?? false,
        isPublished: isPublished ?? true,
      })
      .returning();
    return res.status(201).json(fmt(announcement));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { title, content, isPinned, isPublished } = req.body;
    const updates: Partial<typeof announcementsTable.$inferInsert> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    const [announcement] = await db
      .update(announcementsTable)
      .set(updates)
      .where(eq(announcementsTable.id, id))
      .returning();

    if (!announcement)
      return res.status(404).json({ error: "Announcement not found" });
    return res.json(fmt(announcement));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [deleted] = await db
      .delete(announcementsTable)
      .where(eq(announcementsTable.id, id))
      .returning();
    if (!deleted)
      return res.status(404).json({ error: "Announcement not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
