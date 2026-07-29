// ======================================
// CUTOFF ENFORCER
// Background poller that automatically transitions trades to
// SETTLEMENT_BREAK when their currency cut-off time is missed.
// Also provides handleMissedCutoff() for use in route handlers.
// ======================================

const Trade = require("../models/Trade");
const LifecycleEngine = require("./lifecycle");
const auditEngine = require("./auditEngine");
const cutoffEngine = require("./cutoff");
const simulationClock = require("./clock");

// States where a trade is in the settlement workflow and subject to cut-off
const SETTLEMENT_ACTIVE_STATES = [
  "SETTLEMENT_PENDING",
  "LIASING_WITH_CPTY",
  "PENDING_AMENDMENT",
  "AMENDED",
  "PENDING_APPROVAL"
];

let isProcessing = false;


// ======================================
// EMIT HELPER
// ======================================

function emit(event, userId, data) {
  try {
    const { getIo } = require("./socketEngine");
    const io = getIo();
    if (io) {
      if (userId) io.to(`user_${userId}`).emit(event, data);
      else io.emit(event, data);
    }
  } catch (err) { /* socket not ready — ignore */ }
}


// ======================================
// HANDLE MISSED CUTOFF
// Core function called when a trade's cut-off is breached.
// Transitions to SETTLEMENT_BREAK with reason "Missed Value Date".
// ======================================

async function handleMissedCutoff(trade, userId, isAutomated = true) {
  const currency = trade.currency;
  const cutoffTime = cutoffEngine.getCutoffTimeForCurrency(currency);
  const region = cutoffEngine.getRegionForCurrency(currency);
  const simTime = simulationClock.getFormattedTime();

  // Transition to SETTLEMENT_BREAK if not already there
  if (trade.currentStatus !== "SETTLEMENT_BREAK") {
    try {
      const plain = trade.toObject ? trade.toObject() : trade;
      const updated = LifecycleEngine.transition(plain, "SETTLEMENT_BREAK");
      trade.currentStatus = updated.currentStatus;
    } catch (err) {
      // If transition is not allowed from current state, log and continue
      console.warn(`[CutoffEnforcer] Cannot transition ${trade.tradeRef} from ${trade.currentStatus} to SETTLEMENT_BREAK: ${err.message}`);
      return;
    }
  }

  // Set cut-off tracking fields
  trade.cutoffMissedReason = "Missed Value Date";
  trade.cutoffMissedAtAge = trade.age;

  await trade.save();

  // Create audit entry with detailed reason
  const auditDetails =
    `Missed Value Date — Settlement cut-off for ${currency} (${cutoffTime}, ${region}) ` +
    `was breached at simulated time ${simTime}. Trade moved to SETTLEMENT_BREAK.`;

  await auditEngine.recordEvent(
    trade.tradeRef,
    userId || "System",
    "CUTOFF_MISSED",
    auditDetails,
    isAutomated
  );

  // Emit trade update
  emit("trade_update", trade.assignedTo, {
    tradeRef: trade.tradeRef,
    currentStatus: "SETTLEMENT_BREAK",
    cutoffMissedReason: "Missed Value Date"
  });

  console.log(`[CutoffEnforcer] Trade ${trade.tradeRef} (${currency}) moved to SETTLEMENT_BREAK — ${cutoffTime} cut-off missed`);
}


// ======================================
// BACKGROUND POLLER
// Finds all settlement-active trades whose currency cut-off
// has been breached and auto-transitions them.
// ======================================

async function checkAndEnforceCutoffs() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find all trades in settlement workflow states
    const trades = await Trade.find({
      currentStatus: { $in: SETTLEMENT_ACTIVE_STATES },
      cutoffMissedReason: { $eq: null } // Not already marked as missed
    });

    for (const trade of trades) {
      try {
        if (cutoffEngine.isCutOffBreached(trade.currency)) {
          await handleMissedCutoff(trade, trade.assignedTo || "System", true);
        }
      } catch (err) {
        console.warn(`[CutoffEnforcer] Error processing trade ${trade.tradeRef}:`, err.message);
      }
    }
  } catch (err) {
    console.warn("[CutoffEnforcer] checkAndEnforceCutoffs error:", err.message);
  } finally {
    isProcessing = false;
  }
}


// ======================================
// EXPORT
// ======================================

module.exports = {
  handleMissedCutoff,
  checkAndEnforceCutoffs,
  SETTLEMENT_ACTIVE_STATES
};
