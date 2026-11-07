import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("Authentication is not configured");
    error.status = 500;
    throw error;
  }
  return secret;
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.get("authorization") || "";
  const [scheme, token, extra] = header.split(" ");
  if (scheme !== "Bearer" || !token || extra) {
    return res.status(401).json({ success: false, error: { message: "Authentication required" }, detail: "Authentication required" });
  }

  let payload;
  const secret = jwtSecret();
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ success: false, error: { message: "Invalid or expired token" }, detail: "Invalid or expired token" });
  }

  if (!payload?.sub) {
    return res.status(401).json({ success: false, error: { message: "Invalid or expired token" }, detail: "Invalid or expired token" });
  }

  const user = await User.findByPk(payload.sub);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, error: { message: "Invalid or inactive account" }, detail: "Invalid or inactive account" });
  }

  // Authorization always uses the current database role, not the role in the JWT.
  req.currentUser = user;
  next();
});

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ success: false, error: { message: "Authentication required" }, detail: "Authentication required" });
    }
    if (req.currentUser.role !== role) {
      return res.status(403).json({ success: false, error: { message: "Insufficient permissions" }, detail: "Insufficient permissions" });
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireUser = requireRole("user");

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get("authorization");
  if (!header) return next();

  const [scheme, token, extra] = header.split(" ");
  if (scheme !== "Bearer" || !token || extra) {
    return next(Object.assign(new Error("Invalid authorization header"), { status: 401 }));
  }

  let payload;
  const secret = jwtSecret();
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return next(Object.assign(new Error("Invalid or expired token"), { status: 401 }));
  }

  if (payload?.sub) {
    const user = await User.findByPk(payload.sub);
    if (user?.isActive) req.currentUser = user;
  }
  next();
});
