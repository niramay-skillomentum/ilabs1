const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const ssiRepository = require("../engine/ssiRepository");

// ======================================
// SSI ROUTES
// All SSI lookups query the MongoDB SSIReference collection.
// The SSI Database is a Static Data system — it ONLY returns
// records imported from the SSI Reference Excel file.
// No in-memory fallback. No fake data.
// ======================================

// Single-ID search (for traceability lookups from trade details)
router.get("/search", authenticateToken, async (req, res) => {
  const ssiId = req.query.id;
  if (!ssiId) {
    return res.status(400).json({ success: false, error: "SSI ID is required" });
  }

  try {
    const ssi = await ssiRepository.findByRefId(ssiId);
    if (ssi) {
      const snapshot = ssiRepository.createSnapshot(ssi);
      return res.json({ success: true, ssi: snapshot });
    }
  } catch (err) {
    console.error("[SSI Search] Error:", err.message);
  }

  return res.status(404).json({ success: false, error: "SSI not found in reference database" });
});

// Dual-code search (Alert Code + Acronym Code)
// This is the primary search used by the SSI Database page.
router.get("/search-codes", authenticateToken, async (req, res) => {
  const { alertCode, acronymCode } = req.query;
  
  if (!alertCode || !acronymCode) {
    return res.status(400).json({ success: false, error: "Both Alert Code and Acronym Code are required" });
  }

  try {
    const ssi = await ssiRepository.findByAlertCodes(alertCode, acronymCode);
    if (ssi) {
      const snapshot = ssiRepository.createSnapshot(ssi);
      return res.json({ success: true, ssi: snapshot });
    }
  } catch (err) {
    console.error("[SSI Search-Codes] Error:", err.message);
  }

  return res.status(404).json({ 
    success: false, 
    error: "No SSI found matching both codes. Please verify the Alert Code and Acronym Code from the counterparty's confirmation." 
  });
});

// Reference data traceability lookup
// Returns the master SSI record for a given MongoDB reference ID
router.get("/reference/:refId", authenticateToken, async (req, res) => {
  try {
    const ssi = await ssiRepository.findByRefId(req.params.refId);
    if (!ssi) {
      return res.status(404).json({ success: false, error: "SSI reference not found" });
    }
    const snapshot = ssiRepository.createSnapshot(ssi);
    return res.json({ success: true, ssi: snapshot });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
