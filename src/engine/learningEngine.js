// ======================================
// LEARNING ENGINE — Centralized Coaching System
// Transforms validation failures into educational
// learning experiences. Integrates with Scoring,
// Audit, Socket.IO, and AI Tutor engines.
// ======================================

const { v4: uuidv4 } = require("uuid");
const { getIsConnected } = require("../db");
const { getRule, getRuleFromError } = require("./learningRules");
const { getRandomIntro } = require("./learningIntros");
const auditEngine = require("./auditEngine");
const scoringEngine = require("./scoringEngine");

let LearningEvent;
try {
  LearningEvent = require("../models/LearningEvent");
} catch (e) {
  LearningEvent = null;
}

// In-memory repeat-mistake counters per user (for XP reduction)
// Shape: { [userId]: { [mistakeCode]: count } }
const repeatCounters = {};

/**
 * Process a validation failure and generate a learning event.
 *
 * @param {Object} params
 * @param {string} params.userId     - The user who made the mistake
 * @param {string} params.tradeRef   - Trade reference (optional for non-trade errors)
 * @param {string} params.desk       - Current desk (MO, CONFIRMATION, SETTLEMENT, RECONCILIATION)
 * @param {string} params.action     - The action the user attempted
 * @param {string} params.ruleCode   - Direct rule code (preferred), or...
 * @param {string} params.errorMessage - The error message string (auto-maps to a rule)
 * @returns {Object|null} The learning event payload, or null if no rule found
 */
async function processFailure({ userId, tradeRef, desk, action, ruleCode, errorMessage }) {
  // Resolve the rule: direct code takes priority, then error-message lookup
  let rule = ruleCode ? getRule(ruleCode) : null;
  if (!rule && errorMessage) {
    rule = getRuleFromError(errorMessage);
  }

  // If no rule found, return null (original error passes through unchanged)
  if (!rule) return null;

  // Track repeat mistakes
  if (!repeatCounters[userId]) repeatCounters[userId] = {};
  if (!repeatCounters[userId][rule.code]) repeatCounters[userId][rule.code] = 0;
  repeatCounters[userId][rule.code]++;
  const repeatCount = repeatCounters[userId][rule.code];

  // XP reduction for repeated mistakes: full on 1st, 50% on 2nd, 0 on 3rd+
  let adjustedXpReward = rule.xpReward;
  if (repeatCount === 2) {
    adjustedXpReward = Math.floor(rule.xpReward * 0.5);
  } else if (repeatCount >= 3) {
    adjustedXpReward = 0;
  }

  // Generate the learning event
  const learningEvent = {
    eventId: uuidv4(),
    tradeRef: tradeRef || null,
    userId,
    desk: desk || "UNKNOWN",
    action: action || null,
    mistakeCode: rule.code,
    severity: rule.severity.level,
    severityLabel: rule.severity.label,
    severityColor: rule.severity.color,
    title: rule.title,
    mentorIntro: getRandomIntro(userId),
    message: rule.message,
    whyItMatters: rule.whyItMatters,
    realWorldImpact: Array.isArray(rule.realWorldImpact) ? rule.realWorldImpact : [rule.realWorldImpact],
    correctAction: rule.correctAction,
    scoreImpact: -(rule.scorePenalty || 0),
    xpReward: adjustedXpReward,
    relatedTopic: rule.relatedTopic || null,
    learnMoreLink: rule.learnMoreLink || null,
    repeatCount,
    viewed: false,
    dismissed: false,
    tutorOpened: false,
    timestamp: new Date()
  };

  // ── Scoring Engine: Apply penalty (fire-and-forget) ──
  if (rule.scorePenalty > 0) {
    try {
      await scoringEngine.applyPenalty(
        userId,
        tradeRef || "N/A",
        rule.scorePenalty,
        `Learning: ${rule.code} — ${rule.title}`
      );
    } catch (err) {
      console.warn("[LearningEngine] Scoring penalty failed:", err.message);
    }
  }

  // ── Audit Engine: Record the learning event (fire-and-forget) ──
  try {
    await auditEngine.recordEvent(
      tradeRef || "N/A",
      userId,
      "LEARNING_EVENT",
      JSON.stringify({
        mistakeCode: rule.code,
        severity: rule.severity.level,
        title: rule.title,
        desk,
        action,
        scorePenalty: rule.scorePenalty,
        xpReward: adjustedXpReward,
        repeatCount
      })
    );
  } catch (err) {
    console.warn("[LearningEngine] Audit record failed:", err.message);
  }

  // ── MongoDB: Persist the learning event ──
  if (getIsConnected() && LearningEvent) {
    try {
      await LearningEvent.create(learningEvent);
    } catch (err) {
      console.warn("[LearningEngine] DB persist failed:", err.message);
    }
  }

  // ── Socket.IO: Push to user (non-blocking) ──
  try {
    const { getIo } = require("./socketEngine");
    const io = getIo();
    io.to(`user_${userId}`).emit("learning_event", learningEvent);
  } catch (err) {
    // Socket may not be initialized — silent fail
  }

  // OPI: Forward to session collector (fire-and-forget)
  try {
    require("./performance/sessionCollector").collect("LEARNING_EVENT", {
      tradeRef, userId, desk,
      metadata: { mistakeCode: rule.code, severity: rule.severity.level, title: rule.title, repeatCount, scorePenalty: rule.scorePenalty }
    });
  } catch (e) { /* OPI not loaded — silent */ }

  return learningEvent;
}

