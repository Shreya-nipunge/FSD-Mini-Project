import fs from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";
import { CrimeReport } from "../models/index.js";
import { sanitizeEvidenceOriginalName, uploadDirectory } from "../middleware/reportUpload.js";

const hiddenStatuses = ["REJECTED", "rejected"];
const editableStatuses = ["UNVERIFIED", "pending"];
const reviewableStatuses = ["UNVERIFIED", "UNDER_REVIEW", "pending"];

function reportView(report, { publicView = false, adminView = false, ownView = false } = {}) {
  const row = report.get({ plain: true });
  const descriptionVisible = ownView || adminView || row.shareDescription;
  const output = {
    id: row.id,
    title: row.title,
    category: row.category,
    crime_type: row.category,
    description: descriptionVisible ? row.description : null,
    location: row.location,
    state: row.state,
    district: row.district,
    latitude: row.latitude,
    longitude: row.longitude,
    lat: row.latitude,
    lng: row.longitude,
    incidentDate: row.incidentDate,
    status: row.status,
    confidence: row.confidence,
    shareDescription: row.shareDescription,
    share_description: row.shareDescription,
    createdAt: row.createdAt,
    created_at: row.createdAt,
    updatedAt: row.updatedAt,
    age_hours: Math.max(0, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 360000) / 10),
  };

  if (!publicView) {
    output.evidence_url = row.evidenceUrl;
    output.evidence_original_name = row.evidenceOriginalName;
    output.evidence_mime_type = row.evidenceMimeType;
    output.evidence_size = row.evidenceSize;
  }
  if (ownView || adminView) {
    output.admin_notes = row.adminNotes;
    output.rejection_reason = row.adminNotes;
    output.reviewed_at = row.reviewedAt;
    output.reporter_id = row.userId;
  }
  if (adminView && report.reporter) {
    output.name = report.reporter.name;
    output.email = report.reporter.email;
  }
  return output;
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function reportNotFound() {
  return Object.assign(new Error("Report not found"), { status: 404 });
}

function forbidden(message = "You do not have permission to access this report") {
  return Object.assign(new Error(message), { status: 403 });
}

export async function createReport(req, res) {
  const body = req.body || {};
  const category = body.category ?? body.crime_type;
  const latitude = optionalNumber(body.latitude ?? body.lat);
  const longitude = optionalNumber(body.longitude ?? body.lng);
  const shareDescription = normalizeBoolean(body.shareDescription ?? body.share_description, true);

  if (Number.isNaN(latitude) || Number.isNaN(longitude) || shareDescription === null) {
    return res.status(400).json({ success: false, error: { message: "Invalid coordinates or privacy preference" }, detail: "Invalid coordinates or privacy preference" });
  }

  let report;
  try {
    report = await CrimeReport.create({
      userId: req.currentUser.id,
      title: typeof body.title === "string" ? body.title.trim() || null : null,
      category: category.trim(),
      description: body.description.trim(),
      location: body.location.trim(),
      state: typeof body.state === "string" ? body.state.trim() || null : null,
      district: typeof body.district === "string" ? body.district.trim() || null : null,
      latitude,
      longitude,
      incidentDate: body.incidentDate || body.incident_date || null,
      status: "UNVERIFIED",
      confidence: "LOW",
      evidenceUrl: req.file ? path.relative(uploadDirectory, req.file.path).split(path.sep).join("/") : null,
      evidenceOriginalName: req.file ? sanitizeEvidenceOriginalName(req.file.originalname) : null,
      evidenceMimeType: req.file?.mimetype || null,
      evidenceSize: req.file?.size || null,
      shareDescription,
    });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }

  const responseReport = reportView(report, { ownView: true });
  res.status(201).json({
    success: true,
    data: { report: responseReport },
    report: responseReport,
    id: report.id,
    message: "Report submitted successfully",
  });
}

export async function listReports(req, res) {
  const asksForRejected = ["true", "1"].includes(String(req.query.include_rejected || req.query.includeRejected).toLowerCase());
  const adminView = Boolean(req.currentUser?.role === "admin" && asksForRejected);
  if (asksForRejected && !req.currentUser) {
    return res.status(401).json({ success: false, error: { message: "Authentication required" }, detail: "Authentication required" });
  }
  if (asksForRejected && !adminView) throw forbidden("Administrator access is required to include rejected reports");

  const where = {};
  const filters = [];
  if (!adminView) filters.push({ status: { [Op.notIn]: hiddenStatuses } });
  if (req.query.state && req.query.state.toLowerCase() !== "all") where.state = req.query.state;
  if (req.query.status) filters.push({ status: req.query.status });
  if (filters.length) where[Op.and] = filters;

  const reports = await CrimeReport.findAll({
    where,
    include: adminView ? [{ association: "reporter", attributes: ["id", "name", "email"] }] : [],
    order: [["createdAt", "DESC"]],
  });
  const safeReports = reports.map((report) => reportView(report, { publicView: !adminView, adminView }));
  res.json({ success: true, data: { reports: safeReports, total: safeReports.length }, reports: safeReports, complaints: safeReports, total: safeReports.length });
}

export async function listMyReports(req, res) {
  const reports = await CrimeReport.findAll({
    where: { userId: req.currentUser.id },
    order: [["createdAt", "DESC"]],
  });
  const safeReports = reports.map((report) => reportView(report, { ownView: true }));
  res.json({ success: true, data: { reports: safeReports, total: safeReports.length }, reports: safeReports, complaints: safeReports, total: safeReports.length });
}

