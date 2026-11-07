import app from "./app.js";
import { env } from "./config/env.js";
import { databaseConfigured, testDatabaseConnection } from "./config/database.js";

const server = app.listen(env.port, env.host, () => {
  console.log(`CrimeMap API listening on http://${env.host}:${env.port}`);
});

if (databaseConfigured) {
  testDatabaseConnection()
    .then(() => console.log("PostgreSQL connection test succeeded."))
    .catch((error) => {
      console.error(`PostgreSQL connection test failed: ${error.message}`);
    });
} else {
  console.log("PostgreSQL connection test skipped: database credentials are not configured.");
}

function shutdown(signal) {
  console.log(`${signal} received; closing API server.`);
  server.close(async () => {
    const { sequelize } = await import("./config/database.js");
    if (sequelize) await sequelize.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
