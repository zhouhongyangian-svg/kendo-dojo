import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import membersRouter from "./members";
import announcementsRouter from "./announcements";
import coursesRouter from "./courses";
import courseLevelsRouter from "./course-levels";
import bookingsRouter from "./bookings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/members", membersRouter);
router.use("/announcements", announcementsRouter);
router.use("/courses", coursesRouter);
router.use("/course-levels", courseLevelsRouter);
router.use("/bookings", bookingsRouter);
router.use("/admin", adminRouter);

export default router;