export async function getReport(req, res) {
  const report = await CrimeReport.findByPk(req.params.id, {
    include: req.currentUser?.role === "admin" ? [{ association: "reporter", attributes: ["id", "name", "email"] }] : [],
  });
  if (!report) throw reportNotFound();

  const ownView = req.currentUser?.id === report.userId;
  const adminView = req.currentUser?.role === "admin";
  if (!ownView && !adminView && hiddenStatuses.includes(report.status)) throw reportNotFound();
  const safeReport = reportView(report, { publicView: !ownView && !adminView, ownView, adminView });
  res.json({ success: true, data: { report: safeReport }, report: safeReport });
}

export async function getReportEvidence(req, res, next) {
  const report = await CrimeReport.findByPk(req.params.id);
  if (!report) throw reportNotFound();
  if (report.userId !== req.currentUser.id && req.currentUser.role !== "admin") throw forbidden();
  if (!report.evidenceUrl || !report.evidenceMimeType) throw reportNotFound();

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const filename = report.evidenceUrl;
  const absolutePath = path.resolve(uploadDirectory, filename);
  const relativePath = path.relative(uploadDirectory, absolutePath);
  if (!allowedTypes.has(report.evidenceMimeType) || path.basename(filename) !== filename || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw reportNotFound();
  }

  try {
    await fs.access(absolutePath);
  } catch {
    throw reportNotFound();
  }

  res.set({
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": "inline",
  });
  res.type(report.evidenceMimeType);
  res.sendFile(absolutePath, { dotfiles: "deny" }, (error) => {
    if (error && !res.headersSent) next(error);
  });
}

export async function updateReport(req, res) {
  const report = await CrimeReport.findByPk(req.params.id);
  if (!report) throw reportNotFound();
  if (report.userId !== req.currentUser.id) throw forbidden();
  if (!editableStatuses.includes(report.status)) {
    return res.status(409).json({ success: false, error: { message: "Only unreviewed reports can be edited" }, detail: "Only unreviewed reports can be edited" });
  }

  const allowedFields = new Set(["title", "category", "crime_type", "description", "location", "state", "district", "latitude", "longitude", "lat", "lng", "incidentDate", "incident_date", "shareDescription", "share_description"]);
  const unexpected = Object.keys(req.body || {}).filter((field) => !allowedFields.has(field));
  if (unexpected.length) {
    return res.status(400).json({ success: false, error: { message: "Report status and review fields cannot be changed here" }, detail: "Report status and review fields cannot be changed here" });
  }

  const body = req.body || {};
  if (body.title !== undefined) report.title = body.title.trim() || null;
  if (body.category !== undefined || body.crime_type !== undefined) report.category = String(body.category ?? body.crime_type).trim();
  for (const field of ["description", "location", "state", "district"]) {
    if (body[field] !== undefined) report[field] = String(body[field]).trim();
  }
  if (body.latitude !== undefined || body.lat !== undefined) report.latitude = optionalNumber(body.latitude ?? body.lat);
  if (body.longitude !== undefined || body.lng !== undefined) report.longitude = optionalNumber(body.longitude ?? body.lng);
  if (body.incidentDate !== undefined || body.incident_date !== undefined) report.incidentDate = body.incidentDate ?? body.incident_date;
  if (body.shareDescription !== undefined || body.share_description !== undefined) {
    const share = normalizeBoolean(body.shareDescription ?? body.share_description);
    if (share === null) return res.status(400).json({ success: false, error: { message: "Invalid privacy preference" }, detail: "Invalid privacy preference" });
    report.shareDescription = share;
  }

  await report.save();
  const safeReport = reportView(report, { ownView: true });
  res.json({ success: true, data: { report: safeReport }, report: safeReport, message: "Report updated" });
}

export async function deleteReport(req, res) {
  const report = await CrimeReport.findByPk(req.params.id);
  if (!report) throw reportNotFound();
  const isAdmin = req.currentUser.role === "admin";
  if (!isAdmin && report.userId !== req.currentUser.id) throw forbidden();
  if (!isAdmin && !editableStatuses.includes(report.status)) {
    return res.status(409).json({ success: false, error: { message: "Only unreviewed reports can be deleted" }, detail: "Only unreviewed reports can be deleted" });
  }

  await report.destroy();
  res.json({ success: true, message: "Report deleted" });
}

async function transitionReport(req, res, status, needsReason = false) {
  const report = await CrimeReport.findByPk(req.params.id);
  if (!report) throw reportNotFound();
  if (!reviewableStatuses.includes(report.status)) {
    return res.status(409).json({ success: false, error: { message: "This report cannot transition from its current status" }, detail: "This report cannot transition from its current status" });
  }

  const reason = req.body?.reason ?? req.body?.admin_notes;
  if (needsReason && (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 2000)) {
    return res.status(400).json({ success: false, error: { message: "A rejection reason between 3 and 2000 characters is required" }, detail: "A rejection reason between 3 and 2000 characters is required" });
  }

  report.status = status;
  report.confidence = status === "VERIFIED" ? "HIGH" : status === "UNDER_REVIEW" ? "MEDIUM" : "LOW";
  report.reviewedAt = new Date();
  report.reviewedByUserId = req.currentUser.id;
  if (needsReason) report.adminNotes = reason.trim();
  await report.save();

  const safeReport = reportView(report, { adminView: true });
  res.json({ success: true, data: { report: safeReport }, report: safeReport, message: `Report is now ${status}` });
}

export const reviewReport = (req, res) => transitionReport(req, res, "UNDER_REVIEW");
export const verifyReport = (req, res) => transitionReport(req, res, "VERIFIED");
export const rejectReport = (req, res) => transitionReport(req, res, "REJECTED", true);
