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