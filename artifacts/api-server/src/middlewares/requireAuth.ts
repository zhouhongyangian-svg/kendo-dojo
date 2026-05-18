import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    memberId: number;
    memberRole: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.memberRole !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

export function requireCourseAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session?.memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (
    req.session.memberRole !== "admin" &&
    req.session.memberRole !== "course_admin"
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