/**
 * Record a user interaction with a learning event
 * (viewed, dismissed, tutorOpened).
 */
async function recordInteraction(eventId, userId, interactionType) {
  const update = {};
  const now = new Date();

  switch (interactionType) {
    case "viewed":
      update.viewed = true;
      update.viewedAt = now;
      break;
    case "dismissed":
      update.dismissed = true;
      update.dismissedAt = now;
      break;
    case "tutorOpened":
      update.tutorOpened = true;
      break;
    default:
      return null;
  }

  // Award XP if the user viewed/dismissed (i.e., read the lesson)
  let xpAwarded = 0;
  if (getIsConnected() && LearningEvent) {
    try {
      const event = await LearningEvent.findOneAndUpdate(
        { eventId, userId },
        { $set: update },
        { returnDocument: "after" }
      );

      if (event && (interactionType === "viewed" || interactionType === "dismissed") && event.xpReward > 0) {
        // Award XP via scoring engine (positive points)
        xpAwarded = event.xpReward;
        await scoringEngine.evaluateAction(
          { tradeRef: event.tradeRef || "N/A" },
          `LEARNING_XP_${interactionType.toUpperCase()}`,
          null,
          userId
        );
      }

      // Audit the interaction
      await auditEngine.recordEvent(
        event?.tradeRef || "N/A",
        userId,
        `LEARNING_${interactionType.toUpperCase()}`,
        JSON.stringify({ eventId, mistakeCode: event?.mistakeCode, xpAwarded })
      );

      return event;
    } catch (err) {
      console.warn("[LearningEngine] Interaction update failed:", err.message);
    }
  }

  return null;
}

/**
 * Get learning history for a user.
 */
async function getUserHistory(userId, options = {}) {
  if (!getIsConnected() || !LearningEvent) return { events: [], total: 0 };

  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 200);
  const skip = Math.max(parseInt(options.skip, 10) || 0, 0);

  try {
    const [events, total] = await Promise.all([
      LearningEvent.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LearningEvent.countDocuments({ userId })
    ]);

    return { events, total };
  } catch (err) {
    console.warn("[LearningEngine] History fetch failed:", err.message);
    return { events: [], total: 0 };
  }
}

/**
 * Get aggregated analytics.
 */
async function getAnalytics(userId) {
  if (!getIsConnected() || !LearningEvent) return {};

  try {
    const filter = userId ? { userId } : {};

    const [
      totalEvents,
      byMistakeCode,
      bySeverity,
      byDesk,
      viewedCount,
      dismissedCount,
      tutorOpenedCount,
      repeatedMistakes
    ] = await Promise.all([
      LearningEvent.countDocuments(filter),
      LearningEvent.aggregate([
        { $match: filter },
        { $group: { _id: "$mistakeCode", count: { $sum: 1 }, title: { $first: "$title" } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      LearningEvent.aggregate([
        { $match: filter },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LearningEvent.aggregate([
        { $match: filter },
        { $group: { _id: "$desk", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LearningEvent.countDocuments({ ...filter, viewed: true }),
      LearningEvent.countDocuments({ ...filter, dismissed: true }),
      LearningEvent.countDocuments({ ...filter, tutorOpened: true }),
      LearningEvent.aggregate([
        { $match: { ...filter, repeatCount: { $gte: 2 } } },
        { $group: { _id: { userId: "$userId", mistakeCode: "$mistakeCode" }, count: { $sum: 1 }, title: { $first: "$title" } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
    ]);

    return {
      totalEvents,
      mostCommonMistakes: byMistakeCode,
      bySeverity,
      byDesk,
      viewedCount,
      dismissedCount,
      tutorOpenedCount,
      learningCompletionRate: totalEvents > 0 ? Math.round((viewedCount / totalEvents) * 100) : 0,
      tutorUsageRate: totalEvents > 0 ? Math.round((tutorOpenedCount / totalEvents) * 100) : 0,
      repeatedMistakes
    };
  } catch (err) {
    console.warn("[LearningEngine] Analytics failed:", err.message);
    return {};
  }
}

/**
 * Clear repeat counters for a user (e.g., on session end).
 */
function resetRepeatCounters(userId) {
  delete repeatCounters[userId];
}

module.exports = {
  processFailure,
  recordInteraction,
  getUserHistory,
  getAnalytics,
  resetRepeatCounters
};
