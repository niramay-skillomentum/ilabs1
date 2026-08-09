// ======================================
// TIMELINE ANALYZER
// Builds a complete chronological session timeline
// from PerformanceEvents. Zero AI.
//
// Calculates time gaps, idle periods, and per-trade
// time spent. Managers love timelines.
// ======================================

/**
 * Build a complete session timeline from events.
 *
 * @param {Object[]} events - All PerformanceEvents for a session, chronologically sorted
 * @returns {Object} Timeline analysis
 */
function buildTimeline(events) {
  if (!events || events.length === 0) {
    return { entries: [], totalDuration: 0, perTradeTime: {}, idlePeriods: [], rushPeriods: [] };
  }

  const entries = [];
  const perTradeTime = {};         // tradeRef → { start, end, totalMs }
  const idlePeriods = [];          // Periods > 2 min with no activity
  const rushPeriods = [];          // Periods < 15s between actions

  const IDLE_THRESHOLD_MS = 2 * 60 * 1000;    // 2 minutes
  const RUSH_THRESHOLD_MS = 15 * 1000;         // 15 seconds

  let prevTimestamp = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const timestamp = new Date(event.timestamp);
    const timeStr = formatTime(timestamp);

    // Build timeline entry
    entries.push({
      time: timeStr,
      timestamp: timestamp,
      event: getEventLabel(event),
      eventType: event.eventType,
      tradeRef: event.tradeRef || null,
      category: event.category,
      actor: event.actor,
      details: getEventDetails(event)
    });

    // Track per-trade time
    if (event.tradeRef) {
      if (!perTradeTime[event.tradeRef]) {
        perTradeTime[event.tradeRef] = {
          firstEvent: timestamp,
          lastEvent: timestamp,
          eventCount: 0
        };
      }
      perTradeTime[event.tradeRef].lastEvent = timestamp;
      perTradeTime[event.tradeRef].eventCount++;
    }

    // Detect idle and rush periods
    if (prevTimestamp) {
      const gap = timestamp - prevTimestamp;

      if (gap > IDLE_THRESHOLD_MS) {
        idlePeriods.push({
          start: formatTime(prevTimestamp),
          end: timeStr,
          durationMs: gap,
          durationFormatted: formatDuration(gap),
          afterEvent: i > 0 ? getEventLabel(events[i - 1]) : null,
          beforeEvent: getEventLabel(event)
        });
      }

      if (gap < RUSH_THRESHOLD_MS && gap > 0) {
        rushPeriods.push({
          time: timeStr,
          gapMs: gap,
          event: getEventLabel(event),
          tradeRef: event.tradeRef
        });
      }
    }

    prevTimestamp = timestamp;
  }

  // Calculate per-trade durations
  for (const tradeRef of Object.keys(perTradeTime)) {
    const trade = perTradeTime[tradeRef];
    trade.totalMs = trade.lastEvent - trade.firstEvent;
    trade.totalFormatted = formatDuration(trade.totalMs);
  }

  // Calculate total session duration
  const sessionStart = new Date(events[0].timestamp);
  const sessionEnd = new Date(events[events.length - 1].timestamp);
  const totalDuration = sessionEnd - sessionStart;

  return {
    entries,
    totalDuration,
    totalDurationFormatted: formatDuration(totalDuration),
    sessionStart,
    sessionEnd,
    totalEvents: events.length,
    perTradeTime,
    avgTimePerTrade: calculateAvgTimePerTrade(perTradeTime),
    idlePeriods,
    rushPeriods,
    rushCount: rushPeriods.length,
    idleCount: idlePeriods.length,
    totalIdleTime: idlePeriods.reduce((sum, p) => sum + p.durationMs, 0)
  };
}

// ── Formatting Helpers ──

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function calculateAvgTimePerTrade(perTradeTime) {
  const trades = Object.values(perTradeTime);
  if (trades.length === 0) return 0;
  const totalMs = trades.reduce((sum, t) => sum + t.totalMs, 0);
  return Math.round(totalMs / trades.length / 1000); // Return in seconds
}

/**
 * Convert an event into a human-readable label.
 */
function getEventLabel(event) {
  const labels = {
    "QUEUE_ASSIGNED": "Queue Assigned",
    "LOGIN": "Login",
    "LOGOUT": "Logout",
    "SESSION_ENDED": "Session Ended",
    "TRADE_OPENED": "Trade Opened",
    "AUDIT_VIEWED": "Audit Viewed",
    "AUDIT_RECORDED": "Action Recorded",
    "MAIL_SENT": "Email Sent",
    "MAIL_READ": "Email Read",
    "VALIDATION_ATTEMPT": "Validation Attempted",
    "BREAK_RAISED": "Break Raised",
    "AMENDMENT_APPLIED": "Amendment Applied",
    "AMENDMENT_REQUESTED": "Amendment Requested",
    "TRADE_FORWARDED": "Trade Forwarded",
    "TRADE_APPROVED": "Trade Approved",
    "TRADE_SETTLED": "Trade Settled",
    "TRADE_CLOSED": "Trade Closed",
    "SSI_VERIFIED": "SSI Verified",
    "SSI_SENT": "SSI Sent to Counterparty",
    "LEARNING_EVENT": "Tutor Warning",
    "TUTOR_OPENED": "AI Tutor Opened",
    "FO_CONTACTED": "FO Contacted",
    "FO_ESCALATED": "Escalated to FO",
    "VERIFICATION_RESULT": "System Verification",
    "COMMENT_ADDED": "Comment Added",
    "BOOKING_CHECKED": "Booking Checked",
    "ECONOMICS_CHECKED": "Economics Checked"
  };

  const label = labels[event.eventType] || event.eventType;

  // Append action detail if available
  if (event.metadata?.action && !labels[event.eventType]) {
    return `${label} (${event.metadata.action})`;
  }

  return label;
}

/**
 * Extract relevant details from an event for the timeline display.
 */
function getEventDetails(event) {
  const details = {};

  if (event.metadata?.action) details.action = event.metadata.action;
  if (event.metadata?.mistakeCode) details.mistake = event.metadata.mistakeCode;
  if (event.metadata?.severity) details.severity = event.metadata.severity;
  if (event.metadata?.tradeCount) details.tradeCount = event.metadata.tradeCount;
  if (event.metadata?.subject) details.subject = event.metadata.subject;

  return Object.keys(details).length > 0 ? details : null;
}

module.exports = {
  buildTimeline,
  formatTime,
  formatDuration
};
