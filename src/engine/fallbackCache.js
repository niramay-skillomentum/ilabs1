// ======================================
// FALLBACK CACHE
// LRU cache for recent LLM responses.
// Keyed by intent:entity:hasIssues so identical
// queries get instant responses when AI succeeds.
// Uses BoundedCache (zero-dep LRU + TTL).
// ======================================

const BoundedCache = require("./boundedCache");

const CACHE_MAX = parseInt(process.env.FALLBACK_CACHE_MAX, 10) || 500;
const CACHE_TTL_MS = parseInt(process.env.FALLBACK_CACHE_TTL_MS, 10) || 5 * 60_000; // 5 min

const cache = new BoundedCache({ max: CACHE_MAX, ttl: CACHE_TTL_MS });

/**
 * Build a cache key from intent + responder identity + whether issues exist.
 * @param {string} intent   - e.g. "AMOUNT_QUERY", "GREETING"
 * @param {string} responder - e.g. "SBG_LONDON", "CITI", "FO"
 * @param {boolean} hasIssues
 * @returns {string}
 */
function buildKey(intent, responder, hasIssues) {
  return `${String(intent || "UNKNOWN")}:${String(responder || "DEFAULT")}:${hasIssues ? "1" : "0"}`;
}

/**
 * Attempt to retrieve a cached LLM response.
 * @returns {Object|undefined}
 */
function get(intent, responder, hasIssues) {
  return cache.get(buildKey(intent, responder, hasIssues));
}

/**
 * Store a successful LLM response in cache.
 */
function set(intent, responder, hasIssues, response) {
  cache.set(buildKey(intent, responder, hasIssues), response);
}

/**
 * Clear all cached responses.
 */
function clear() {
  cache.clear();
}

/** Current cache size. */
function size() {
  return cache.size;
}

module.exports = { get, set, clear, size };
