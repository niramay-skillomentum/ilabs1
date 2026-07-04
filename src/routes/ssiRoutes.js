const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { CPTY_SSIS, ENTITY_SSIS } = require("../engine/tradeGenerator");

// Legacy single-ID search (backward compatibility)
router.get("/search", authenticateToken, (req, res) => {
  const ssiId = req.query.id;
  if (!ssiId) {
    return res.status(400).json({ success: false, error: "SSI ID is required" });
  }

  const allDicts = [CPTY_SSIS, ENTITY_SSIS];
  
  for (const dict of allDicts) {
    for (const key in dict) {
      const ssiList = dict[key];
      const found = ssiList.find(ssi => ssi.ssiId === ssiId);
      if (found) {
        return res.json({ success: true, ssi: found });
      }
    }
  }

  return res.status(404).json({ success: false, error: "SSI not found in database" });
});

// Dual-code search (Alert Code + Acronym Code)
router.get("/search-codes", authenticateToken, (req, res) => {
  const { alertCode, acronymCode } = req.query;
  
  if (!alertCode || !acronymCode) {
    return res.status(400).json({ success: false, error: "Both Alert Code and Acronym Code are required" });
  }

  const allDicts = [CPTY_SSIS, ENTITY_SSIS];
  
  for (const dict of allDicts) {
    for (const key in dict) {
      const ssiList = dict[key];
      const found = ssiList.find(ssi => ssi.alertCode === alertCode.trim() && ssi.acronymCode === acronymCode.trim());
      if (found) {
        return res.json({ success: true, ssi: found });
      }
    }
  }

  return res.status(404).json({ success: false, error: "No SSI found matching both codes. Please verify the Alert Code and Acronym Code." });
});

module.exports = router;
