import { CrimeReport } from "../models/index.js";
import { createAnalyticsService } from "../services/analyticsService.js";

async function reportSignals() {
  if (!CrimeReport.sequelize) return [];
  return CrimeReport.findAll({ attributes: ["district", "status"], raw: true });
}

const service = createAnalyticsService({ reportsProvider: reportSignals });

export async function getCrimes(req, res) {
  res.json(await service.crimes(req.query));
}

export async function getSummary(req, res) {
  res.json(await service.summary(req.query.state, req.query.year));
}

export async function getByType(req, res) {
  res.json(await service.byType(req.query.state, req.query.year));
}

export async function getTrend(req, res) {
  res.json(await service.trend(req.query.state));
}

export async function getHotspots(req, res) {
  res.json(await service.hotspots(req.query.state, req.query.year));
}

export async function getSafetyScore(req, res) {
  res.json(await service.safetyScore(req.query.district, req.query.state));
}

export async function getAdminInsights(req, res) {
  res.json(await service.adminInsights(req.query.state, req.query.year));
}

export async function getInsights(req, res) {
  res.json(await service.insights(req.query.state));
}

export async function getBenchmarks(_req, res) {
  res.json(await service.benchmarks());
}

export async function getStates(_req, res) {
  const states = await service.getStates();
  res.json({ states, total: states.length });
}
