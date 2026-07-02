// ======================================
// QUEUE COMPOSER (DATABASE-BACKED)
// Graduated allocation: assigns more from DB when
// pool is large, scales down as pool depletes.
//
// Assignment: 20 trades per user (12 clean + 8 break)
// ======================================

const Trade = require("../models/Trade");
const Queue = require("../models/Queue");
const SystemConfig = require("../models/SystemConfig");
const tradeGenerator = require("./tradeGenerator");
const ageCalculator = require("./ageCalculator");

// ============================
// CONFIGURATION
// ============================
const TOTAL_TRADES = 20;
const CLEAN_TARGET = 12;
const BREAK_TARGET = 8;

// The "full pool" size — when this many unassigned trades exist,
// the system allocates all 20 from DB (100%).
// Below this, allocation scales down using sqrt curve.
const FULL_POOL_SIZE = 1000;

// Minimum DB pool below which we generate everything fresh
const MIN_DB_POOL = 50;

// Session duration: 3 hours in milliseconds
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;

// ============================
// GRADUATED ALLOCATION FORMULA
// ============================
// Uses Exponential Decay to provide a smooth, natural curve:
//
//   y = 20 * (1 - e^(-k * availablePool))
//
// With k = 0.003, it perfectly models natural resource depletion:
//   Pool 1000  → ~19 from DB,  1 generated
//   Pool  500  → ~15 from DB,  5 generated
//   Pool  250  → ~10 from DB, 10 generated
//   Pool  100  →  ~5 from DB, 15 generated
// ============================

function calculateDbAllocation(availablePool) {
  if (availablePool < MIN_DB_POOL) return 0;

  const k = 0.003;
  const dbCount = Math.floor(TOTAL_TRADES * (1 - Math.exp(-k * availablePool)));

  return Math.max(0, Math.min(TOTAL_TRADES, dbCount));
}

// ============================
// BREAK DETECTION
// ============================
function isBreakTrade(trade, desk) {
  if (desk === "CONFIRMATION") {
    const truthEngine = require("./truthEngine");
    return truthEngine.getConfirmationMismatches(trade).length > 0;
  }

  const moTruth = trade.truths?.mo;
  if (!moTruth || !trade.booking) return false;
  return (
    moTruth.amount !== trade.booking.amount ||
    (moTruth.valueDate && trade.booking.valueDate &&
      new Date(moTruth.valueDate).getTime() !== new Date(trade.booking.valueDate).getTime()) ||
    moTruth.currency !== trade.booking.currency ||
    moTruth.counterparty !== trade.booking.counterparty
  );
}

