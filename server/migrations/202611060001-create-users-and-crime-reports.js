import { DataTypes } from "sequelize";

const reportStatuses = "'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'pending', 'resolved'";

export async function up({ queryInterface, transaction }) {
    await queryInterface.createTable(
      "users",
      {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: false },
        email: { type: DataTypes.STRING(254), allowNull: false },
        password_hash: { type: DataTypes.STRING(100), allowNull: false },
        role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "user" },
        admin_role: { type: DataTypes.STRING(80), allowNull: true },
        organization: { type: DataTypes.STRING(160), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      },
      { transaction },
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))",
      { transaction },
    );
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email))",
      { transaction },
    );

    await queryInterface.createTable(
      "crime_reports",
      {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        },
        title: { type: DataTypes.STRING(180), allowNull: true },
        category: { type: DataTypes.STRING(100), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        location: { type: DataTypes.STRING(300), allowNull: false },
        state: { type: DataTypes.STRING(100), allowNull: true },
        district: { type: DataTypes.STRING(120), allowNull: true },
        latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
        longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
        incident_date: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "UNVERIFIED" },
        confidence: { type: DataTypes.STRING(20), allowNull: true },
        evidence_url: { type: DataTypes.STRING(500), allowNull: true },
        evidence_original_name: { type: DataTypes.STRING(255), allowNull: true },
        evidence_mime_type: { type: DataTypes.STRING(120), allowNull: true },
        evidence_size: { type: DataTypes.BIGINT, allowNull: true },
        share_description: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        admin_notes: { type: DataTypes.TEXT, allowNull: true },
        reviewed_at: { type: DataTypes.DATE, allowNull: true },
        reviewed_by_user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      },
      { transaction },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE crime_reports ADD CONSTRAINT crime_reports_status_check CHECK (status IN (${reportStatuses}))`,
      { transaction },
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE crime_reports ADD CONSTRAINT crime_reports_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90)",
      { transaction },
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE crime_reports ADD CONSTRAINT crime_reports_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)",
      { transaction },
    );

    await queryInterface.addIndex("crime_reports", ["user_id", "created_at"], {
      name: "crime_reports_user_created_idx",
      transaction,
    });
    await queryInterface.addIndex("crime_reports", ["status", "created_at"], {
      name: "crime_reports_status_created_idx",
      transaction,
    });
    await queryInterface.addIndex("crime_reports", ["state", "district"], {
      name: "crime_reports_state_district_idx",
      transaction,
    });

}
