import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";
import { User } from "../models/index.js";

const BCRYPT_ROUNDS = 12;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("Authentication is not configured");
    error.status = 500;
    throw error;
  }
  return secret;
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    adminRole: user.adminRole,
    organization: user.organization,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: "8h",
  });
}

function authResponse(user) {
  const token = createToken(user);
  const safeUser = publicUser(user);
  return {
    success: true,
    data: { token, user: safeUser },
    // Kept for the current React auth forms until their integration milestone.
    access_token: token,
    token_type: "bearer",
    role: user.role,
    name: user.name,
  };
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user",
    });
    return authResponse(user);
  } catch (error) {
    if (error instanceof UniqueConstraintError || error.name === "SequelizeUniqueConstraintError") {
      const conflict = new Error("An account with this email already exists");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function loginUser({ email, password, expectedRole }) {
  const user = await User.scope("withPasswordHash").findOne({
    where: { email: email.trim().toLowerCase() },
  });

  const passwordMatches = user?.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  if (!user || !passwordMatches || !user.isActive || (expectedRole && user.role !== expectedRole)) {
    const error = new Error("Email or password is incorrect");
    error.status = 401;
    throw error;
  }

  return authResponse(user);
}
