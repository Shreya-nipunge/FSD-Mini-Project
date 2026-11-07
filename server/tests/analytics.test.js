import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  AnalyticsDataError,
  computeByType,
  computeCrimes,
  computeHotspots,
  computeSafetyScoreAndTrends,
  computeSummary,
  computeTrend,
  createAnalyticsService,
} from "../services/analyticsService.js";

const csvFixture = [
  "district,year,lat,lng,murder,robbery,thefts,vehicle_theft,burglary,cheating,rape,crime_score",
  "Alpha,2021,10,20,1,2,3,0,1,0,0,22",
  "Alpha,2022,10,20,2,4,6,1,2,1,0,40",
  "Beta,2021,30,40,0,1,4,2,1,0,1,25",
  "Beta,2022,30,40,1,3,20,3,2,2,1,73",
].join("\n");

let temporaryDataDirectory;
let service;

before(async () => {
  temporaryDataDirectory = await mkdtemp(path.join(os.tmpdir(), "crimemap-analytics-"));
  await mkdir(path.join(temporaryDataDirectory, "processed"), { recursive: true });
  await writeFile(path.join(temporaryDataDirectory, "district_coords.json"), JSON.stringify({ "Test State": { Alpha: [10, 20], Beta: [30, 40] } }));
  await writeFile(path.join(temporaryDataDirectory, "processed", "test state_crimes_processed.csv"), csvFixture);
  service = createAnalyticsService({ dataDirectory: temporaryDataDirectory });
});

after(async () => {
  if (temporaryDataDirectory) await rm(temporaryDataDirectory, { recursive: true, force: true });
});

test("loads processed CSV rows from configured data directory and caches them", async () => {
  const rows = await service.getData("test state");
  assert.equal(rows.length, 4);
  assert.equal(rows[0].district, "Alpha");
  assert.equal(rows[0].crime_score, "22");
  assert.deepEqual(await service.getStates(), ["Test State"]);
});

test("crime grouping, state/district filtering, and crime category filtering match legacy behavior", () => {
  const rawRows = [
    { district: "Alpha", year: "2021", murder: "1", robbery: "2", thefts: "3", vehicle_theft: "0", burglary: "1", cheating: "0", rape: "0", crime_score: "22" },
    { district: "Alpha", year: "2022", murder: "2", robbery: "4", thefts: "6", vehicle_theft: "1", burglary: "2", cheating: "1", rape: "0", crime_score: "40" },
    { district: "Beta", year: "2022", murder: "1", robbery: "3", thefts: "20", vehicle_theft: "3", burglary: "2", cheating: "2", rape: "1", crime_score: "73" },
  ];
  const allYears = computeCrimes(rawRows, { state: "Test State" });
  assert.equal(allYears.total, 2);
  assert.equal(allYears.data.find((row) => row.district === "Alpha").crime_score, 62);
  assert.equal(computeCrimes(rawRows, { state: "Test State", year: "2022", region: "alp" }).total, 1);
  assert.equal(computeCrimes(rawRows, { state: "Test State", crime_type: "Crimes Against Women" }).total, 1);
  assert.equal(computeCrimes(rawRows, { state: "Test State", crime_type: "Theft & Robbery" }).total, 2);
});

test("summary, category distribution, trends, hotspots, and safety scores preserve legacy calculations", async () => {
  const rows = await service.getData("Test State");
  const summaryRows = rows.filter((row) => row.year === "2022");
  assert.deepEqual(computeSummary(summaryRows, "Test State"), {
    total_incidents: 113,
    top_crime: "Thefts",
    hottest_zone: "Beta",
    under_investigation: 0,
  });
  assert.deepEqual(computeByType(summaryRows), {
    labels: ["Crimes Against Women", "Crimes Against Children", "Theft & Robbery", "Murder / Homicide", "Assault / Hurt", "Cyber Crime", "Drug / Narcotics", "Riots / Public Order", "Other IPC Crimes"],
    values: [16, 11, 16, 22, 16, 11, 11, 11, 5],
  });
  assert.deepEqual(computeTrend(rows), [{ month: "2021", count: 47 }, { month: "2022", count: 113 }]);
  assert.equal(computeHotspots(rows, "Test State")[0].station, "Beta");
  assert.equal(computeSafetyScoreAndTrends(rows, "Alpha").score, 54);
  assert.equal(computeSafetyScoreAndTrends(rows, "Alpha").risk, "Moderate");
  assert.equal(computeSafetyScoreAndTrends(rows, "Alpha").trend, "Increasing");
  assert.equal(computeSafetyScoreAndTrends(rows, "Missing").rank, 0);
});

test("map report signals are kept as separate enrichment and not inserted into crime rows", async () => {
  const withReports = createAnalyticsService({
    dataDirectory: temporaryDataDirectory,
    reportsProvider: async () => Array.from({ length: 5 }, () => ({ district: "Alpha", status: "UNVERIFIED" })),
  });
  const result = await withReports.crimes({ state: "Test State", year: "2022" });
  const alpha = result.data.find((row) => row.district === "Alpha");
  assert.equal(alpha.admin_responsiveness, "LOW");
  assert.equal(alpha.response_rate, 0);
  assert.equal(alpha.crime_score, "40");
  assert.equal("reportedBy" in alpha, false);
});

test("missing CSV data and invalid state parameters return explicit service errors", async () => {
  const missing = createAnalyticsService({ dataDirectory: path.join(temporaryDataDirectory, "missing") });
  await assert.rejects(missing.getData("Test State"), (error) => error instanceof AnalyticsDataError && error.status === 503 && /unavailable/.test(error.message));
  await assert.rejects(service.getData("../../outside"), (error) => error instanceof AnalyticsDataError && error.status === 400);
});
