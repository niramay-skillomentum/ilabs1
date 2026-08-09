// ======================================
// AUDIT ENGINE (MONGODB-ONLY)
// Tracks all operational events
// No in-memory fallback — DB required
// ======================================

const { getIsConnected } = require("../db");
let AuditLog;
try {
  AuditLog = require("../models/AuditLog");
} catch (e) {
  AuditLog = null;
}

/**
 * Record an audit event
 */
async function recordEvent(tradeRef, actor, action, details = "", isAutomated = false) {

  const event = {
    tradeRef,
    userId: actor,
    action,
    details: typeof details === "object" ? JSON.stringify(details) : details,
    timestamp: new Date(),
    isAutomated: !!isAutomated
  };

  if (getIsConnected() && AuditLog) {
    try {
      await AuditLog.create(event);
    } catch (err) {
      console.warn("DB audit write:", err.message);
    }
  }

  // OPI: Forward to session collector (fire-and-forget)
  try {
    require("./performance/sessionCollector").collect("AUDIT_RECORDED", {
      tradeRef, userId: actor, metadata: { action, details: typeof details === "object" ? JSON.stringify(details) : details, isAutomated: !!isAutomated }
    });
  } catch (e) { /* OPI not loaded — silent */ }

  return event;
}


/**
 * Get audit history for a trade
 */
async function getAuditTrail(tradeRef) {

  if (getIsConnected() && AuditLog) {
    try {
      return await AuditLog.find({ tradeRef }).sort({ timestamp: 1 }).lean();
    } catch (err) {
      console.warn("DB audit read:", err.message);
    }
  }

  return [];
}


module.exports = {
  recordEvent,
  getAuditTrail
};