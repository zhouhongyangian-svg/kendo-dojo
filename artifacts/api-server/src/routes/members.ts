import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

// 輔助函數：安全處理 params（解決 string | string[] 問題）
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const members = await db
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
      .orderBy(membersTable.joinedAt);

    return res.json(
      members.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
      })),
    );
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }

    const existing = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [member] = await db
      .insert(membersTable)
      .values({
        name,
        email,
        passwordHash,
        phone: phone || null,
        role: role || "member",
        status: "active",
      })
      .returning();

    return res.status(201).json({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [member] = await db
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
      .where(eq(membersTable.id, id))
      .limit(1);

    if (!member) return res.status(404).json({ error: "Member not found" });

    return res.json({ ...member, joinedAt: member.joinedAt.toISOString() });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, email, phone, role, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    if (role && !["admin", "course_admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, email))
      .limit(1);
    if (existing.length > 0 && existing[0].id !== id) {
      return res
        .status(400)
        .json({ error: "Email already in use by another account" });
    }

    const updateData: Record<string, any> = {
      name,
      email,
      phone: phone || null,
      ...(role && { role }),
    };

    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(membersTable)
      .set(updateData)
      .where(eq(membersTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Member not found" });

    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      joinedAt: updated.joinedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { status } = req.body;
    if (!status || !["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ error: "status must be 'active' or 'inactive'" });
    }

    const [updated] = await db
      .update(membersTable)
      .set({ status })
      .where(eq(membersTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Member not found" });

    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      joinedAt: updated.joinedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(getParam(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [deleted] = await db
      .delete(membersTable)
      .where(eq(membersTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Member not found" });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
