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
router.get("/search", async (req, res) => {
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
router.get("/search-codes", async (req, res) => {
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
router.get("/reference/:refId", async (req, res) => {
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

// SSI Group lookup — returns all SSI IDs for a counterparty group.
// Used by the settlement break dropdown so the user can select an SSI ID.
router.get("/group", async (req, res) => {
  const { groupName, currency } = req.query;

  if (!groupName) {
    return res.status(400).json({ success: false, error: "groupName is required" });
  }

  try {
    const ssis = await ssiRepository.getSSIsByCounterpartyGroup(groupName, currency || null);
    return res.json({ success: true, ssis });
  } catch (err) {
    console.error("[SSI Group] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Entity lookup — returns the entity's own SSI based on entity name and currency.
// Used for SELL trades where the entity is the beneficiary.
router.get("/entity", async (req, res) => {
  const { entityName, currency } = req.query;
  if (!entityName || !currency) {
    return res.status(400).json({ success: false, error: "entityName and currency are required" });
  }

  try {
    const Entity = require("../models/Entity");
    const entity = await Entity.findOne({ entityName, currency });
    if (!entity) {
      return res.status(404).json({ success: false, error: "Entity not found for this currency" });
    }

    // Map the Entity to an SSI-like structure for the frontend
    const ssi = {
      beneficiaryName: entity.accountName || entity.entityName,
      beneficiaryBank: entity.accountWithInstitution,
      accountNumber: entity.accountNumber,
      beneficiaryBIC: entity.bic,
      currency: entity.currency,
      settlementMethod: "SWIFT",
      isEntity: true // Flag to indicate this is our own SSI
    };

    return res.json({ success: true, ssi });
  } catch (err) {
    console.error("[SSI Entity Lookup] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fuzzy identifier lookup
router.get("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const SSIReference = require("../models/SSIReference");
    
    // Exact ssiId match
    let ssi = await SSIReference.findOne({ ssiId: identifier }).lean();
    
    // Partial counterparty name match
    if (!ssi) {
      ssi = await SSIReference.findOne({
        $or: [
          { groupCounterPartyName: new RegExp(identifier, "i") },
          { counterPartyName: new RegExp(identifier, "i") }
        ]
      }).lean();
    }
    
    if (ssi) {
      return res.json({ success: true, data: ssi });
    }
    
    res.status(404).json({ success: false, error: "SSI not found" });
  } catch (error) {
    console.error("Error fetching SSI:", error);
    res.status(500).json({ success: false, error: "Failed to fetch SSI" });
  }
});

module.exports = router;
