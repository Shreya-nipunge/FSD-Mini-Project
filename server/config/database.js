import "./env.js";
import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL;
const hasDiscreteConfig = Boolean(
  process.env.PG_HOST &&
    process.env.PG_DATABASE &&
    process.env.PG_USER &&
    process.env.PG_PASSWORD,
);

export const databaseConfigured = Boolean(databaseUrl || hasDiscreteConfig);

const commonOptions = {
  dialect: "postgres",
  logging: false,
  pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
};

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      ...commonOptions,
      dialectOptions:
        process.env.PG_SSL === "true"
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
    })
  : hasDiscreteConfig
    ? new Sequelize(
        process.env.PG_DATABASE,
        process.env.PG_USER,
        process.env.PG_PASSWORD,
        {
          ...commonOptions,
          host: process.env.PG_HOST,
          port: Number.parseInt(process.env.PG_PORT || "5432", 10),
          dialectOptions:
            process.env.PG_SSL === "true"
              ? { ssl: { require: true, rejectUnauthorized: false } }
              : {},
        },
      )
    : null;

// This performs a read-only connection/authentication check. It never synchronizes,
// creates, alters, or drops database tables.
export async function testDatabaseConnection() {
  if (!sequelize) {
    return { configured: false, connected: false };
  }

  await sequelize.authenticate();
  return { configured: true, connected: true };
}
