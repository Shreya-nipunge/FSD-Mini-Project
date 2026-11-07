import { Router } from "express";
import { query } from "express-validator";
import {
  getAdminInsights,
  getBenchmarks,
  getByType,
  getCrimes,
  getHotspots,
  getInsights,
  getSafetyScore,
  getStates,
  getSummary,
  getTrend,
} from "../controllers/analyticsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const stateRule = query("state").optional().isString().trim().isLength({ min: 1, max: 100 });
const yearRule = query("year").optional().matches(/^\d{4}$/).withMessage("Year must be a four-digit year");
const commonRules = [stateRule, yearRule];

router.get("/states", asyncHandler(getStates));
router.get("/crimes", commonRules, query("region").optional().isString().trim().isLength({ max: 120 }), query("crime_type").optional().isIn(["", "Murder / Homicide", "Theft & Robbery", "Other IPC Crimes", "Crimes Against Women"]), query("view_mode").optional().isIn(["micro", "macro"]), validateRequest, asyncHandler(getCrimes));
router.get("/summary", commonRules, validateRequest, asyncHandler(getSummary));
router.get("/by-type", commonRules, validateRequest, asyncHandler(getByType));
router.get("/trend", stateRule, validateRequest, asyncHandler(getTrend));
router.get("/hotspots", commonRules, validateRequest, asyncHandler(getHotspots));
router.get("/safety-score", query("district").isString().trim().isLength({ min: 1, max: 120 }), stateRule, validateRequest, asyncHandler(getSafetyScore));
router.get("/admin/insights", commonRules, validateRequest, asyncHandler(getAdminInsights));
router.get("/analytics/insights", stateRule, validateRequest, asyncHandler(getInsights));
router.get("/analytics/benchmarks", asyncHandler(getBenchmarks));

export default router;
