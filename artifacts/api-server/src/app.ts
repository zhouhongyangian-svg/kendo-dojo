import express, { type Express } from "express";
import cors from "cors";
// @ts-ignore
import pinoHttp from "pino-http";
import session from "express-session";

import membersRouter from "./routes/members.js";
import announcementsRouter from "./routes/announcements.js";
import coursesRouter from "./routes/courses.js";
import courseLevelsRouter from "./routes/course-levels.js";
import bookingsRouter from "./routes/bookings.js";
// 如果還有其他 routes（如 auth、events 等），請繼續在這裡加入 .js

import { logger } from "./lib/logger.js";

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

// 註冊路由
app.use("/api/members", membersRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/course-levels", courseLevelsRouter);
app.use("/api/bookings", bookingsRouter);
// 如果有其他路由，請繼續加入

export default app;
