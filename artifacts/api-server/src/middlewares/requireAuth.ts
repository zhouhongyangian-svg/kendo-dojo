import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    memberId: number;
    memberRole: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.memberId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.memberId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session.memberRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireCourseAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session?.memberId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (
    req.session.memberRole !== "admin" &&
    req.session.memberRole !== "course_admin"
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
