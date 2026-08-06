// ======================================
// FALLBACK ENGINE
// Centralized 4-layer fallback for all AI desks.
//
// Layer 1: Gemini LLM (primary)
// Layer 2: LRU Cache (recent identical queries)
// Layer 3: Offline Template Engine (deterministic)
// Layer 4: Generic Safe Response (always succeeds)
// ======================================

const llmService = require("./llmService");
const fallbackCache = require("./fallbackCache");
const offlineResponseEngine = require("./offlineResponseEngine");

// ── FAILURE REASON CODES ──
const FAILURE_REASONS = {
  LLM_TIMEOUT:      "API response exceeded timeout threshold",
  LLM_QUOTA:        "HTTP 429 rate limit from Gemini",
  LLM_PARSE_ERROR:  "Response was not valid JSON",
  LLM_EMPTY_BODY:   "Response body was null or empty",
  LLM_API_ERROR:    "HTTP 5xx error from Gemini",
  LLM_UNAVAILABLE:  "No API key configured",
  CACHE_MISS:       "No cached response for this intent+entity",
  TEMPLATE_MISSING: "No offline template found for intent"
};

// ── GENERIC SAFE RESPONSES (Layer 4 — always works) ──
const GENERIC_SAFE_RESPONSES = {
  FO: [
    "Thank you for your message regarding this trade. We are currently reviewing the details and will revert to you shortly with our findings. Please hold processing until we confirm.\n\nBest regards,\nFront Office Operations",
    "Acknowledged. The trading desk is reviewing this query. We'll get back to you with a detailed response. Please do not process further until you hear from us.\n\nRegards,\nFO Desk",
    "We have received your inquiry and are looking into it. Expect a response within the hour.\n\nRegards,\nFront Office",
    "Hi, thanks for flagging this. We're checking our systems now and will provide an update as soon as possible.\n\nBest,\nFO Operations"
  ],
  CPTY: [
    "Thank you for reaching out regarding this trade. We are reviewing the details on our side and will respond shortly.\n\nBest regards,\nOperations Desk",
    "Acknowledged. We're checking our records for this trade. Please stand by for our response.\n\nRegards,\nCounterparty Operations",
    "Hi, we have received your query. Our team is looking into it and we'll get back to you with the details.\n\nBest regards,\nOperations",
    "We are currently reviewing the trade details internally. We will revert once our review is complete.\n\nKind regards,\nCounterparty Ops"
  ],
  CPTY_SETTLEMENT: [
    "Thank you for your inquiry. We are reviewing our settlement records and will respond shortly.\n\nBest regards,\nSettlement Operations",
    "Acknowledged. We're verifying our settlement instructions for this trade. We'll get back to you shortly.\n\nRegards,\nSettlements Desk",
    "We have received your query regarding settlement. Our team is reviewing the relevant records and will provide an update.\n\nBest regards,\nOperations",
    "Your settlement inquiry has been noted. We are checking our systems and will respond with the required details.\n\nKind regards,\nSettlement Ops"
  ],
  FO_INTERNAL: [
    "Thank you for the internal escalation. The Front Office is reviewing the trade details and will provide a response shortly. Please hold further processing.\n\nRegards,\nFO Desk",
    "Acknowledged. The trading desk is reviewing this internally. We'll revert with our assessment.\n\nBest regards,\nFront Office",
    "We have received the escalation and are currently investigating. An update will follow.\n\nRegards,\nFO Operations",
    "Internal review in progress. We'll get back to you with our findings soon.\n\nBest,\nFO"
  ]
};

/**
 * Layer 1: Try Gemini LLM
 */
async function tryLLM(systemPrompt, userMessage) {
  try {
    const result = await llmService.generateResponse(systemPrompt, userMessage);
    if (result && result.body) {
      return { success: true, response: result, layer: "LLM" };
    }
    return { success: false, reason: FAILURE_REASONS.LLM_EMPTY_BODY };
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (err.status === 429 || msg.includes("quota") || msg.includes("rate")) {
      return { success: false, reason: FAILURE_REASONS.LLM_QUOTA };
    }
    if (err.status >= 500) {
      return { success: false, reason: FAILURE_REASONS.LLM_API_ERROR };
    }
    if (msg.includes("json") || msg.includes("parse")) {
      return { success: false, reason: FAILURE_REASONS.LLM_PARSE_ERROR };
    }
    return { success: false, reason: FAILURE_REASONS.LLM_API_ERROR };
  }
}

/**
 * Layer 2: Try cached response
 */
function tryCache(intent, responder, hasIssues) {
  const cached = fallbackCache.get(intent, responder, hasIssues);
  if (cached) {
    return { success: true, response: cached, layer: "CACHE" };
  }
  return { success: false, reason: FAILURE_REASONS.CACHE_MISS };
}

