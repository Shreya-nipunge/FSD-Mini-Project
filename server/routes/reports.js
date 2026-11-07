import { Router } from "express";
import { body, param } from "express-validator";
import {
  createReport,
  deleteReport,
  getReport,
  getReportEvidence,
  listMyReports,
  listReports,
  rejectReport,
  reviewReport,
  updateReport,
  verifyReport,
} from "../controllers/reportController.js";
import { authenticate, optionalAuthenticate, requireAdmin } from "../middleware/auth.js";
import { reportUpload, verifyEvidenceContent } from "../middleware/reportUpload.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const createRules = [
  body("category").custom((_value, { req }) => {
    const category = req.body.category ?? req.body.crime_type;
    return typeof category === "string" && category.trim().length >= 1 && category.trim().length <= 100;
  }).withMessage("A category between 1 and 100 characters is required"),
  body("description").isString().withMessage("Description is required").trim().isLength({ min: 1, max: 10000 }).withMessage("Description must be between 1 and 10000 characters"),
  body("location").isString().withMessage("Location is required").trim().isLength({ min: 1, max: 300 }).withMessage("Location must be between 1 and 300 characters"),
  body("title").optional({ nullable: true }).isString().isLength({ max: 180 }),
  body("state").optional({ nullable: true }).isString().isLength({ max: 100 }),
  body("district").optional({ nullable: true }).isString().isLength({ max: 120 }),
  body(["latitude", "lat"]).optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body(["longitude", "lng"]).optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body(["incidentDate", "incident_date"]).optional({ checkFalsy: true }).isISO8601().withMessage("Incident date must be a valid date"),
  body(["shareDescription", "share_description"]).optional().custom((value) => [true, false, "true", "false", "1", "0"].includes(value)),
];

const updateRules = [
  body("title").optional({ nullable: true }).isString().isLength({ max: 180 }),
  body("category").optional().isString().trim().isLength({ min: 1, max: 100 }),
  body("crime_type").optional().isString().trim().isLength({ min: 1, max: 100 }),
  body("description").optional().isString().trim().isLength({ min: 1, max: 10000 }),
  body("location").optional().isString().trim().isLength({ min: 1, max: 300 }),
  body("state").optional({ nullable: true }).isString().isLength({ max: 100 }),
  body("district").optional({ nullable: true }).isString().isLength({ max: 120 }),
  body(["latitude", "lat"]).optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body(["longitude", "lng"]).optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body(["incidentDate", "incident_date"]).optional({ checkFalsy: true }).isISO8601(),
  body(["shareDescription", "share_description"]).optional().custom((value) => [true, false, "true", "false", "1", "0"].includes(value)),
];

const reportId = param("id").isUUID().withMessage("Report ID must be a valid UUID");
const runValidation = validateRequest;
const createRoute = [authenticate, reportUpload.single("image"), verifyEvidenceContent, createRules, runValidation, asyncHandler(createReport)];
const publicListRoute = [optionalAuthenticate, asyncHandler(listReports)];
const adminAction = [authenticate, requireAdmin];

router.post(["/reports", "/complaints"], createRoute);
router.get(["/reports/mine", "/my-complaints"], authenticate, asyncHandler(listMyReports));
router.get(["/reports", "/complaints"], publicListRoute);
router.get(["/reports/:id/evidence", "/complaints/:id/evidence"], authenticate, reportId, runValidation, asyncHandler(getReportEvidence));
router.get(["/reports/:id", "/complaints/:id"], optionalAuthenticate, reportId, runValidation, asyncHandler(getReport));
router.patch(["/reports/:id", "/complaints/:id"], authenticate, reportId, runValidation, updateRules, runValidation, asyncHandler(updateReport));
router.delete(["/reports/:id", "/complaints/:id"], authenticate, reportId, runValidation, asyncHandler(deleteReport));

router.patch(["/reports/:id/review", "/complaints/:id/review"], ...adminAction, reportId, runValidation, asyncHandler(reviewReport));
router.patch(["/reports/:id/verify", "/complaints/:id/verify"], ...adminAction, reportId, runValidation, asyncHandler(verifyReport));
router.patch(
  ["/reports/:id/reject", "/complaints/:id/reject"],
  ...adminAction,
  reportId,
  body(["reason", "admin_notes"]).custom((value, { req }) => {
    const reason = req.body.reason ?? req.body.admin_notes;
    return typeof reason === "string" && reason.trim().length >= 3 && reason.trim().length <= 2000;
  }).withMessage("A rejection reason between 3 and 2000 characters is required"),
  runValidation,
  asyncHandler(rejectReport),
);

export default router;
