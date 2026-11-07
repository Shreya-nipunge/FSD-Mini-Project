import bcrypt from "bcrypt";
import "../config/env.js";
import { databaseConfigured, sequelize } from "../config/database.js";
import { isIsolatedDevelopmentDatabase } from "./databaseSafety.js";

const demoUserId = "10000000-0000-4000-8000-000000000001";
const demoAdminId = "10000000-0000-4000-8000-000000000002";
const demoReportId = "20000000-0000-4000-8000-000000000001";

const userPassword = process.env.DEMO_USER_PASSWORD;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;

if (!databaseConfigured || !sequelize) {
  console.error("Seed stopped: configure DATABASE_URL or PG_* values first.");
  process.exitCode = 1;
} else if (!isIsolatedDevelopmentDatabase(sequelize.config)) {
  console.error("Seed stopped: demo records may only be written to 127.0.0.1/crimemap_admin_dev.");
  process.exitCode = 1;
} else if (!userPassword || !adminPassword) {
  console.error("Seed stopped: set DEMO_USER_PASSWORD and DEMO_ADMIN_PASSWORD in the local environment.");
  process.exitCode = 1;
} else {
  try {
    const { CrimeReport, User } = await import("../models/index.js");
    await sequelize.authenticate();
    const now = new Date();
    const userHash = await bcrypt.hash(userPassword, 12);
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const [demoUser] = await User.findOrCreate({
      where: { id: demoUserId },
      defaults: {
        id: demoUserId,
        name: "CrimeMap Demo Reporter",
        email: "demo.reporter@example.test",
        passwordHash: userHash,
        role: "user",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    const [demoAdmin] = await User.findOrCreate({
      where: { id: demoAdminId },
      defaults: {
        id: demoAdminId,
        name: "CrimeMap Demo Administrator",
        email: "demo.admin@example.test",
        passwordHash: adminHash,
        role: "admin",
        adminRole: "System Admin",
        organization: "CrimeMap Demonstration",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    await CrimeReport.findOrCreate({
      where: { id: demoReportId },
      defaults: {
        id: demoReportId,
        userId: demoUser.id,
        title: "Demonstration report",
        category: "Theft",
        description: "Synthetic demonstration record. No real incident or person is represented.",
        location: "Demonstration location",
        state: "Demo State",
        district: "Demo District",
        status: "UNVERIFIED",
        shareDescription: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log("Demo seed complete (existing deterministic demo records were retained).");
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize?.close();
  }
}
