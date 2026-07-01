const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { generateTutorResponse } = require("../engine/tutorAI");

// POST /api/chat/tutor
router.post("/tutor", authenticateToken, async (req, res) => {
  try {
    const { message, desk, tradeContext, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const aiResponse = await generateTutorResponse(message, desk, tradeContext, history || []);

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat Tutor Route Error:", error);
    res.status(500).json({ error: "Failed to generate tutor response." });
  }
});

module.exports = router;
