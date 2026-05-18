import express, { type Express } from "express";
import cors from "cors";
// @ts-ignore
import pinoHttp from "pino-http";
import session from "express-session";

import membersRouter from "./routes/members";
import announcementsRouter from "./routes/announcements";
import coursesRouter from "./routes/courses";
import courseLevelsRouter from "./routes/course-levels";
import bookingsRouter from "./routes/bookings";
// 如果還有其他 routes，請繼續加入

import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  // @ts-ignore
  pinoHttp({
    logger,
    serializers: {
      // @ts-ignore
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      // @ts-ignore
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret =
  process.env.SESSION_SECRET || "kendo-dojo-secret-key-2024";

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// 正確註冊所有 routes
app.use("/api", membersRouter); // 如果 members 是根路由
app.use("/api/announcements", announcementsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/course-levels", courseLevelsRouter);
app.use("/api/bookings", bookingsRouter);
// 如果還有其他路由，請繼續加入

export default app;
