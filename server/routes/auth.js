import { Router } from "express";
import { body } from "express-validator";
import { login, me, register, rejectAdminRegistration } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const emailRule = body("email")
  .isString().withMessage("Email is required")
  .trim()
  .isEmail().withMessage("Enter a valid email")
  .normalizeEmail({ all_lowercase: true, gmail_remove_dots: false, gmail_remove_subaddress: false });

const passwordRule = body("password")
  .isString().withMessage("Password is required")
  .isLength({ min: 10, max: 72 }).withMessage("Password must be between 10 and 72 characters")
  .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
  .withMessage("Password must be no more than 72 bytes");

const registerRules = [
  body("name").isString().withMessage("Name is required").trim().isLength({ min: 2, max: 120 }).withMessage("Name must be between 2 and 120 characters"),
  emailRule,
  passwordRule,
];
const loginRules = [
  emailRule,
  body("password")
    .isString().withMessage("Password is required")
    .isLength({ max: 72 }).withMessage("Password is too long")
    .custom((value) => Buffer.byteLength(value, "utf8") <= 72).withMessage("Password is too long")
    .notEmpty(),
];

router.post(["/auth/register", "/register-user"], registerRules, validateRequest, asyncHandler(register));
router.post("/register-admin", rejectAdminRegistration);
router.post("/auth/login", loginRules, validateRequest, asyncHandler(login));

router.post("/login-user", loginRules, validateRequest, (req, _res, next) => {
  req.authRole = "user";
  next();
}, asyncHandler(login));
router.post("/login-admin", loginRules, validateRequest, (req, _res, next) => {
  req.authRole = "admin";
  next();
}, asyncHandler(login));

router.get("/auth/me", authenticate, me);

export default router;
