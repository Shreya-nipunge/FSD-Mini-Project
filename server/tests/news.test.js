import assert from "node:assert/strict";
import { test } from "node:test";
import { createNewsService, sanitizeNewsQuery } from "../services/newsService.js";

const articles = [
  { title: "Mumbai murder investigation", description: "Police investigate a murder", url: "https://news.test/1", urlToImage: "https://news.test/1.jpg", source: { name: "The Hindu" }, publishedAt: "2025-01-02T00:00:00Z" },
  { title: "Pune theft arrests", description: "Police arrested suspects after theft", url: "https://news.test/2", urlToImage: null, source: { name: "NDTV" }, publishedAt: "2025-01-01T00:00:00Z" },
  { title: "Delhi police investigate robbery", description: "Police open a robbery investigation", url: "https://news.test/3", urlToImage: null, source: { name: "Reuters" }, publishedAt: "2024-12-30T00:00:00Z" },
];

test("sanitizes valid query text and rejects blank, overlong, or unsafe input", () => {
  assert.equal(sanitizeNewsQuery("  Pune   crime  "), "Pune crime");
  assert.equal(sanitizeNewsQuery(""), null);
  assert.equal(sanitizeNewsQuery("x".repeat(81)), null);
  assert.equal(sanitizeNewsQuery("Delhi<script>"), null);
});

test("valid NewsAPI searches preserve the frontend response and article fields", async () => {
  let requestUrl;
  const service = createNewsService({
    apiKey: "test-only-key",
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return { ok: true, status: 200, json: async () => ({ status: "ok", articles }) };
    },
    now: () => 1000,
  });
  const result = await service.getNews("Pune");
  assert.equal(result.httpStatus, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ["articles", "count", "message", "query", "status"].sort());
  assert.equal(result.body.status, "success");
  assert.equal(result.body.query, "Pune");
  assert.equal(result.body.count, 3);
  assert.deepEqual(Object.keys(result.body.articles[0]).sort(), ["title", "description", "url", "image", "source", "publishedAt", "severity", "confidence", "location_hint"].sort());
  assert.equal(result.body.articles[0].source, "The Hindu");
  assert.equal(result.body.articles[0].severity, "HIGH");
  assert.equal(result.body.articles[0].confidence, "HIGH");
  assert.equal(result.body.articles[0].location_hint, "Mumbai");
  assert.match(requestUrl.searchParams.get("q"), /^pune crime OR police OR FIR OR arrest$/);
  assert.equal(requestUrl.searchParams.get("apiKey"), "test-only-key");
  assert.equal(JSON.stringify(result.body).includes("test-only-key"), false);
});

test("missing API keys and invalid queries return errors without calling the provider", async () => {
  let calls = 0;
  const missingKey = createNewsService({ apiKey: "", fetchImpl: async () => { calls += 1; } });
  const noKeyResult = await missingKey.getNews("India");
  assert.equal(noKeyResult.httpStatus, 503);
  assert.equal(noKeyResult.body.status, "error");
  assert.deepEqual(noKeyResult.body.articles, []);

  const configured = createNewsService({ apiKey: "test", fetchImpl: async () => { calls += 1; } });
  const invalidResult = await configured.getNews("<script>alert(1)</script>");
  assert.equal(invalidResult.httpStatus, 400);
  assert.equal(invalidResult.body.status, "error");
  assert.equal(calls, 0);
});

test("provider failures and rate limits return no fabricated articles", async () => {
  const rateLimited = createNewsService({
    apiKey: "test",
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ status: "error", code: "rateLimited" }) }),
  });
  const rateResult = await rateLimited.getNews("Delhi");
  assert.equal(rateResult.httpStatus, 503);
  assert.equal(rateResult.body.status, "error");
  assert.deepEqual(rateResult.body.articles, []);
  assert.equal(rateResult.body.count, 0);

  const networkFailure = createNewsService({ apiKey: "test", fetchImpl: async () => { throw new Error("network down"); } });
  const failed = await networkFailure.getNews("Mumbai");
  assert.equal(failed.httpStatus, 502);
  assert.deepEqual(failed.body.articles, []);
});

test("successful responses are cached briefly by normalized query", async () => {
  let calls = 0;
  const service = createNewsService({
    apiKey: "test",
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ status: "ok", articles }) };
    },
    now: () => 5000,
  });
  await service.getNews("Delhi");
  await service.getNews("  delhi  ");
  assert.equal(calls, 1);
});
