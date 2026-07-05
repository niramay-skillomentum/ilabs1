// ======================================
// DAILY SCHEDULER
// Periodic maintenance tasks
// ======================================

const Trade = require("../models/Trade");
const ageCalculator = require("./ageCalculator");

class DailyScheduler {

  async runDailyCycle() {
    console.log("Running Daily Cycle...");

    try {
      // Update age for all trades using desk-specific rules
      const now = new Date();
      const trades = await Trade.find({}).lean();

      // Accumulate changed ages and flush in a single bulkWrite instead of
      // N sequential round-trips.
      const ops = [];
      for (const trade of trades) {
        if (trade.tradeDate) {
          const desk = trade.nextDesk || "MO";
          const newAge = ageCalculator.calculateAge(trade.tradeDate, now, desk);

          if (newAge !== trade.age) {
            ops.push({
              updateOne: {
                filter: { tradeRef: trade.tradeRef },
                update: { $set: { age: newAge } }
              }
            });
          }
        }
      }

      if (ops.length) await Trade.bulkWrite(ops, { ordered: false });

      console.log(`Daily evaluation complete — ${ops.length} trade(s) age-updated`);
    } catch (err) {
      console.error("Daily cycle error:", err.message);
    }
  }

}

module.exports = new DailyScheduler();
