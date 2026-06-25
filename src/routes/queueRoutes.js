const express = require("express");
const router = express.Router();
const queueComposer = require("../engine/queueComposer");
const simulationClock = require("../engine/clock");
const { authenticateToken } = require("../middleware/auth");

// ======================================
// QUEUE GENERATION (DB-BACKED)
// ======================================
router.post("/generate", authenticateToken, async (req, res) => {
  try {
    const { desk } = req.body;
    const userId = req.user.userId;

    const validDesks = ["MO", "CONFIRMATION", "SETTLEMENT"];
    if (!validDesks.includes(desk)) {
      return res.status(400).json({ error: "Invalid desk specified. Must be MO, CONFIRMATION, or SETTLEMENT" });
    }

    simulationClock.reset();
    simulationClock.start();

    const result = await queueComposer.buildQueue(desk, userId);

    res.json({
      success: true,
      desk,
      queueSize: result.trades.length,
      trades: result.trades,
      sessionStart: result.sessionStart,
      sessionExpiry: result.sessionExpiry
    });

  } catch (err) {
    if (err.message === "Complete your current queue first") {
      return res.json({
        success: false,
        error: err.message
      });
    }
    console.error("Queue generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// GET MY QUEUE (DB-BACKED)
// ======================================
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestedDesk = req.query.desk; // optional: the desk the user is currently viewing

    const activeQueue = await queueComposer.getActiveQueue(userId);

    if (!activeQueue) {
      return res.status(400).json({ error: "No active queue" });
    }

    // If a desk was specified and it doesn't match the active queue's desk,
    // tell the user to complete the other desk first
    if (requestedDesk && activeQueue.desk !== requestedDesk) {
      return res.status(400).json({
        error: `Complete your ${activeQueue.desk} desk queue first`,
        activeDesk: activeQueue.desk
      });
    }

    // Touch session to track activity
    await queueComposer.touchSession(userId);

    res.json({
      success: true,
      desk: activeQueue.desk,
      queueSize: activeQueue.trades.length,
      trades: activeQueue.trades,
      sessionStart: activeQueue.sessionStart,
      sessionExpiry: activeQueue.sessionExpiry
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
