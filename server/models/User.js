import { DataTypes, Model } from "sequelize";

export class User extends Model {}

export function initializeUser(sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: true, len: [2, 120] },
      },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        unique: true,
        validate: { isEmail: true, notEmpty: true },
        set(value) {
          this.setDataValue("email", value?.trim().toLowerCase());
        },
      },
      passwordHash: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "password_hash",
        validate: { notEmpty: true, len: [20, 100] },
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "user",
        validate: { isIn: [["user", "admin"]] },
      },
      adminRole: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: "admin_role",
      },
      organization: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      underscored: true,
      defaultScope: { attributes: { exclude: ["passwordHash"] } },
      scopes: { withPasswordHash: { attributes: { include: ["passwordHash"] } } },
    },
  );

  return User;
}
