// ======================================
// LEARNING ROUTES — API Endpoints
// History, interactions, analytics, and rule registry.
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const learningEngine = require("../engine/learningEngine");
const { getAllRules } = require("../engine/learningRules");

// ======================================
// GET /api/learning/history — User's learning event history
// ======================================
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const options = {
      limit: req.query.limit,
      skip: req.query.skip
    };

    const result = await learningEngine.getUserHistory(userId, options);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Learning Route] GET /history error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /api/learning/interact — Record user interaction
// Body: { eventId, action: 'viewed' | 'dismissed' | 'tutorOpened' }
// ======================================
router.post("/interact", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId, action } = req.body;

    if (!eventId || !action) {
      return res.status(400).json({ success: false, error: "eventId and action are required" });
    }

    if (!["viewed", "dismissed", "tutorOpened"].includes(action)) {
      return res.status(400).json({ success: false, error: "Invalid interaction type" });
    }

    const event = await learningEngine.recordInteraction(eventId, userId, action);
    return res.json({ success: true, event });
  } catch (err) {
    console.error("[Learning Route] POST /interact error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /api/learning/analytics — Aggregated analytics
// Optional query: ?userId=<email> for user-specific analytics
// ======================================
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId;
    const analytics = await learningEngine.getAnalytics(userId);
    return res.json({ success: true, ...analytics });
  } catch (err) {
    console.error("[Learning Route] GET /analytics error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /api/learning/rules — Fetch the complete rule registry
// ======================================
router.get("/rules", authenticateToken, async (req, res) => {
  try {
    const rules = getAllRules();
    return res.json({ success: true, rules });
  } catch (err) {
    console.error("[Learning Route] GET /rules error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
