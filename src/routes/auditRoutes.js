const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const auditEngine = require("../engine/auditEngine");
const { authenticateToken } = require("../middleware/auth");
const sessionCollector = require("../engine/performance/sessionCollector");

// ======================================
// AUDIT TRAIL
// ======================================
router.get("/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;

    // Get manual audit logs from AuditLog collection
    const auditTrail = await auditEngine.getAuditTrail(tradeRef);

    // Also get the XML audit from the trade itself (auto-generated history)
    const trade = await Trade.findOne({ tradeRef }).lean();
    let xmlAudit = null;
    if (trade && trade.auditXml) {
      xmlAudit = trade.auditXml;
    }

    // OPI: Track that user viewed the audit trail (fire-and-forget)
    try {
      sessionCollector.collect("AUDIT_VIEWED", {
        tradeRef,
        userId: req.user.userId,
        category: "WORKFLOW",
        metadata: { trailLength: (auditTrail || []).length, hasXml: !!xmlAudit }
      });
    } catch (opiErr) { /* OPI non-blocking */ }

    res.json({
      trail: auditTrail || [],
      xmlAudit: xmlAudit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
