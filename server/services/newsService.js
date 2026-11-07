import "../config/env.js";

const trustedSources = new Set(["The Hindu", "Indian Express", "Times of India", "BBC News", "Reuters", "NDTV"]);
const excludedTerms = ["movie", "netflix", "series", "trailer", "tv show", "bollywood", "hollywood", "actor", "actress"];
const crimeKeywords = ["murder", "robbery", "theft", "assault", "fraud", "rape", "arrest", "fir", "police", "investigation"];
const highSeverityWords = ["murder", "rape", "kill", "terror", "gang", "multiple victims", "weapon"];
const mediumSeverityWords = ["robbery", "assault", "fraud", "theft", "clash", "arrest"];
const locations = ["Mumbai", "Thane", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata"];
const CACHE_TTL_MS = 5 * 60 * 1000;

export function sanitizeNewsQuery(value) {
  if (typeof value !== "string") return null;
  const query = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ");
  if (!query || query.length > 80 || !/^[\p{L}\p{N}\s.,'&()\-]+$/u.test(query)) return null;
  return query;
}

function severityFor(text) {
  const normalized = text.toLowerCase();
  if (highSeverityWords.some((word) => normalized.includes(word))) return "HIGH";
  if (mediumSeverityWords.some((word) => normalized.includes(word))) return "MEDIUM";
  return "LOW";
}

function locationHint(text) {
  const normalized = text.toLowerCase();
  return locations.find((place) => normalized.includes(place.toLowerCase())) || null;
}

function formatPublishedAt(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function rankArticle(article) {
  let score = 0;
  if (trustedSources.has(article.source)) score += 3;
  if (article.title.toLowerCase().includes("murder")) score += 3;
  if (article.publishedAt !== "Recent") score += 2;
  return score;
}

function formatArticle(article) {
  const title = typeof article.title === "string" ? article.title : "";
  const description = typeof article.description === "string" ? article.description : "";
  const source = typeof article.source === "string" ? article.source : article.source?.name || null;
  const combinedText = `${title} ${description}`;
  return {
    title,
    description,
    url: typeof article.url === "string" ? article.url : null,
    image: typeof article.urlToImage === "string" ? article.urlToImage : null,
    source,
    publishedAt: formatPublishedAt(article.publishedAt),
    severity: severityFor(combinedText),
    confidence: trustedSources.has(source) ? "HIGH" : "MEDIUM",
    location_hint: locationHint(combinedText),
  };
}

function errorResponse(query, message, httpStatus) {
  return {
    httpStatus,
    body: { status: "error", message, query, articles: [], count: 0 },
  };
}

export function createNewsService({ apiKey = process.env.NEWS_API_KEY, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cache = new Map();
  const configuredApiKey = typeof apiKey === "string" && apiKey.trim() && !/^your_.*_here$/i.test(apiKey.trim()) ? apiKey.trim() : null;

  async function getNews(input = "crime India") {
    const query = sanitizeNewsQuery(input);
    if (!query) return errorResponse("", "Search query is invalid", 400);
    if (!configuredApiKey) return errorResponse(query, "NewsAPI is not configured", 503);

    const normalizedQuery = query.toLowerCase();
    const timestamp = now();
    const cached = cache.get(normalizedQuery);
    if (cached && timestamp - cached.timestamp < CACHE_TTL_MS) return { httpStatus: 200, body: cached.body };

    const searchQuery = `${normalizedQuery} crime OR police OR FIR OR arrest`;
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", configuredApiKey);

    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
      let providerData;
      try {
        providerData = await response.json();
      } catch {
        return errorResponse(query, "News provider returned an invalid response", 502);
      }
      if (!response.ok || providerData.status === "error") {
        const rateLimited = response.status === 429 || providerData.code === "rateLimited";
        return errorResponse(query, rateLimited ? "News provider rate limit reached; try again later" : "News provider is temporarily unavailable", rateLimited ? 503 : 502);
      }

      const articles = Array.isArray(providerData.articles) ? providerData.articles : [];
      const seenTitles = new Set();
      const filtered = [];
      for (const article of articles) {
        const title = typeof article.title === "string" ? article.title : "";
        const description = typeof article.description === "string" ? article.description : "";
        const titleLower = title.toLowerCase();
        const descriptionLower = description.toLowerCase();
        if (seenTitles.has(titleLower)) continue;
        seenTitles.add(titleLower);
        if (excludedTerms.some((term) => titleLower.includes(term) || descriptionLower.includes(term))) continue;
        if (!crimeKeywords.some((word) => titleLower.includes(word) || descriptionLower.includes(word))) continue;
        filtered.push(formatArticle(article));
      }
      filtered.sort((a, b) => rankArticle(b) - rankArticle(a));
      const rankedTopSix = filtered.slice(0, 6);
      // This fallback contains only real provider articles; provider errors never use it.
      const resultArticles = rankedTopSix.length >= 3
        ? rankedTopSix
        : articles.slice(0, 6).map((article) => ({
            title: typeof article.title === "string" ? article.title : "",
            description: typeof article.description === "string" ? article.description : "",
            url: typeof article.url === "string" ? article.url : null,
            image: typeof article.urlToImage === "string" ? article.urlToImage : null,
            source: typeof article.source === "string" ? article.source : article.source?.name || null,
            publishedAt: "Recent",
            severity: "LOW",
            confidence: "MEDIUM",
            location_hint: null,
          }));

      const body = {
        status: "success",
        message: "Intelligence feed active",
        query,
        articles: resultArticles,
        count: resultArticles.length,
      };
      if (resultArticles.length) cache.set(normalizedQuery, { timestamp, body });
      return { httpStatus: 200, body };
    } catch (error) {
      const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
      return errorResponse(query, timedOut ? "News provider timed out; try again later" : "Unable to synchronize with live intelligence feed", timedOut ? 504 : 502);
    }
  }

  return { getNews, clearCache: () => cache.clear() };
}

export const newsService = createNewsService();
