// ======================================
// RECONCILIATION API ROUTES
// Exposes reconciliation desk endpoints.
//
// GET  /api/reconciliation/items          — List all recon items (filtered)
// GET  /api/reconciliation/stats          — Dashboard statistics
// GET  /api/reconciliation/item/:itemId   — Get single item detail
// POST /api/reconciliation/allocate       — Ensure & return the 40-row allocation
// GET  /api/reconciliation/allocation     — Check existing allocation (no generation)
// POST /api/reconciliation/manual-match   — User-driven Ledger↔Statement match
// POST /api/reconciliation/run-matching   — Legacy auto-match (not used by UI)
// GET  /api/reconciliation/config         — Get matching configuration
// PUT  /api/reconciliation/config/:id     — Update matching configuration
// GET  /api/reconciliation/matches        — List all match pairs
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const reconService = require("../engine/reconciliationService");
const matchingEngine = require("../engine/matchingEngine");
const allocationService = require("../engine/allocationService");
const ReconciliationConfig = require("../models/ReconciliationConfig");
const { getIo } = require("../engine/socketEngine");
const learningEngine = require("../engine/learningEngine");

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
      matchId: req.query.matchId || null,
      assignedTo: req.query.assignedTo === 'null' ? null : (req.query.assignedTo || undefined)
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
// POST /allocate — Ensure & return the reconciliation allocation
// Idempotent: returns the existing 40-row allocation if 20 reconcilable
// trades already exist; otherwise auto-generates the shortfall as settled
// trades (full lifecycle) and returns the resulting rows.
// ======================================
router.post("/allocate", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || "SYSTEM";
    const result = await allocationService.ensureAllocation(userId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Reconciliation Route] POST /allocate error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /allocation — Check existing allocation (no generation)
// ======================================
router.get("/allocation", authenticateToken, async (req, res) => {
  try {
    const status = await allocationService.getAllocationStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error("[Reconciliation Route] GET /allocation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /apply-trade-id — Apply a Trade ID to a Statement
// ======================================
router.post("/apply-trade-id", authenticateToken, async (req, res) => {
  try {
    const { itemId, tradeRef } = req.body || {};
    
    if (!itemId || !tradeRef) {
      let learning = null;
      try {
        const userId = req.user?.userId;
        learning = await learningEngine.processFailure({ userId, desk: "RECONCILIATION", ruleCode: "RECON_MISSING_FIELDS" });
      } catch (e) { /* non-blocking */ }
      return res.status(400).json({ success: false, message: "Item ID and Trade Reference are required.", learning: learning || undefined });
    }

    const Trade = require("../models/Trade");
    const ReconciliationItem = require("../models/ReconciliationItem");

    const trade = await Trade.findOne({ tradeRef }).lean();
    if (!trade) {
      return res.status(404).json({ success: false, message: "Trade not found in database." });
    }

    const item = await ReconciliationItem.findOne({ itemId: itemId });
    if (!item) {
      return res.status(404).json({ success: false, message: "Reconciliation item not found." });
    }

    item.itemRef1 = trade.tradeRef || null;
    item.itemRef2 = trade.underlyer || null;
    item.itemRef3 = trade.entity || null;
    item.itemRef4 = trade.foRegion || null;
    item.itemRef5 = trade.product || null;
    item.itemRef6 = trade.productType || null;
    item.itemRef7 = trade.counterpartyGroup || trade.counterparty || null;

    await item.save();
    
    try { getIo().emit("recon_desk_update"); } catch(e) { console.error("Socket emit error:", e); }

    return res.json({ success: true, item: item });
  } catch (err) {
    console.error("[Reconciliation Route] POST /apply-trade-id error:", err);
    res.status(500).json({ success: false, message: "Failed to apply trade ID." });
  }
});

// ======================================
// POST /manual-match — User-driven Ledger ↔ Statement match
// Body: { ledgerItemId, statementItemId } (order-independent)
// Returns specific validation reasons for UI feedback on failure.
// ======================================
router.post("/manual-match", authenticateToken, async (req, res) => {
  try {
    const { ledgerItemId, statementItemId } = req.body || {};
    if (!ledgerItemId || !statementItemId) {
      let learning = null;
      try {
        const userId = req.user?.userId;
        learning = await learningEngine.processFailure({ userId, desk: "RECONCILIATION", ruleCode: "RECON_MISSING_PAIR" });
      } catch (e) { /* non-blocking */ }
      return res.status(400).json({ success: false, message: "Select one Ledger and one Statement item.", learning: learning || undefined });
    }

    const result = await matchingEngine.manualMatch(ledgerItemId, statementItemId);
    // Business rejection returns HTTP 200 with success:false so the UI can
    // show a specific toast without treating it as a server error.
    return res.json(result);
  } catch (err) {
    console.error("[Reconciliation Route] POST /manual-match error:", err);
    res.status(500).json({ success: false, message: "Items cannot be matched." });
  }
});

// ======================================
// POST /unmatch — Reverse a user-driven match
// Body: { matchId }
// ======================================
router.post("/unmatch", authenticateToken, async (req, res) => {
  try {
    const { matchId } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ success: false, message: "Match ID is required." });
    }

    const result = await matchingEngine.unmatch(matchId);
    if (result.success) {
      return res.json({ success: true, message: `Match ${matchId} reversed successfully.`, cleared: result.cleared });
    } else {
      return res.status(400).json({ success: false, message: "Failed to reverse match. It may have already been cleared." });
    }
  } catch (err) {
    console.error("[Reconciliation Route] POST /unmatch error:", err);
    res.status(500).json({ success: false, message: "Server error during unmatch." });
  }
});

// ======================================
// POST /run-matching — Trigger the LEGACY auto-match engine
// Preserved for backward compatibility / future auto-match rules.
// NOT used by the reconciliation workstation UI.
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
      { returnDocument: 'after' }
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

// ======================================
// POST /sync — Backfill Ledger and Statement Items
// ======================================
router.post("/sync", authenticateToken, async (req, res) => {
  try {
    const result = await reconService.syncLedgerAndStatements();
    res.json({ success: true, message: "Sync complete", data: result });
  } catch (error) {
    console.error("[ReconSync] Sync error:", error);
    res.status(500).json({ success: false, message: "Sync failed", error: error.message });
  }
});

module.exports = router;
