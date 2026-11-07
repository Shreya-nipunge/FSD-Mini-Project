import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { databaseConfigured, sequelize } from "../config/database.js";

if (!databaseConfigured || !sequelize) {
  console.error("Migration stopped: configure DATABASE_URL or PG_* values first.");
  process.exitCode = 1;
} else {
  try {
    await sequelize.authenticate();
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    );

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationDir = path.resolve(currentDir, "../migrations");
    const migrationFiles = (await readdir(migrationDir))
      .filter((file) => file.endsWith(".js"))
      .sort();
    const [appliedRows] = await sequelize.query("SELECT name FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.name));
    const queryInterface = sequelize.getQueryInterface();

    for (const name of migrationFiles) {
      if (applied.has(name)) {
        console.log(`Already applied: ${name}`);
        continue;
      }
      const migration = await import(pathToFileURL(path.join(migrationDir, name)).href);
      const transaction = await sequelize.transaction();
      try {
        await migration.up({ queryInterface, transaction });
        await sequelize.query("INSERT INTO schema_migrations (name) VALUES (:name)", {
          replacements: { name },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      console.log(`Applied: ${name}`);
    }
  } catch (error) {
    console.error(`Migration failed safely: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize?.close();
  }
}
