const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const auditEngine = require("../engine/auditEngine");
const { authenticateToken } = require("../middleware/auth");

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

    res.json({
      trail: auditTrail || [],
      xmlAudit: xmlAudit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
