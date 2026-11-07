import { DataTypes, Model } from "sequelize";

export const REPORT_STATUSES = [
  "UNVERIFIED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  // Aliases found in the earlier JSON-backed implementation.
  "pending",
  "resolved",
];

export class CrimeReport extends Model {}

export function initializeCrimeReport(sequelize) {
  CrimeReport.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: true,
        validate: { len: [0, 180] },
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true, len: [1, 10000] },
      },
      location: {
        type: DataTypes.STRING(300),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 300] },
      },
      state: { type: DataTypes.STRING(100), allowNull: true },
      district: { type: DataTypes.STRING(120), allowNull: true },
      latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        validate: { min: -90, max: 90 },
      },
      longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        validate: { min: -180, max: 180 },
      },
      incidentDate: { type: DataTypes.DATE, allowNull: true, field: "incident_date" },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: "UNVERIFIED",
        validate: { isIn: [REPORT_STATUSES] },
      },
      confidence: { type: DataTypes.STRING(20), allowNull: true },
      evidenceUrl: { type: DataTypes.STRING(500), allowNull: true, field: "evidence_url" },
      evidenceOriginalName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "evidence_original_name",
      },
      evidenceMimeType: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "evidence_mime_type",
      },
      evidenceSize: { type: DataTypes.BIGINT, allowNull: true, field: "evidence_size" },
      shareDescription: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "share_description",
      },
      adminNotes: { type: DataTypes.TEXT, allowNull: true, field: "admin_notes" },
      reviewedAt: { type: DataTypes.DATE, allowNull: true, field: "reviewed_at" },
      reviewedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "reviewed_by_user_id",
      },
    },
    {
      sequelize,
      modelName: "CrimeReport",
      tableName: "crime_reports",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["user_id", "created_at"] },
        { fields: ["status", "created_at"] },
        { fields: ["state", "district"] },
      ],
    },
  );

  // Virtual compatibility alias for the prior complaint API's `crime_type` field.
  Object.defineProperty(CrimeReport.prototype, "crimeType", {
    configurable: true,
    get() {
      return this.getDataValue("category");
    },
    set(value) {
      this.setDataValue("category", value);
    },
  });

  return CrimeReport;
}
