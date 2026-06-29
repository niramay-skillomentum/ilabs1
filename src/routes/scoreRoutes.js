const express = require("express");
const router = express.Router();
const SessionScore = require("../models/SessionScore");
const scoringEngine = require("../engine/scoringEngine");
const { authenticateToken } = require("../middleware/auth");
const Queue = require("../models/Queue");

// Get a specific report by session ID
router.get("/report/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const report = await SessionScore.findOne({ sessionId, userId: req.user.userId }).lean();
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error("Error fetching report:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all past session scores for the logged-in user
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const history = await SessionScore.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
      
    res.json({ success: true, history });
  } catch (err) {
    console.error("Error fetching score history:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Force generate report for current session (e.g. user manually completes session or for debugging)
router.post("/force-report", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Find active queue
    const activeQueue = await Queue.findOne({ userId, isActive: true });
    if (!activeQueue) {
      return res.status(400).json({ error: "No active session found to score." });
    }

    const sessionId = `${userId}_active_${activeQueue.desk}`;
    const report = await scoringEngine.generateReport(userId, sessionId);

    if (!report) {
      return res.status(404).json({ error: "Failed to generate report" });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error("Error forcing report:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
