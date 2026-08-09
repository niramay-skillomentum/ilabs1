// ======================================
// SESSION COLLECTOR
// Central event bus for the OPI platform.
// Normalizes and persists events from all engines
// into the PerformanceEvent collection.
//
// Design:
//   - Every engine calls collect() with a lightweight payload
//   - Writes are fire-and-forget (non-blocking)
//   - Maintains an in-memory session registry to associate
//     events with active PerformanceSessions
//   - registerSession() is called by queueComposer when a
//     new queue is built
//   - endSession() is called when a session expires or completes
// ======================================

const { v4: uuidv4 } = require("uuid");
const { getIsConnected } = require("../../db");

let PerformanceSession, PerformanceEvent;
try {
  PerformanceSession = require("../../models/PerformanceSession");
  PerformanceEvent = require("../../models/PerformanceEvent");
} catch (e) {
  PerformanceSession = null;
  PerformanceEvent = null;
}

// ── In-memory session registry ──
// Maps userId → { sessionId, desk, tradeRefs, sessionStart }
// Kept lightweight; cleared on session end.
const activeSessions = {};

/**
 * Register a new performance session.
 * Called by queueComposer.buildQueue() after a queue is assembled.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.desk
 * @param {string[]} params.tradeRefs
 * @param {Date} params.sessionStart
 * @param {Date} params.sessionExpiry
 */
async function registerSession({ userId, desk, tradeRefs, sessionStart, sessionExpiry }) {
  const sessionId = uuidv4();

  activeSessions[userId] = {
    sessionId,
    desk,
    tradeRefs,
    sessionStart
  };

  // Persist to MongoDB
  if (getIsConnected() && PerformanceSession) {
    try {
      await PerformanceSession.create({
        sessionId,
        userId,
        desk,
        tradeRefs,
        sessionStart,
        status: "ACTIVE",
        summary: {
          totalTrades: tradeRefs.length,
          tradesCompleted: 0,
          tradesWithBreaks: 0,
          totalEventsRecorded: 0
        }
      });
      console.log(`[OPI] Session registered: ${sessionId} for ${userId} on ${desk} (${tradeRefs.length} trades)`);
    } catch (err) {
      console.warn("[OPI] Session registration failed:", err.message);
    }
  }

  // Collect the QUEUE_ASSIGNED event
  collect("QUEUE_ASSIGNED", {
    userId,
    desk,
    metadata: { tradeCount: tradeRefs.length, tradeRefs }
  });

  return sessionId;
}

/**
 * Get the active session ID for a user.
 * Falls back to DB lookup if not in memory.
 */
function getActiveSessionId(userId) {
  if (activeSessions[userId]) {
    return activeSessions[userId].sessionId;
  }
  return null;
}

/**
 * Get full active session info for a user.
 */
function getActiveSession(userId) {
  return activeSessions[userId] || null;
}

/**
 * Collect a performance event.
 * This is the main entry point — called by every engine hook.
 *
 * @param {string} eventType - The event classification
 * @param {Object} params
 * @param {string} [params.sessionId] - Override session ID (auto-resolved from userId if omitted)
 * @param {string} [params.tradeRef] - Trade reference (null for session-level events)
 * @param {string} [params.userId] - The user who triggered the event
 * @param {string} [params.desk] - Desk context
 * @param {string} [params.category] - WORKFLOW | DECISION | COMMUNICATION | LEARNING | LIFECYCLE | QUEUE | SYSTEM
 * @param {Object} [params.metadata] - Structured event-specific data
 * @param {Object} [params.payload] - Raw event data for evidence tracing
 */
function collect(eventType, params = {}) {
  const {
    sessionId: explicitSessionId,
    tradeRef = null,
    userId,
    desk,
    category,
    metadata = {},
    payload = {}
  } = params;

  // Resolve session ID: explicit > in-memory registry > null
  const sessionId = explicitSessionId || (userId ? getActiveSessionId(userId) : null);

  // If no active session, silently skip — this user isn't being tracked
  if (!sessionId) return;

  // Resolve desk from session if not provided
  const resolvedDesk = desk || (userId && activeSessions[userId]?.desk) || null;

  // Auto-categorize if not provided
  const resolvedCategory = category || categorizeEvent(eventType);

  const event = {
    sessionId,
    tradeRef,
    timestamp: new Date(),
    desk: resolvedDesk,
    eventType,
    actor: userId || "SYSTEM",
    category: resolvedCategory,
    metadata,
    payload
  };

  // Persist (fire-and-forget)
  if (getIsConnected() && PerformanceEvent) {
    PerformanceEvent.create(event)
      .then(() => {
        // Increment event counter on session (best-effort)
        if (PerformanceSession) {
          PerformanceSession.updateOne(
            { sessionId },
            { $inc: { "summary.totalEventsRecorded": 1 } }
          ).catch(() => {});
        }
      })
      .catch(err => {
        console.warn("[OPI] Event persist failed:", err.message);
      });
  }
}

