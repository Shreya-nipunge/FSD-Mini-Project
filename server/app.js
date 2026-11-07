import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import reportsRouter from "./routes/reports.js";
import analyticsRouter from "./routes/analytics.js";
import newsRouter from "./routes/news.js";

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      // Permit non-browser clients that do not send an Origin header.
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(Object.assign(new Error("Origin is not allowed by CORS"), { status: 403 }));
    },
  }),
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", reportsRouter);
app.use("/api", analyticsRouter);
app.use("/api", newsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
