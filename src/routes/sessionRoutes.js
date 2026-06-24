const express = require("express");
const router = express.Router();
const queueComposer = require("../engine/queueComposer");
const { authenticateToken } = require("../middleware/auth");

// ======================================
// SESSION INFO ENDPOINT
// Returns current session state from DB
// ======================================
router.get("/info", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeQueue = await queueComposer.getActiveQueue(userId);

    if (!activeQueue) {
      return res.json({
        success: true,
        hasActiveSession: false,
        userId,
        fullName: req.user.fullName
      });
    }

    res.json({
      success: true,
      hasActiveSession: true,
      userId,
      fullName: req.user.fullName,
      desk: activeQueue.desk,
      queueSize: activeQueue.trades.length,
      sessionStart: activeQueue.sessionStart,
      sessionExpiry: activeQueue.sessionExpiry
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// LOGOUT (DB-BACKED)
// ======================================
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await queueComposer.endSession(userId);

    // Clear auth cookie
    res.setHeader("Set-Cookie", "auth_token=; Path=/; Max-Age=0; SameSite=Lax");

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