/**
 * End a performance session.
 * Called when a session expires or all trades are completed.
 */
async function endSession(userId, status = "COMPLETED") {
  const session = activeSessions[userId];
  if (!session) return null;

  const { sessionId } = session;
  delete activeSessions[userId];

  // Collect logout/end event
  collect("SESSION_ENDED", {
    sessionId,
    userId,
    metadata: { status }
  });

  if (getIsConnected() && PerformanceSession) {
    try {
      await PerformanceSession.updateOne(
        { sessionId },
        {
          $set: {
            status,
            sessionEnd: new Date()
          }
        }
      );
      console.log(`[OPI] Session ended: ${sessionId} (${status})`);
    } catch (err) {
      console.warn("[OPI] Session end update failed:", err.message);
    }
  }

  return sessionId;
}

/**
 * Restore active sessions from DB on server restart.
 * Called during server startup to repopulate the in-memory registry.
 */
async function restoreActiveSessions() {
  if (!getIsConnected() || !PerformanceSession) return;

  try {
    const sessions = await PerformanceSession.find({ status: "ACTIVE" }).lean();
    for (const s of sessions) {
      activeSessions[s.userId] = {
        sessionId: s.sessionId,
        desk: s.desk,
        tradeRefs: s.tradeRefs,
        sessionStart: s.sessionStart
      };
    }
    if (sessions.length > 0) {
      console.log(`[OPI] Restored ${sessions.length} active session(s) from DB`);
    }
  } catch (err) {
    console.warn("[OPI] Session restore failed:", err.message);
  }
}

/**
 * Get all events for a session, ordered chronologically.
 */
async function getSessionEvents(sessionId) {
  if (!getIsConnected() || !PerformanceEvent) return [];

  try {
    return await PerformanceEvent.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean();
  } catch (err) {
    console.warn("[OPI] Event fetch failed:", err.message);
    return [];
  }
}

/**
 * Get events for a specific trade within a session.
 */
async function getTradeEvents(sessionId, tradeRef) {
  if (!getIsConnected() || !PerformanceEvent) return [];

  try {
    return await PerformanceEvent.find({ sessionId, tradeRef })
      .sort({ timestamp: 1 })
      .lean();
  } catch (err) {
    console.warn("[OPI] Trade event fetch failed:", err.message);
    return [];
  }
}

// ── Internal Helpers ──

/**
 * Auto-categorize events based on eventType prefix/keyword.
 */
function categorizeEvent(eventType) {
  if (!eventType) return "SYSTEM";

  const type = eventType.toUpperCase();

  if (type.includes("MAIL") || type.includes("EMAIL") || type.includes("COMMUNICATION")) return "COMMUNICATION";
  if (type.includes("LEARNING") || type.includes("TUTOR")) return "LEARNING";
  if (type.includes("DECISION") || type.includes("VALIDATE") || type.includes("APPROVE") || type.includes("BREAK")) return "DECISION";
  if (type.includes("QUEUE") || type.includes("LOGIN") || type.includes("LOGOUT") || type.includes("SESSION")) return "QUEUE";
  if (type.includes("SETTLED") || type.includes("CLOSED") || type.includes("TRANSITION") || type.includes("LIFECYCLE")) return "LIFECYCLE";
  if (type.includes("VERIFICATION") || type.includes("AMENDMENT") || type.includes("SYSTEM")) return "SYSTEM";

  return "WORKFLOW";
}

module.exports = {
  registerSession,
  getActiveSessionId,
  getActiveSession,
  collect,
  endSession,
  restoreActiveSessions,
  getSessionEvents,
  getTradeEvents
};
