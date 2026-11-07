import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDataDirectory = path.join(projectRoot, "backend", "data");
const numericColumns = ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"];
const crimeKeys = ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"];
const metricNames = ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"];
const crimeCategories = {
  "Murder / Homicide": ["murder"],
  "Theft & Robbery": ["robbery", "thefts", "vehicle_theft"],
  "Other IPC Crimes": ["burglary", "cheating"],
  "Crimes Against Women": ["rape"],
};

export class AnalyticsDataError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = "AnalyticsDataError";
    this.status = status;
  }
}

export const STATE_CENTROIDS = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.218, 94.7278],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  Chhattisgarh: [21.2787, 81.8661],
  Goa: [15.2993, 74.124],
  Gujarat: [22.2587, 71.1924],
  Haryana: [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jammu And Kashmir": [33.7782, 76.5762],
  Jharkhand: [23.6102, 85.2799],
  Karnataka: [15.3173, 75.7139],
  Kerala: [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  Maharashtra: [19.7515, 75.7139],
  Manipur: [24.6637, 93.9063],
  Meghalaya: [25.467, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Odisha: [20.9517, 85.0985],
  Punjab: [31.1471, 75.3412],
  Rajasthan: [27.0238, 74.2179],
  Sikkim: [27.533, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  Telangana: [18.1124, 79.0193],
  Tripura: [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  Uttarakhand: [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.855],
  "Andaman And Nicobar Islands": [11.7401, 92.6586],
  Chandigarh: [30.7333, 76.7794],
  "The Dadra And Nagar Haveli And Daman And Diu": [20.3974, 72.8328],
  Delhi: [28.7041, 77.1025],
  Lakshadweep: [10.5667, 72.6417],
  Puducherry: [11.9416, 79.8083],
  Ladakh: [34.1526, 77.577],
};

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const intValue = (value) => {
  const parsed = Number.parseInt(value ?? 0, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

function safeFilename(state) {
  const filename = `${state.toLowerCase()}_crimes_processed.csv`;
  if (path.basename(filename) !== filename) throw new AnalyticsDataError("Invalid state parameter", 400);
  return filename;
}

function filterYear(data, year) {
  return year ? data.filter((row) => String(row.year) === String(year)) : data;
}

export function computeCrimes(data, { state = "Maharashtra", region, crime_type: crimeType, year, view_mode: viewMode = "micro" } = {}) {
  let rows = filterYear(data, year);

  if (viewMode === "macro") {
    const aggregated = new Map();
    for (const row of rows) {
      const stateName = row.state_name || state.replace(/\b\w/g, (letter) => letter.toUpperCase());
      if (!aggregated.has(stateName)) {
        const [lat, lng] = STATE_CENTROIDS[stateName] || [20, 78];
        aggregated.set(stateName, {
          district: stateName,
          state_name: stateName,
          lat,
          lng,
          crime_score: 0,
          is_macro: true,
          murder: 0,
          robbery: 0,
          thefts: 0,
          vehicle_theft: 0,
          burglary: 0,
          cheating: 0,
          rape: 0,
        });
      }
      const target = aggregated.get(stateName);
      target.crime_score += intValue(row.crime_score);
      for (const key of crimeKeys) target[key] += intValue(row[key]);
    }
    rows = [...aggregated.values()];
    return { data: rows, total: rows.length };
  }

  if (!year) {
    const aggregated = new Map();
    for (const row of rows) {
      const key = `${row.district}\u0000${row.state_name || state}`;
      if (!aggregated.has(key)) {
        const first = { ...row };
        for (const metric of metricNames) first[metric] = intValue(row[metric]);
        aggregated.set(key, first);
      } else {
        const target = aggregated.get(key);
        for (const metric of metricNames) target[metric] += intValue(row[metric]);
      }
    }
    rows = [...aggregated.values()];
  }

  if (region) rows = rows.filter((row) => String(row.district || "").toLowerCase().includes(region.toLowerCase()));
  const categoryColumns = crimeCategories[crimeType];
  if (categoryColumns) rows = rows.filter((row) => categoryColumns.some((column) => intValue(row[column]) > 0));
  return { data: rows, total: rows.length };
}

export function computeSummary(data, state = "Maharashtra") {
  const totalIncidents = data.reduce((total, row) => total + intValue(row.crime_score), 0);
  const totals = { murders: 0, robberies: 0, thefts: 0 };
  for (const row of data) {
    totals.murders += intValue(row.murder);
    totals.robberies += intValue(row.robbery);
    totals.thefts += intValue(row.thefts);
  }
  const topCrime = Object.values(totals).some((value) => value > 0)
    ? Object.keys(totals).reduce((best, key) => (totals[key] > totals[best] ? key : best), Object.keys(totals)[0])
    : "—";

  const districtScores = new Map();
  for (const row of data) {
    const stateName = row.state_name || state;
    const key = `${row.district}\u0000${stateName}`;
    districtScores.set(key, (districtScores.get(key) || 0) + intValue(row.crime_score));
  }
  let hottest = "—";
  let hottestScore = Number.NEGATIVE_INFINITY;
  for (const [key, score] of districtScores) {
    if (score > hottestScore) {
      const [district, stateName] = key.split("\u0000");
      hottest = state.toLowerCase() === "all" ? `${district} (${stateName})` : district;
      hottestScore = score;
    }
  }

  return {
    total_incidents: totalIncidents,
    top_crime: topCrime.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    hottest_zone: hottest,
    under_investigation: 0,
  };
}

export function computeByType(data) {
  const labels = ["Crimes Against Women", "Crimes Against Children", "Theft & Robbery", "Murder / Homicide", "Assault / Hurt", "Cyber Crime", "Drug / Narcotics", "Riots / Public Order", "Other IPC Crimes"];
  const totalScore = data.reduce((total, row) => total + intValue(row.crime_score), 0);
  const values = totalScore > 0
    ? [0.15, 0.1, 0.15, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05].map((share) => Math.trunc(totalScore * share))
    : Array(9).fill(0);
  return { labels, values };
}

export function computeTrend(data) {
  const yearly = new Map();
  for (const row of data) yearly.set(String(row.year), (yearly.get(String(row.year)) || 0) + intValue(row.crime_score));
  return [...yearly.keys()].sort(compareText).map((year) => ({ month: year, count: yearly.get(year) }));
}

export function computeHotspots(data, state = "Maharashtra") {
  const scores = new Map();
  for (const row of data) {
    const stateName = row.state_name || state;
    const key = `${row.district}\u0000${stateName}`;
    scores.set(key, (scores.get(key) || 0) + intValue(row.crime_score));
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, score], index) => {
      const [district, stateName] = key.split("\u0000");
      return {
        rank: index + 1,
        area: state.toLowerCase() === "all" ? `${district}, ${stateName}` : district,
        station: district,
        count: score,
        primary_crime: "Crime Score",
      };
    });
}

export function computeSafetyScoreAndTrends(data, targetDistrict) {
  if (!data.length) return { score: 0, risk: "Low", trend: "Stable", rank: 0, state_avg_diff: 0 };
  const latestYear = Math.max(...data.map((row) => intValue(row.year)));
  const latestScores = new Map();
  for (const row of data) if (intValue(row.year) === latestYear) latestScores.set(row.district, intValue(row.crime_score));
  if (!latestScores.size) return { score: 0, risk: "Low", trend: "Stable", rank: 0, state_avg_diff: 0 };

  const maxScore = Math.max(1, ...latestScores.values());
  const average = [...latestScores.values()].reduce((sum, score) => sum + score, 0) / latestScores.size;
  const targetScore = latestScores.get(targetDistrict) || 0;
  const normalized = Math.min(Math.trunc((targetScore / maxScore) * 100), 100);
  const risk = normalized >= 80 ? "High" : normalized >= 40 ? "Moderate" : "Low";
  const sorted = [...latestScores.entries()].sort((a, b) => a[1] - b[1]);
  const rank = sorted.findIndex(([district]) => district === targetDistrict) + 1;
  const difference = average > 0 ? Math.trunc(((targetScore - average) / average) * 100) : 0;
  const districtRows = data.filter((row) => row.district === targetDistrict).sort((a, b) => intValue(a.year) - intValue(b.year));
  let trend = "Stable";
  if (districtRows.length >= 2) {
    const last = intValue(districtRows.at(-1).crime_score);
    const previous = intValue(districtRows.at(-2).crime_score);
    if (last > previous) trend = "Increasing";
    else if (last < previous) trend = "Decreasing";
  }
  return { score: normalized, risk, rank, total: sorted.length, state_avg_diff: difference, trend, raw_score: targetScore };
}

export function getRisingCrimes(data) {
  if (!data.length) return [];
  const latestYear = Math.max(...data.map((row) => intValue(row.year)));
  const previousYear = latestYear - 1;
  const latest = Object.fromEntries(crimeKeys.map((key) => [key, 0]));
  const previous = Object.fromEntries(crimeKeys.map((key) => [key, 0]));
  let hasPrevious = false;
  for (const row of data) {
    const year = intValue(row.year);
    if (year === latestYear) for (const key of crimeKeys) latest[key] += intValue(row[key]);
    else if (year === previousYear) {
      hasPrevious = true;
      for (const key of crimeKeys) previous[key] += intValue(row[key]);
    }
  }
  if (!hasPrevious) {
    return crimeKeys.map((key) => ({ type: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), growth_pct: 0, latest: latest[key] }))
      .sort((a, b) => b.latest - a.latest).slice(0, 3);
  }
  return crimeKeys.map((key) => {
    const before = previous[key];
    const current = latest[key];
    const growth = before > 0 ? ((current - before) / before) * 100 : current > 0 ? 100 : 0;
    return { type: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), growth_pct: Math.trunc(growth), latest: current, prev: before };
  }).sort((a, b) => b.growth_pct - a.growth_pct).slice(0, 3);
}

export function getStateBenchmarks(allStateData) {
  const stats = [];
  for (const [stateName, data] of Object.entries(allStateData)) {
    if (!data.length) continue;
    const latestRows = data.filter((row) => String(row.year) === "2022");
    const previousRows = data.filter((row) => String(row.year) === "2021");
    if (!latestRows.length) continue;
    const averageScore = latestRows.reduce((sum, row) => sum + intValue(row.crime_score), 0) / latestRows.length;
    const latestTotal = latestRows.reduce((sum, row) => sum + intValue(row.crime_score), 0);
    const previousTotal = previousRows.length ? previousRows.reduce((sum, row) => sum + intValue(row.crime_score), 0) : latestTotal;
    const growth = previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : 0;
    const nsi = Math.trunc(Math.max(0, Math.min(100, 100 - (averageScore / 5000) * 100)));
    const trend = growth > 5 ? "increasing" : growth < -5 ? "decreasing" : "stable";
    stats.push({ state: stateName.replace(/\b\w/g, (letter) => letter.toUpperCase()), avg_score: averageScore, growth, nsi, trend });
  }
  stats.sort((a, b) => b.nsi - a.nsi);
  return stats.map((stat, index) => ({
    ...stat,
    rank: index + 1,
    insight: generateBenchmarkingInsight(stat),
  }));
}

function generateBenchmarkingInsight(stat) {
  const first = stat.nsi > 80
    ? `${stat.state} maintains a resilient safety profile.`
    : stat.nsi > 50
      ? `${stat.state} shows moderate concerns in urban clusters.`
      : `${stat.state} is under high alert due to incident density.`;
  const second = stat.trend === "decreasing"
    ? "Data shows a positive downward trend."
    : stat.trend === "increasing"
      ? "Recent uptick in reported activities."
      : "Security metrics remain stable.";
  return `${first} ${second}`;
}

function complaintSignal(complaints) {
  return complaints.reduce((score, row) => {
    if (["UNVERIFIED", "pending"].includes(row.status)) return score + 1;
    if (row.status === "UNDER_REVIEW") return score + 2;
    if (["VERIFIED", "resolved"].includes(row.status)) return score + 3;
    return score;
  }, 0);
}

export function getGapAlerts(crimeData, complaints) {
  const byDistrict = new Map();
  for (const complaint of complaints) {
    const district = complaint.district || "Unknown";
    if (!byDistrict.has(district)) byDistrict.set(district, []);
    byDistrict.get(district).push(complaint);
  }
  const alerts = [];
  for (const row of crimeData) {
    const districtComplaints = byDistrict.get(row.district) || [];
    const signal = complaintSignal(districtComplaints);
    const score = intValue(row.crime_score);
    if (signal >= 5 && score < 50) {
      alerts.push({
        district: row.district,
        state: row.state_name || "Unknown",
        complaint_count: districtComplaints.length,
        official_score: score,
        signal_strength: Math.min(100, signal * 10),
        severity: signal > 15 ? "CRITICAL" : "MODERATE",
      });
    }
  }
  return alerts;
}

export function getActionableIntelligence(dataList) {
  if (!dataList.length) return [];
  const latestByDistrict = new Map();
  const previousByDistrict = new Map();
  const categoryFor = (row) => intValue(row.murder) > 0 || intValue(row.rape) > 0
    ? "Violent"
    : intValue(row.cheating) > 0 ? "Financial" : "Property";
  for (const row of dataList) {
    const key = `${row.district}\u0000${row.state_name || "Unknown"}`;
    if (String(row.year) === "2022") latestByDistrict.set(key, { score: intValue(row.crime_score), category: categoryFor(row) });
    else if (String(row.year) === "2021") previousByDistrict.set(key, intValue(row.crime_score));
  }
  return [...latestByDistrict.entries()].map(([key, latest]) => {
    const [district, state] = key.split("\u0000");
    const previous = previousByDistrict.get(key) || 0;
    const growth = previous > 0 ? ((latest.score - previous) / previous) * 100 : latest.score > 0 ? 100 : 0;
    const growthPct = Math.trunc(growth);
    let priority;
    let status;
    let focus;
    if (growth > 15) {
      priority = "HIGH";
      status = "🔴";
      focus = `Immediate intervention required for rising ${latest.category} incidents in ${district}.`;
    } else if (growth > 5) {
      priority = "MODERATE";
      status = "🟡";
      focus = `Monitor ${latest.category} clusters in ${district} for further escalation.`;
    } else {
      priority = "STABLE";
      status = "🟢";
      focus = `Performance in ${district} (${latest.category}) remains stable relative to historical norms.`;
    }
    return {
      priority,
      status,
      district,
      state_name: state,
      category: latest.category,
      growth_pct: growthPct,
      observation: `${latest.category} shifted by ${growthPct}% in ${district} (2021 → 2022)`,
      suggested_focus: focus,
      time_range: "2021 → 2022",
    };
  }).sort((a, b) => b.growth_pct - a.growth_pct).slice(0, 5);
}

export function createAnalyticsService({ dataDirectory = defaultDataDirectory, reportsProvider = async () => [] } = {}) {
  const processedDirectory = path.join(dataDirectory, "processed");
  const coordinatesPath = path.join(dataDirectory, "district_coords.json");
  const fileCache = new Map();
  let coordinateCache;

  async function getCoordinates() {
    try {
      const fileStat = await stat(coordinatesPath);
      if (coordinateCache?.mtimeMs === fileStat.mtimeMs && coordinateCache.size === fileStat.size) return coordinateCache.value;
      const value = JSON.parse(await readFile(coordinatesPath, "utf8"));
      coordinateCache = { mtimeMs: fileStat.mtimeMs, size: fileStat.size, value };
      return value;
    } catch (error) {
      if (error.code === "ENOENT") throw new AnalyticsDataError("District coordinate data is unavailable");
      if (error instanceof SyntaxError) throw new AnalyticsDataError("District coordinate data is invalid");
      throw error;
    }
  }

  async function getStates() {
    return Object.keys(await getCoordinates()).sort(compareText);
  }

  async function resolveState(state) {
    if (state?.toLowerCase() === "all") return "all";
    const states = Object.keys(await getCoordinates());
    const canonical = states.find((name) => name.toLowerCase() === String(state || "Maharashtra").toLowerCase());
    if (!canonical) throw new AnalyticsDataError("Unknown state", 400);
    return canonical;
  }

  async function loadState(state) {
    const filename = safeFilename(state);
    const filePath = path.join(processedDirectory, filename);
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch (error) {
      if (error.code === "ENOENT") throw new AnalyticsDataError(`Crime dataset is unavailable for ${state}`);
      throw error;
    }
    const cached = fileCache.get(state.toLowerCase());
    if (cached?.mtimeMs === fileStat.mtimeMs && cached.size === fileStat.size) return cached.rows;
    try {
      const text = await readFile(filePath, "utf8");
      const rows = parse(text, { bom: true, columns: true, skip_empty_lines: true, trim: false });
      if (rows.length && !["district", "year", "lat", "lng", ...numericColumns].every((key) => Object.hasOwn(rows[0], key))) {
        throw new AnalyticsDataError(`Crime dataset columns are invalid for ${state}`);
      }
      fileCache.set(state.toLowerCase(), { mtimeMs: fileStat.mtimeMs, size: fileStat.size, rows });
      return rows;
    } catch (error) {
      if (error instanceof AnalyticsDataError) throw error;
      throw new AnalyticsDataError(`Crime dataset could not be parsed for ${state}`);
    }
  }

  async function getData(state = "Maharashtra") {
    const canonical = await resolveState(state);
    if (canonical !== "all") return loadState(canonical);
    const states = await getStates();
    const datasets = await Promise.all(states.map(async (stateName) => ({
      stateName,
      rows: await loadState(stateName),
    })));
    return datasets.flatMap(({ stateName, rows }) => rows.map((row) => ({ ...row, state_name: stateName })));
  }

  async function enrichedRows(state) {
    const rows = await getData(state);
    if (state.toLowerCase() === "all") return rows;
    const reports = await reportsProvider();
    const byDistrict = new Map();
    for (const report of reports) {
      const district = report.district || "Unknown";
      if (!byDistrict.has(district)) byDistrict.set(district, []);
      byDistrict.get(district).push(report);
    }
    return rows.map((row) => {
      const reportsForDistrict = byDistrict.get(row.district) || [];
      let pending = 0;
      let underReview = 0;
      let verified = 0;
      for (const report of reportsForDistrict) {
        if (["UNVERIFIED", "pending"].includes(report.status)) pending += 1;
        else if (report.status === "UNDER_REVIEW") underReview += 1;
        else if (["VERIFIED", "resolved"].includes(report.status)) verified += 1;
      }
      const total = pending + underReview + verified;
      const responseRate = total ? (underReview + verified) / total : 0;
      const responsiveness = total >= 5 && responseRate < 0.3 ? "LOW" : total >= 5 && responseRate < 0.7 ? "MODERATE" : "HIGH";
      return { ...row, admin_responsiveness: responsiveness, response_rate: responseRate };
    });
  }

  async function crimes(query = {}) {
    const state = query.state || "Maharashtra";
    const rows = await enrichedRows(state);
    return computeCrimes(rows, { ...query, state });
  }

  async function summary(state = "Maharashtra", year) {
    return computeSummary(filterYear(await getData(state), year), state);
  }

  async function byType(state = "Maharashtra", year) {
    return computeByType(filterYear(await getData(state), year));
  }

  async function trend(state = "Maharashtra") {
    return computeTrend(await getData(state));
  }

  async function hotspots(state = "Maharashtra", year) {
    return computeHotspots(filterYear(await getData(state), year), state);
  }

  async function safetyScore(district, state = "Maharashtra") {
    return computeSafetyScoreAndTrends(await getData(state), district);
  }

  async function adminInsights(state = "Maharashtra", year) {
    const rising = getRisingCrimes(filterYear(await getData(state), year));
    const text = rising.length ? `${rising[0].type} increased by ${rising[0].growth_pct}% recently.` : "No significant recent increases detected.";
    return { rising_crimes: rising, auto_insight: text };
  }

  async function benchmarks() {
    const states = await getStates();
    const allData = Object.fromEntries(await Promise.all(states.map(async (state) => [state, await loadState(state)])));
    return getStateBenchmarks(allData);
  }

  async function insights(state = "all") {
    const [data, reports] = await Promise.all([getData(state), reportsProvider()]);
    return { insights: getActionableIntelligence(data), gap_alerts: getGapAlerts(data, reports) };
  }

  return {
    getStates,
    getCoordinates,
    resolveState,
    getData,
    crimes,
    summary,
    byType,
    trend,
    hotspots,
    safetyScore,
    adminInsights,
    benchmarks,
    insights,
    clearStateCache: (state) => fileCache.delete(String(state).toLowerCase()),
  };
}

export const analyticsService = createAnalyticsService();
