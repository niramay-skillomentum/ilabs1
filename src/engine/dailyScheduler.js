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

      let updated = 0;
      for (const trade of trades) {
        if (trade.tradeDate) {
          const desk = trade.nextDesk || "MO";
          const newAge = ageCalculator.calculateAge(trade.tradeDate, now, desk);

          if (newAge !== trade.age) {
            await Trade.updateOne(
              { tradeRef: trade.tradeRef },
              { $set: { age: newAge } }
            );
            updated++;
          }
        }
      }

      console.log(`Daily evaluation complete — ${updated} trade(s) age-updated`);
    } catch (err) {
      console.error("Daily cycle error:", err.message);
    }
  }

}

module.exports = new DailyScheduler();
