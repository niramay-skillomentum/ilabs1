// ======================================
// PERFORMANCE ROUTES
// API endpoints for the OPI (Operations
// Performance Intelligence) platform.
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const performanceReportEngine = require("../engine/performance/performanceReportEngine");
const sessionCollector = require("../engine/performance/sessionCollector");

// ======================================
// REPORT GENERATION
// POST /api/performance/generate/:sessionId
// Triggers full OPI pipeline for a session.
// ======================================
router.post("/generate/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    console.log(`[OPI API] Report generation requested: session=${sessionId}, user=${userId}`);

    const report = await performanceReportEngine.generateReport(sessionId);

    res.json({
      success: true,
      reportId: report.reportId,
      generationTimeMs: report.generationTimeMs,
      aiTokensUsed: report.aiTokensUsed
    });

  } catch (err) {
    console.error("[OPI API] Generation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// FULL REPORT
// GET /api/performance/report/:reportId
// Returns the complete report document.
// ======================================
router.get("/report/:reportId", authenticateToken, async (req, res) => {
  try {
    const report = await performanceReportEngine.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// STUDENT REPORT VIEW
// GET /api/performance/report/:reportId/student
// ======================================
router.get("/report/:reportId/student", authenticateToken, async (req, res) => {
  try {
    const report = await performanceReportEngine.getStudentReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// MENTOR REPORT VIEW
// GET /api/performance/report/:reportId/mentor
// ======================================
router.get("/report/:reportId/mentor", authenticateToken, async (req, res) => {
  try {
    const report = await performanceReportEngine.getMentorReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// MANAGER REPORT VIEW
// GET /api/performance/report/:reportId/manager
// ======================================
router.get("/report/:reportId/manager", authenticateToken, async (req, res) => {
  try {
    const report = await performanceReportEngine.getManagerReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// USER SESSIONS LIST
// GET /api/performance/sessions/:userId
// ======================================
router.get("/sessions/:userId", authenticateToken, async (req, res) => {
  try {
    const sessions = await performanceReportEngine.getUserSessions(
      req.params.userId,
      { limit: req.query.limit, skip: req.query.skip }
    );
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// MY SESSIONS (convenience — uses JWT userId)
// GET /api/performance/my-sessions
// ======================================
router.get("/my-sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await performanceReportEngine.getUserSessions(
      req.user.userId,
      { limit: req.query.limit, skip: req.query.skip }
    );
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// COMPETENCY PROFILE
// GET /api/performance/competency/:userId
// ======================================
router.get("/competency/:userId", authenticateToken, async (req, res) => {
  try {
    const profile = await performanceReportEngine.getCompetencyProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: "Competency profile not found" });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// MY COMPETENCY (convenience)
// GET /api/performance/my-competency
// ======================================
router.get("/my-competency", authenticateToken, async (req, res) => {
  try {
    const profile = await performanceReportEngine.getCompetencyProfile(req.user.userId);
    res.json({ success: true, profile: profile || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// LEARNING PROFILE
// GET /api/performance/learning-profile/:userId
// ======================================
router.get("/learning-profile/:userId", authenticateToken, async (req, res) => {
  try {
    const profile = await performanceReportEngine.getLearningProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: "Learning profile not found" });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// SESSION TIMELINE
// GET /api/performance/timeline/:sessionId
// ======================================
router.get("/timeline/:sessionId", authenticateToken, async (req, res) => {
  try {
    const timeline = await performanceReportEngine.getSessionTimeline(req.params.sessionId);
    if (!timeline) return res.status(404).json({ error: "Timeline not found" });
    res.json({ success: true, timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// END SESSION (trigger report + cleanup)
// POST /api/performance/end-session
// ======================================
router.post("/end-session", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = await sessionCollector.endSession(userId, "COMPLETED");

    if (!sessionId) {
      return res.json({ success: true, message: "No active session found" });
    }

    // Auto-generate report (Option C)
    let reportId = null;
    try {
      const report = await performanceReportEngine.generateReport(sessionId);
      reportId = report.reportId;
    } catch (err) {
      console.warn("[OPI API] Auto-report generation failed:", err.message);
    }

    res.json({
      success: true,
      sessionId,
      reportId,
      message: reportId
        ? "Session ended and report generated successfully"
        : "Session ended. Report generation will be retried."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// TRACK FRONTEND EVENT
// POST /api/performance/track-event
// Lightweight endpoint for frontend to emit
// OPI events from UI interactions (trade opened,
// view truth, view audit, etc).
// ======================================
const ALLOWED_FRONTEND_EVENTS = [
  "TRADE_OPENED", "CHECK_BOOKING", "ECONOMICS_CHECKED",
  "AUDIT_VIEWED", "SSI_VERIFIED", "BOOKING_CHECKED",
  "MAIL_READ", "LEDGER_VIEWED"
];

router.post("/track-event", authenticateToken, (req, res) => {
  try {
    const { eventType, tradeRef, desk, metadata } = req.body;
    const userId = req.user.userId;

    if (!eventType || !ALLOWED_FRONTEND_EVENTS.includes(eventType)) {
      return res.status(400).json({ error: "Invalid or disallowed event type" });
    }

    sessionCollector.collect(eventType, {
      tradeRef: tradeRef || null,
      userId,
      desk: desk || null,
      category: "WORKFLOW",
      metadata: metadata || {}
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
