import { sequelize } from "../config/database.js";
import { initializeUser, User } from "./User.js";
import { initializeCrimeReport, CrimeReport } from "./CrimeReport.js";

export function initializeModels(connection = sequelize) {
  if (!connection) {
    throw new Error("Database is not configured. Set DATABASE_URL or the PG_* variables.");
  }

  initializeUser(connection);
  initializeCrimeReport(connection);

  User.hasMany(CrimeReport, {
    as: "reports",
    foreignKey: { name: "userId", field: "user_id", allowNull: false },
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
  CrimeReport.belongsTo(User, {
    as: "reporter",
    foreignKey: { name: "userId", field: "user_id", allowNull: false },
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
  User.hasMany(CrimeReport, {
    as: "reviewedReports",
    foreignKey: { name: "reviewedByUserId", field: "reviewed_by_user_id", allowNull: true },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });
  CrimeReport.belongsTo(User, {
    as: "reviewer",
    foreignKey: { name: "reviewedByUserId", field: "reviewed_by_user_id", allowNull: true },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  return { sequelize: connection, User, CrimeReport };
}

if (sequelize) initializeModels(sequelize);

export { sequelize, User, CrimeReport };
