const { Agenda } = require("agenda");
const mongoose = require("mongoose");
const queueComposer = require("./queueComposer");
const dailyScheduler = require("./dailyScheduler");

let agenda;

// ======================================
// START AGENDA & SCHEDULE
// ======================================

async function startAgenda() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    console.warn("[Agenda] Mongoose not connected. Skipping Agenda startup.");
    return;
  }

  agenda = new Agenda({ 
    db: { address: process.env.MONGO_URI, collection: "agendaJobs" } 
  });

  // Define jobs
  agenda.define("session-cleanup", async (job) => {
    try {
      const cleaned = await queueComposer.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`🧹 [Agenda] Cleaned ${cleaned} expired session(s)`);
      }
    } catch (err) {
      console.warn("[Agenda] Session cleanup error:", err.message);
    }
  });

  agenda.define("daily-age-update", async (job) => {
    try {
      await dailyScheduler.runDailyCycle();
    } catch (err) {
      console.warn("[Agenda] Daily age update error:", err.message);
    }
  });

  await agenda.start();
  console.log("📅 Agenda Background Jobs Started");

  // Schedule repeatable jobs
  await agenda.every("1 minute", "session-cleanup");
  await agenda.every("1 minute", "daily-age-update");
}

// Graceful shutdown
async function stopAgenda() {
  if (agenda) {
    console.log("Stopping Agenda...");
    await agenda.stop();
  }
  process.exit(0);
}

process.on("SIGTERM", stopAgenda);
process.on("SIGINT", stopAgenda);

module.exports = {
  startAgenda
};