// ============================
// SHUFFLE UTILITY
// ============================
function shuffle(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================
// MAIN QUEUE BUILDER
// ============================

class QueueComposer {

  /**
   * Build a queue of 20 trades for a user.
   *
   * Graduated allocation:
   *   - Large DB pool → mostly from DB
   *   - Small DB pool → mostly generated
   *   - Always maintains 12 clean + 8 break ratio
   *
   * @param {string} desk - MO, CONFIRMATION, or SETTLEMENT
   * @param {string} userId - The user requesting the queue
   * @returns {Object} { trades: Array, sessionExpiry: Date }
   */
  async buildQueue(desk, userId) {

    // 1. Check if user already has an active session
    const existingQueue = await Queue.findOne({ userId, isActive: true });
    if (existingQueue) {
      if (existingQueue.sessionExpiry && new Date() > new Date(existingQueue.sessionExpiry)) {
        await this.expireSession(userId);
      } else {
        throw new Error("Complete your current queue first");
      }
    }

    // 2. Count unassigned trades in DB for this desk
    const moStatuses = ["MO_PENDING", "MO_BREAK_OPEN", "PENDING_FO_RESPONSE"];
    const confirmStatuses = ["CONFIRMATION_PENDING", "CONFIRMATION_BREAK", "LIASING_WITH_CPTY", "LIASING_WITH_FO"];
    const settsStatuses = ["SETTLEMENT_PENDING", "SETTLEMENT_BREAK", "READY_FOR_APPROVAL"];
    
    const unassignedQuery = {
      assignedTo: null,
      nextDesk: desk
    };

    if (desk === "MO") {
      unassignedQuery.currentStatus = { $in: moStatuses };
    } else if (desk === "CONFIRMATION") {
      unassignedQuery.currentStatus = { $in: confirmStatuses };
    } else if (desk === "SETTLEMENT") {
      unassignedQuery.currentStatus = { $in: settsStatuses };
    }

    const unassignedCount = await Trade.countDocuments(unassignedQuery);

    // 3. Calculate graduated allocation
    const dbAllocation = calculateDbAllocation(unassignedCount);
    const genAllocation = TOTAL_TRADES - dbAllocation;

    console.log(`📊 DB Pool: ${unassignedCount} unassigned ${desk} trades`);
    console.log(`📊 Allocation: ${dbAllocation} from DB + ${genAllocation} generated`);

    let selectedClean = [];
    let selectedBreaks = [];

    // ============================
    // ASSIGN FROM DB
    // ============================
    if (dbAllocation > 0) {

      // Calculate clean/break split for DB allocation
      // Maintain the 60/40 ratio (12:8 = 0.6:0.4)
      const dbCleanTarget = Math.round(dbAllocation * 0.6);
      const dbBreakTarget = dbAllocation - dbCleanTarget;

      // Fetch extra trades for filtering (2x to have enough clean/break variety)
      const fetchLimit = Math.min(unassignedCount, dbAllocation * 3);

      const dbTrades = await Trade.find(unassignedQuery)
        .limit(fetchLimit)
        .lean();

      // Recalculate age for each DB trade using desk-specific rules
      // and filter out stale trades (age > 1) so only recent trades are assigned
      const now = new Date();
      const freshDbTrades = dbTrades
        .map(t => {
          t.age = ageCalculator.calculateAge(t.tradeDate, now, desk);
          return t;
        })
        .filter(t => t.age <= 1);

      const shuffledDbTrades = shuffle(freshDbTrades);

      // Separate into clean and break
      const dbClean = shuffledDbTrades.filter(t => !isBreakTrade(t, desk));
      const dbBreaks = shuffledDbTrades.filter(t => isBreakTrade(t, desk));

      // Pick from DB
      const cleanPick = Math.min(dbClean.length, dbCleanTarget);
      const breakPick = Math.min(dbBreaks.length, dbBreakTarget);

      selectedClean = dbClean.slice(0, cleanPick);
      selectedBreaks = dbBreaks.slice(0, breakPick);

      console.log(`📦 From DB: ${selectedClean.length} clean + ${selectedBreaks.length} break`);
    }

    // ============================
    // GENERATE REMAINING TRADES
    // ============================
    const remainingClean = CLEAN_TARGET - selectedClean.length;
    const remainingBreaks = BREAK_TARGET - selectedBreaks.length;

    if (remainingClean > 0 || remainingBreaks > 0) {
      console.log(`🔧 Generating: ${remainingClean} clean + ${remainingBreaks} break`);

      let settlementInitialState = "SETTLEMENT_PENDING";
      if (desk === "SETTLEMENT") {
        try {
          const config = await SystemConfig.findOne({ key: "SETTLEMENT_INITIAL_STATE" });
          if (config && config.value) {
            settlementInitialState = config.value;
          }
        } catch (e) {
          console.error("Error fetching SETTLEMENT_INITIAL_STATE config:", e);
        }
      }

      const generated = tradeGenerator.generateTrades(remainingClean, remainingBreaks, desk, settlementInitialState);
      const saved = await tradeGenerator.saveGeneratedTrades(generated);

      const genClean = saved.filter(t => !isBreakTrade(t, desk));
      const genBreaks = saved.filter(t => isBreakTrade(t, desk));

      selectedClean = selectedClean.concat(genClean);
      selectedBreaks = selectedBreaks.concat(genBreaks);
    }

    // ============================
    // ASSEMBLE FINAL QUEUE
    // ============================
    let queue = [...selectedClean, ...selectedBreaks];

    // Handle edge cases — ensure exactly 20 trades
    if (queue.length < TOTAL_TRADES) {
      const shortage = TOTAL_TRADES - queue.length;
      console.log(`⚠️ Queue short by ${shortage}. Generating filler trades.`);
      let settlementInitialState = "SETTLEMENT_PENDING";
      if (desk === "SETTLEMENT") {
        try {
          const config = await SystemConfig.findOne({ key: "SETTLEMENT_INITIAL_STATE" });
          if (config && config.value) {
            settlementInitialState = config.value;
          }
        } catch (e) {
          console.error("Error fetching SETTLEMENT_INITIAL_STATE config:", e);
        }
      }

      const filler = tradeGenerator.generateTrades(
        Math.ceil(shortage * 0.6),
        Math.floor(shortage * 0.4),
        desk,
        settlementInitialState
      );
      const savedFiller = await tradeGenerator.saveGeneratedTrades(filler);
      queue = queue.concat(savedFiller);
    }

    // Trim to exactly 20
    queue = queue.slice(0, TOTAL_TRADES);

    // Shuffle for variety
    queue = shuffle(queue);

    // Recalculate age for all trades in final queue using desk-specific rules
    const ageNow = new Date();
    queue.forEach(t => {
      t.age = ageCalculator.calculateAge(t.tradeDate, ageNow, desk);
    });

    // Mark all trades as assigned to this user and persist the recalculated age using bulkWrite for performance
    const tradeRefs = queue.map(t => t.tradeRef);
    const bulkOps = queue.map(t => ({
      updateOne: {
        filter: { tradeRef: t.tradeRef },
        update: { $set: { assignedTo: userId, age: t.age } }
      }
    }));
    await Trade.bulkWrite(bulkOps);

    // Create session record
    const sessionStart = new Date();
    const sessionExpiry = new Date(sessionStart.getTime() + SESSION_DURATION_MS);

    await Queue.findOneAndUpdate(
      { userId },
      {
        userId,
        desk,
        trades: tradeRefs,
        sessionStart,
        sessionExpiry,
        isActive: true,
        lastActivity: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Count states in final queue
    const stateBreakdown = {};
    queue.forEach(t => {
      stateBreakdown[t.currentStatus] = (stateBreakdown[t.currentStatus] || 0) + 1;
    });
    const stateStr = Object.entries(stateBreakdown).map(([k, v]) => `${k}:${v}`).join(", ");

    console.log(`✅ Queue for ${userId}: ${queue.length} trades (${selectedClean.length} clean + ${selectedBreaks.length} break)`);
    console.log(`   States: ${stateStr}`);
    console.log(`   Session expires: ${sessionExpiry.toISOString()}`);

    return {
      trades: queue,
      sessionExpiry
    };
  }

  /**
   * Expire a user's session.
   * Trades keep their current state but are unassigned.
   */
  async expireSession(userId) {
    console.log(`⏰ Expiring session for ${userId}`);

    await Trade.updateMany(
      { assignedTo: userId },
      { $set: { assignedTo: null } }
    );

    await Queue.findOneAndUpdate(
      { userId },
      { $set: { isActive: false } }
    );
  }

  /**
   * Get a user's active queue from DB.
   * Returns null if no active queue or session expired.
   */
  async getActiveQueue(userId) {
    const queueDoc = await Queue.findOne({ userId, isActive: true });

    if (!queueDoc) return null;

    // Check session expiry
    if (queueDoc.sessionExpiry && new Date() > new Date(queueDoc.sessionExpiry)) {
      await this.expireSession(userId);
      return null;
    }

    // Fetch the actual trade objects
    const trades = await Trade.find({
      tradeRef: { $in: queueDoc.trades },
      assignedTo: userId
    }).lean();

    return {
      desk: queueDoc.desk,
      trades,
      sessionStart: queueDoc.sessionStart,
      sessionExpiry: queueDoc.sessionExpiry
    };
  }

  /**
   * End a user's session (logout).
   * Trades retain their current state in DB but become unassigned.
   */
  async endSession(userId) {
    console.log(`🔚 User logged out: ${userId}. Session remains active in background.`);
    // Trades are deliberately NOT unassigned. The 3-hour timer continues running.
  }

  /**
   * Check and expire all stale sessions.
   * Called periodically by the server.
   */
  async cleanupExpiredSessions() {
    const expired = await Queue.find({
      isActive: true,
      sessionExpiry: { $lt: new Date() }
    });

    for (const session of expired) {
      await this.expireSession(session.userId);
      console.log(`🧹 Cleaned up expired session: ${session.userId}`);
    }

    return expired.length;
  }

  /**
   * Update the last activity timestamp for a user's session.
   */
  async touchSession(userId) {
    await Queue.findOneAndUpdate(
      { userId, isActive: true },
      { $set: { lastActivity: new Date() } }
    );
  }
}

module.exports = new QueueComposer();