/**
 * Layer 3: Try offline template engine
 */
function tryOfflineTemplate(desk, trade, userMessage, personality) {
  try {
    let result;
    if (desk === "CPTY" || desk === "CPTY_SETTLEMENT") {
      const aiParser = require("./aiParser");
      const parsed = aiParser.parseEmail(userMessage);
      result = offlineResponseEngine.generateCPTYResponseOffline(parsed, trade.tradeRef, userMessage);
    } else {
      // FO or FO_INTERNAL
      result = offlineResponseEngine.generateFOResponseOffline(trade, userMessage, personality);
    }

    if (result && result.body) {
      return { success: true, response: result, layer: "TEMPLATE" };
    }
    return { success: false, reason: FAILURE_REASONS.TEMPLATE_MISSING };
  } catch (err) {
    console.warn("[FallbackEngine] Template engine error:", err.message);
    return { success: false, reason: FAILURE_REASONS.TEMPLATE_MISSING };
  }
}

/**
 * Layer 4: Generic safe response (always succeeds)
 */
function genericSafeResponse(desk, tradeRef) {
  const pool = GENERIC_SAFE_RESPONSES[desk] || GENERIC_SAFE_RESPONSES.FO;
  const body = pool[Math.floor(Math.random() * pool.length)];
  return {
    success: true,
    response: {
      action: "IMMEDIATE_ANSWER",
      subject: `RE: Trade ${tradeRef || "Inquiry"}`,
      body
    },
    layer: "GENERIC_SAFE"
  };
}

/**
 * Master orchestrator — runs layers 1→4 in sequence until one succeeds.
 *
 * @param {Object} opts
 * @param {string} opts.desk          - "FO" | "CPTY" | "CPTY_SETTLEMENT" | "FO_INTERNAL"
 * @param {string} opts.responder     - Entity code or counterparty name (for cache key)
 * @param {Object} opts.trade         - Trade document
 * @param {string} opts.userMessage   - User's email message text
 * @param {string} opts.intent        - Classified intent (for cache key)
 * @param {boolean} opts.hasIssues    - Whether trade has known issues
 * @param {string} opts.personality   - Personality for template engine
 * @param {Function} opts.buildPrompt - () => systemPrompt string
 * @returns {Promise<Object>} { action, subject, body }
 */
async function generateWithFallback({
  desk = "FO",
  responder = "DEFAULT",
  trade,
  userMessage,
  intent = "UNKNOWN",
  hasIssues = false,
  personality = "FORMAL",
  buildPrompt,
  offlineOnly = false
}) {
  const tradeRef = trade?.tradeRef || "UNKNOWN";
  const layers = [];

  if (!offlineOnly) {
    // Layer 1: Gemini LLM
    if (buildPrompt) {
      const llmResult = await tryLLM(buildPrompt(), userMessage);
      layers.push({ layer: "LLM", ...llmResult });
      if (llmResult.success) {
        // Cache for future use
        fallbackCache.set(intent, responder, hasIssues, llmResult.response);
        console.log(`✅ [FallbackEngine] ${desk} response via LLM for ${tradeRef}`);
        return llmResult.response;
      }
    }

    // Layer 2: Cached response
    const cacheResult = tryCache(intent, responder, hasIssues);
    layers.push({ layer: "CACHE", ...cacheResult });
    if (cacheResult.success) {
      console.log(`📦 [FallbackEngine] ${desk} response via CACHE for ${tradeRef}`);
      return cacheResult.response;
    }
  } else {
    console.log(`⚡ [FallbackEngine] Offline mode enforced — skipping LLM & Cache for ${tradeRef}`);
  }

  // Layer 3: Offline template
  const templateResult = tryOfflineTemplate(desk, trade, userMessage, personality);
  layers.push({ layer: "TEMPLATE", ...templateResult });
  if (templateResult.success) {
    console.log(`📝 [FallbackEngine] ${desk} response via TEMPLATE for ${tradeRef}`);
    return templateResult.response;
  }

  // Layer 4: Generic safe response
  const safeResult = genericSafeResponse(desk, tradeRef);
  layers.push({ layer: "GENERIC_SAFE", ...safeResult });
  console.warn(`🛡️ [FallbackEngine] ${desk} response via GENERIC_SAFE for ${tradeRef}. Layers tried:`,
    layers.map(l => `${l.layer}:${l.success ? "OK" : l.reason}`).join(" → "));
  return safeResult.response;
}

module.exports = {
  generateWithFallback,
  FAILURE_REASONS,
  GENERIC_SAFE_RESPONSES,
  // Expose individual layers for testing
  tryLLM,
  tryCache,
  tryOfflineTemplate,
  genericSafeResponse
};
