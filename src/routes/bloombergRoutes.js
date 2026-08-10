const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const AuditLog = require("../models/AuditLog");
const SwiftMessage = require("../models/SwiftMessage");
const ReconciliationItem = require("../models/ReconciliationItem");
const Counterparty = require("../models/Counterparty");

// Helper for async routes
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Trade statistics
router.get("/trades/stats", asyncHandler(async (req, res) => {
  const trades = await Trade.find({}).lean();
  const totalTrades = trades.length;
  
  let settledCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let breakCount = 0;
  
  const byCurrency = {};
  const byDesk = {};

  trades.forEach(t => {
    if (t.currentStatus === 'SETTLED') settledCount++;
    else if (t.currentStatus && (t.currentStatus.includes('BREAK') || t.currentStatus.includes('FAIL'))) failedCount++;
    else pendingCount++;
    
    const ccy = t.currency || 'USD';
    byCurrency[ccy] = (byCurrency[ccy] || 0) + (t.amount || 0);
    
    const desk = t.nextDesk || 'UNASSIGNED';
    byDesk[desk] = (byDesk[desk] || 0) + 1;
  });

  const ccyArray = Object.keys(byCurrency)
    .map(c => ({ currency: c, totalAmount: byCurrency[c] }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
  
  const deskArray = Object.keys(byDesk)
    .map(d => ({ desk: d, count: byDesk[d] }));

  res.json({
    success: true,
    totalTrades,
    settledCount,
    pendingCount,
    failedCount,
    breakCount,
    byCurrency: ccyArray,
    byDesk: deskArray
  });
}));

// All trades global
router.get("/trades", asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.desk) query.nextDesk = req.query.desk;
  if (req.query.statusPattern) query.currentStatus = { $regex: req.query.statusPattern, $options: 'i' };
  
  let q = Trade.find(query);
  if (req.query.limit) q = q.limit(parseInt(req.query.limit));
  
  const trades = await q.lean();
  res.json({ success: true, trades });
}));

// Global portfolio
router.get("/portfolio", asyncHandler(async (req, res) => {
  const trades = await Trade.find({}).lean();
  res.json(trades);
}));

// Audit trail
router.get("/audit/:tradeRef", asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({ tradeRef: req.params.tradeRef }).sort({ timestamp: -1 }).lean();
  res.json(logs);
}));

// Swift messages
router.get("/swift/:tradeRef", asyncHandler(async (req, res) => {
  const messages = await SwiftMessage.find({ tradeRef: req.params.tradeRef }).lean();
  res.json(messages);
}));

router.get("/swift/all", asyncHandler(async (req, res) => {
  const messages = await SwiftMessage.find({}).limit(100).lean();
  res.json(messages);
}));

// Reconciliation items
router.get("/reconciliation/items", asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.source) query.source = req.query.source;
  const items = await ReconciliationItem.find(query).lean();
  res.json(items);
}));

// Reconciliation stats
router.get("/reconciliation/stats", asyncHandler(async (req, res) => {
  const items = await ReconciliationItem.find({}).lean();
  res.json({ total: items.length });
}));

// Counterparties
router.get("/counterparties", asyncHandler(async (req, res) => {
  const counterparties = await Counterparty.find({}).lean();
  res.json(counterparties);
}));

module.exports = router;
