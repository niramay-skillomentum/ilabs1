// ======================================
// BLOOMBERG TERMINAL ROUTES
// Global read-only data access for the Bloomberg terminal.
// All queries fetch the FULL dataset — no desk or user filtering.
// Authentication is still required (JWT or X-Bloomberg-Terminal header).
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Trade = require("../models/Trade");
const AuditLog = require("../models/AuditLog");
const SwiftMessage = require("../models/SwiftMessage");
const ReconciliationItem = require("../models/ReconciliationItem");
const Counterparty = require("../models/Counterparty");
const Security = require("../models/Security");

// ======================================
// GET /trades — All trades in the system (no desk/user filter)
// ======================================
router.get("/trades", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const query = {};

    // Optional filters (desk, status)
    if (req.query.desk) {
      query.nextDesk = req.query.desk.toUpperCase();
    }
    if (req.query.statusPattern) {
      query.currentStatus = { $regex: req.query.statusPattern, $options: "i" };
    }

    const trades = await Trade.find(query)
      .select("tradeRef tradeDate valueDate currentStatus nextDesk amount currency counterparty counterpartyGroup direction entity foRegion product productType tradeType settlementType age underlyer assignedTo truths pendingAmendments verificationErrors booking settlementDetails confirmationScenario foEscalation")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();

    const hasMore = trades.length > limit;
    res.json({
      success: true,
      trades: hasMore ? trades.slice(0, limit) : trades,
      hasMore,
      total: await Trade.countDocuments(query)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /trades/stats — Global trade statistics
// ======================================
router.get("/trades/stats", authenticateToken, async (req, res) => {
  try {
    const [
      totalTrades,
      byStatus,
      byDesk,
      byProduct,
      byCurrency
    ] = await Promise.all([
      Trade.countDocuments(),
      Trade.aggregate([
        { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Trade.aggregate([
        { $group: { _id: "$nextDesk", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Trade.aggregate([
        { $group: { _id: "$product", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Trade.aggregate([
        { $group: { _id: "$currency", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
        { $sort: { totalAmount: -1 } }
      ])
    ]);

    // Derive key metrics
    const settledStatuses = ["SETTLED", "CLOSED", "RECON_CLEARED"];
    const failStatuses = ["SETTLEMENT_FAILED", "CONFIRMATION_FAILED"];
    const breakStatuses = byStatus.filter(s => s._id && s._id.includes("BREAK")).reduce((sum, s) => sum + s.count, 0);
    const settledCount = byStatus.filter(s => settledStatuses.includes(s._id)).reduce((sum, s) => sum + s.count, 0);
    const failedCount = byStatus.filter(s => failStatuses.includes(s._id)).reduce((sum, s) => sum + s.count, 0);
    const pendingCount = totalTrades - settledCount;

    res.json({
      success: true,
      totalTrades,
      settledCount,
      pendingCount,
      failedCount,
      breakCount: breakStatuses,
      byStatus: byStatus.map(s => ({ status: s._id || "UNKNOWN", count: s.count })),
      byDesk: byDesk.map(d => ({ desk: d._id || "UNASSIGNED", count: d.count })),
      byProduct: byProduct.map(p => ({ product: p._id || "UNKNOWN", count: p.count })),
      byCurrency: byCurrency.map(c => ({ currency: c._id || "UNKNOWN", count: c.count, totalAmount: c.totalAmount }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /portfolio — Global portfolio (all trades, no desk filter)
// ======================================
router.get("/portfolio", authenticateToken, async (req, res) => {
  try {
    const trades = await Trade.find()
      .select("tradeRef currentStatus amount currency counterparty direction underlyer product productType tradeType settlementType valueDate tradeDate nextDesk entity")
      .lean();

    const totalTrades = trades.length;
    const settledStatuses = ["SETTLED", "CLOSED", "RECON_CLEARED"];
    const settledTrades = trades.filter(t => settledStatuses.includes(t.currentStatus)).length;
    const pendingTrades = totalTrades - settledTrades;

    // Group by underlyer
    const holdingsMap = {};
    for (const t of trades) {
      const key = t.underlyer || t.product || "UNKNOWN";
      if (!holdingsMap[key]) {
        holdingsMap[key] = {
          security: key,
          isin: "",
          currency: t.currency || "USD",
          product: t.product || "-",
          productType: t.productType || "-",
          buyQty: 0,
          sellQty: 0,
          totalValue: 0,
          tradeCount: 0,
          settledCount: 0,
          latestStatus: t.currentStatus
        };
      }
      const h = holdingsMap[key];
      h.tradeCount++;
      if (t.direction === "BUY") {
        h.buyQty++;
        h.totalValue += (t.amount || 0);
      } else {
        h.sellQty++;
        h.totalValue -= (t.amount || 0);
      }
      if (settledStatuses.includes(t.currentStatus)) {
        h.settledCount++;
      }
      h.latestStatus = t.currentStatus;
    }

    // Enrich with ISIN
    const underlyers = Object.keys(holdingsMap);
    const securities = await Security.find({
      $or: [
        { underlyer: { $in: underlyers } },
        { companyName: { $in: underlyers } }
      ]
    }).select("underlyer companyName isin").lean();

    const isinMap = {};
    for (const sec of securities) {
      if (sec.isin) {
        if (sec.underlyer) isinMap[sec.underlyer] = sec.isin;
        if (sec.companyName) isinMap[sec.companyName] = sec.isin;
      }
    }

    const holdings = Object.values(holdingsMap).map(h => {
      const netQty = h.buyQty - h.sellQty;
      const avgPrice = netQty !== 0 ? Math.abs(h.totalValue / netQty) : 0;
      const marketValue = Math.abs(h.totalValue);
      let status = "Active";
      if (h.settledCount === h.tradeCount) status = "Settled";
      else if (h.settledCount > 0) status = "Partial";

      return {
        security: h.security,
        isin: isinMap[h.security] || "-",
        currency: h.currency,
        product: h.product,
        productType: h.productType,
        quantity: Math.abs(netQty),
        direction: netQty >= 0 ? "LONG" : "SHORT",
        avgPrice: parseFloat(avgPrice.toFixed(4)),
        marketValue: parseFloat(marketValue.toFixed(2)),
        tradeCount: h.tradeCount,
        status
      };
    });

    holdings.sort((a, b) => b.marketValue - a.marketValue);
    const totalHoldings = holdings.reduce((sum, h) => sum + h.marketValue, 0);

    res.json({
      success: true,
      summary: {
        totalHoldings: parseFloat(totalHoldings.toFixed(2)),
        totalTrades,
        settledTrades,
        pendingTrades
      },
      holdings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /audit/:tradeRef — Audit trail for any trade
// ======================================
router.get("/audit/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const auditEngine = require("../engine/auditEngine");

    const auditTrail = await auditEngine.getAuditTrail(tradeRef);
    const trade = await Trade.findOne({ tradeRef }).lean();
    let xmlAudit = null;
    if (trade && trade.auditXml) {
      xmlAudit = trade.auditXml;
    }

    res.json({
      trail: auditTrail || [],
      xmlAudit
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /swift/all — All generated SWIFT messages
// ======================================
router.get("/swift/all", authenticateToken, async (req, res) => {
  try {
    const messages = await SwiftMessage.find()
      .sort({ generatedAt: -1 })
      .limit(500)
      .lean();

    let enriched;
    try {
      const SwiftRenderer = require("../engine/swift/renderers/SwiftRenderer");
      enriched = messages.map(msg => {
        let displayPayload = "";
        try {
          displayPayload = SwiftRenderer.renderDisplay(
            msg.messageType,
            msg.fieldMap || {},
            msg.senderBIC,
            msg.receiverBIC
          );
        } catch (e) {
          displayPayload = msg.messagePayload || "";
        }
        return { ...msg, displayPayload };
      });
    } catch (e) {
      enriched = messages;
    }

    res.json({ success: true, messages: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /swift/:tradeRef — SWIFT messages for a specific trade
// ======================================
router.get("/swift/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const messages = await SwiftMessage.find({ tradeRef })
      .sort({ generatedAt: -1 })
      .lean();

    let enriched;
    try {
      const SwiftRenderer = require("../engine/swift/renderers/SwiftRenderer");
      enriched = messages.map(msg => {
        let displayPayload = "";
        try {
          displayPayload = SwiftRenderer.renderDisplay(
            msg.messageType,
            msg.fieldMap || {},
            msg.senderBIC,
            msg.receiverBIC
          );
        } catch (e) {
          displayPayload = msg.messagePayload || "";
        }
        return { ...msg, displayPayload };
      });
    } catch (e) {
      enriched = messages;
    }

    res.json({
      success: true,
      tradeRef,
      messages: enriched,
      count: enriched.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /reconciliation/items — All reconciliation items
// ======================================
router.get("/reconciliation/items", authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.source) filters.source = req.query.source;
    if (req.query.reconDesk) filters.reconDesk = req.query.reconDesk;
    if (req.query.currency) filters.currency = req.query.currency;

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const skip = parseInt(req.query.skip, 10) || 0;

    const items = await ReconciliationItem.find(filters)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ReconciliationItem.countDocuments(filters);

    res.json({ success: true, items, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /reconciliation/stats — Recon statistics
// ======================================
router.get("/reconciliation/stats", authenticateToken, async (req, res) => {
  try {
    const [
      total,
      byStatus,
      bySource,
      byDesk
    ] = await Promise.all([
      ReconciliationItem.countDocuments(),
      ReconciliationItem.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      ReconciliationItem.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } }
      ]),
      ReconciliationItem.aggregate([
        { $group: { _id: "$reconDesk", count: { $sum: 1 } } }
      ])
    ]);

    const outstanding = byStatus.find(s => s._id === "Outstanding")?.count || 0;
    const matched = byStatus.find(s => s._id === "Matched")?.count || 0;

    res.json({
      success: true,
      total,
      outstanding,
      matched,
      bySource: bySource.map(s => ({ source: s._id, count: s.count })),
      byDesk: byDesk.map(d => ({ desk: d._id || "UNASSIGNED", count: d.count }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /counterparties — All counterparties
// ======================================
router.get("/counterparties", authenticateToken, async (req, res) => {
  try {
    const counterparties = await Counterparty.find()
      .sort({ counterpartyName: 1 })
      .lean();

    res.json({ success: true, data: counterparties });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
