import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, email))
      .limit(1);

    if (!member) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (member.status === "inactive") {
      return res.status(401).json({ error: "Account is inactive" });
    }

    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.memberId = member.id;
    req.session.memberRole = member.role;

    return res.json({
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt.toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, req.session.memberId!))
      .limit(1);

    if (!member) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.json({
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

export default router;
