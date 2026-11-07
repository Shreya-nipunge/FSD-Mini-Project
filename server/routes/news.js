import { Router } from "express";
import { query } from "express-validator";
import { getNews } from "../controllers/newsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(["/news", "/news/"], query("q").optional().isString().trim().isLength({ min: 1, max: 80 }).matches(/^[\p{L}\p{N}\s.,'&()\-]+$/u).withMessage("Search query contains invalid characters"), validateRequest, asyncHandler(getNews));

export default router;
