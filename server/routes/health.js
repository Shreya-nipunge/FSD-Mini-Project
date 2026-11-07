import { Router } from "express";
import { databaseConfigured, testDatabaseConnection } from "../config/database.js";

const router = Router();

router.get("/health", async (_req, res) => {
  let database = "not_configured";

  if (databaseConfigured) {
    try {
      await testDatabaseConnection();
      database = "connected";
    } catch {
      database = "unavailable";
    }
  }

  res.status(200).json({ success: true, data: { status: "ok", database } });
});

export default router;
