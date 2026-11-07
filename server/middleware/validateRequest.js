import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Request validation failed",
        details: errors.array().map(({ path, param, msg }) => ({ field: path || param, message: msg })),
      },
      detail: "Request validation failed",
    });
  }
  next();
}
