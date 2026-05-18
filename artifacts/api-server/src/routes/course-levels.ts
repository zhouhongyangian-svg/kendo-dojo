import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { courseLevelsTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireCourseAdmin } from "../middlewares/requireAuth";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// 輔助函數：解決 string | string[] 型別問題
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const levels = await db
      .select()
      .from(courseLevelsTable)
      .orderBy(courseLevelsTable.sortOrder, courseLevelsTable.name);
    return res.json(levels);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireCourseAdmin, async (req: Request, res: Response) => {
  try {
    const { name, color, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "名称不能为空" });
    const [level] = await db
      .insert(courseLevelsTable)
      .values({ name, color: color || "#6366f1", sortOrder: sortOrder ?? 0 })
      .returning();
    return res.status(201).json(level);
  } catch (err: any) {
    if (err?.code === "23505")
      return res.status(400).json({ error: "该种类名称已存在" });
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

      const { name, color, sortOrder } = req.body;
      const oldLevel = await db
        .select()
        .from(courseLevelsTable)
        .where(eq(courseLevelsTable.id, id))
        .limit(1);
      if (!oldLevel[0]) return res.status(404).json({ error: "种类不存在" });

      const updates: Partial<typeof courseLevelsTable.$inferInsert> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;

      const [updated] = await db
        .update(courseLevelsTable)
        .set(updates)
        .where(eq(courseLevelsTable.id, id))
        .returning();

      if (name !== undefined && name !== oldLevel[0].name) {
        await db
          .update(coursesTable)
          .set({ level: name })
          .where(eq(coursesTable.level, oldLevel[0].name));
      }

      return res.json(updated);
    } catch (err: any) {
      if (err?.code === "23505")
        return res.status(400).json({ error: "该种类名称已存在" });
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
        .delete(courseLevelsTable)
        .where(eq(courseLevelsTable.id, id))
        .returning();
      if (!deleted) return res.status(404).json({ error: "种类不存在" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
