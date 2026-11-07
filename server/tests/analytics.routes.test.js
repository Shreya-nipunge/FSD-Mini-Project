import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../app.js";
import { sequelize } from "../config/database.js";

let server;
let baseUrl;

before(async () => {
  if (sequelize) await sequelize.authenticate();
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await sequelize?.close();
});

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

test("Express analytics routes preserve response contracts using the existing CSV data", async () => {
  const states = await getJson("/api/states");
  assert.equal(states.status, 200);
  assert.equal(states.body.total, 36);
  assert.ok(states.body.states.includes("Maharashtra"));

  const crimes = await getJson("/api/crimes?state=Maharashtra&year=2017&region=Ahmednagar");
  assert.equal(crimes.status, 200);
  assert.equal(crimes.body.total, 1);
  assert.equal(crimes.body.data[0].district, "Ahmednagar");
  assert.equal(crimes.body.data[0].year, "2017");

  const summary = await getJson("/api/summary?state=Maharashtra&year=2017");
  assert.deepEqual(Object.keys(summary.body).sort(), ["total_incidents", "top_crime", "hottest_zone", "under_investigation"].sort());
  assert.ok(summary.body.total_incidents > 0);

  const byType = await getJson("/api/by-type?state=Maharashtra&year=2017");
  assert.equal(byType.body.labels.length, 9);
  assert.equal(byType.body.values.length, 9);

  const trend = await getJson("/api/trend?state=Maharashtra");
  assert.ok(Array.isArray(trend.body));
  assert.ok(trend.body.some((entry) => entry.month === "2017"));

  const hotspots = await getJson("/api/hotspots?state=Maharashtra&year=2017");
  assert.ok(hotspots.body.length > 0 && hotspots.body.length <= 5);
  assert.equal(hotspots.body[0].rank, 1);

  const safety = await getJson("/api/safety-score?district=Ahmednagar&state=Maharashtra");
  assert.ok(["score", "risk", "trend", "rank", "state_avg_diff"].every((key) => key in safety.body));

  const adminInsights = await getJson("/api/admin/insights?state=Maharashtra&year=2022");
  assert.ok(Array.isArray(adminInsights.body.rising_crimes));
  assert.equal(typeof adminInsights.body.auto_insight, "string");

  const insights = await getJson("/api/analytics/insights?state=all");
  assert.ok(Array.isArray(insights.body.insights));
  assert.ok(Array.isArray(insights.body.gap_alerts));

  const benchmarks = await getJson("/api/analytics/benchmarks");
  assert.ok(Array.isArray(benchmarks.body));
  assert.ok(benchmarks.body.length > 0);

  const macro = await getJson("/api/crimes?state=all&view_mode=macro");
  assert.equal(macro.status, 200);
  assert.ok(macro.body.data.some((row) => row.is_macro === true && Number.isFinite(row.lat) && Number.isFinite(row.lng)));
});

test("analytics routes reject invalid query parameters safely", async () => {
  const invalidYear = await getJson("/api/summary?year=last-year");
  assert.equal(invalidYear.status, 400);
  const invalidView = await getJson("/api/crimes?view_mode=unbounded");
  assert.equal(invalidView.status, 400);
  const invalidState = await getJson("/api/crimes?state=not-a-real-state");
  assert.equal(invalidState.status, 400);
});
