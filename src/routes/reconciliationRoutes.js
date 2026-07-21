// ======================================
// RECONCILIATION API ROUTES
// Exposes reconciliation desk endpoints.
//
// GET  /api/reconciliation/items          — List all recon items (filtered)
// GET  /api/reconciliation/stats          — Dashboard statistics
// GET  /api/reconciliation/item/:itemId   — Get single item detail
// POST /api/reconciliation/run-matching   — Trigger matching engine
// GET  /api/reconciliation/config         — Get matching configuration
// PUT  /api/reconciliation/config/:id     — Update matching configuration
// GET  /api/reconciliation/matches        — List all match pairs
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const reconService = require("../engine/reconciliationService");
const matchingEngine = require("../engine/matchingEngine");
const ReconciliationConfig = require("../models/ReconciliationConfig");

// ======================================
// GET /items — List reconciliation items with filtering
// ======================================
router.get("/items", authenticateToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status || null,
      source: req.query.source || null,
      reconDesk: req.query.reconDesk || null,
      currency: req.query.currency || null,
      tradeRef: req.query.tradeRef || null,
      matchId: req.query.matchId || null
    };

    // Remove null filters
    Object.keys(filters).forEach(k => {
      if (!filters[k]) delete filters[k];
    });

    const options = {
      limit: req.query.limit,
      skip: req.query.skip,
      sort: req.query.sort ? JSON.parse(req.query.sort) : undefined
    };

    const result = await reconService.getItems(filters, options);

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("[Reconciliation Route] GET /items error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /stats — Dashboard statistics
// ======================================
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await reconService.getStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    console.error("[Reconciliation Route] GET /stats error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /item/:itemId — Get single item detail
// ======================================
router.get("/item/:itemId", authenticateToken, async (req, res) => {
  try {
    const item = await reconService.getItemById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Reconciliation item not found" });
    }
    return res.json({ success: true, item });
  } catch (err) {
    console.error("[Reconciliation Route] GET /item error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /run-matching — Trigger the matching engine
// ======================================
router.post("/run-matching", authenticateToken, async (req, res) => {
  try {
    const result = await matchingEngine.runMatching();
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("[Reconciliation Route] POST /run-matching error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /config — Get current matching configuration
// ======================================
router.get("/config", authenticateToken, async (req, res) => {
  try {
    const configs = await ReconciliationConfig.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, configs });
  } catch (err) {
    console.error("[Reconciliation Route] GET /config error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// PUT /config/:id — Update matching configuration
// ======================================
router.put("/config/:id", authenticateToken, async (req, res) => {
  try {
    const { enabledFields, autoMatchThreshold, active, description } = req.body;
    const update = {};

    if (enabledFields) update.enabledFields = enabledFields;
    if (autoMatchThreshold !== undefined) update.autoMatchThreshold = autoMatchThreshold;
    if (active !== undefined) update.active = active;
    if (description !== undefined) update.description = description;

    const config = await ReconciliationConfig.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).lean();

    if (!config) {
      return res.status(404).json({ success: false, error: "Configuration not found" });
    }

    return res.json({ success: true, config });
  } catch (err) {
    console.error("[Reconciliation Route] PUT /config error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /matches — List all match pairs
// ======================================
router.get("/matches", authenticateToken, async (req, res) => {
  try {
    const options = {
      limit: req.query.limit,
      skip: req.query.skip
    };

    const matches = await reconService.getMatches(options);
    return res.json({ success: true, matches });
  } catch (err) {
    console.error("[Reconciliation Route] GET /matches error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
