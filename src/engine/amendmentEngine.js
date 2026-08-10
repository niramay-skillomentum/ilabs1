// ======================================
// AMENDMENT ENGINE (V2 — MULTI-AMENDMENT WITH HISTORY)
// Supports desk-aware amendments, sequential numbering,
// and full history preservation across the trade lifecycle.
// ======================================

/**
 * Extract suggested amendments from an AI response message.
 * Used by communication engine when processing FO/CPTY replies.
 */
function extractAmendments(message, trade) {

  const amendments = [];

  const text = message.toLowerCase();

  // -----------------------------
  // AMOUNT EXTRACTION
  // -----------------------------
  const amountMatch = text.match(/(\d{5,})/);

  if (amountMatch) {
    const newAmount = parseInt(amountMatch[1]);

    if (!isNaN(newAmount) && newAmount !== trade.amount) {
      amendments.push({
        field: "amount",
        oldValue: trade.amount,
        newValue: newAmount,
        source: "AI",
        status: "PENDING",
        timestamp: Date.now()
      });
    }
  }

  // -----------------------------
  // VALUE DATE EXTRACTION
  // -----------------------------
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);

  if (dateMatch) {
    const newDate = new Date(dateMatch[0]);

    if (newDate.toString() !== "Invalid Date") {
      amendments.push({
        field: "valueDate",
        oldValue: trade.valueDate,
        newValue: newDate,
        source: "AI",
        status: "PENDING",
        timestamp: Date.now()
      });
    }
  }

  // -----------------------------
  // CURRENCY EXTRACTION
  // -----------------------------
  const ccyMatch = text.match(/\b(USD|EUR|GBP|JPY|CHF|AUD)\b/i);
  if (ccyMatch) {
    const newCcy = ccyMatch[1].toUpperCase();
    if (newCcy !== trade.currency) {
      amendments.push({
        field: "currency",
        oldValue: trade.currency,
        newValue: newCcy,
        source: "AI",
        status: "PENDING",
        timestamp: Date.now()
      });
    }
  }

  return amendments;
}

/**
 * Attach amendments to a trade's pending amendments array.
 */
function attachAmendments(trade, amendments) {

  if (!amendments || amendments.length === 0) return;

  if (!trade.pendingAmendments) {
    trade.pendingAmendments = [];
  }

  trade.pendingAmendments.push(...amendments);
}

/**
 * Create an amendment from a specific field value (user or system input).
 * @param {Object} trade - The trade object
 * @param {string} field - Field to amend
 * @param {*} value - New value
 * @param {string} desk - "MO" or "CONFIRMATION"
 * @param {string} source - "USER", "AI", "FO", "CPTY"
 */
function createAmendment(trade, field, value, desk = "MO", source = "USER") {

  if (!trade || !trade.booking) return null;

  const currentValue = trade.booking[field];

  if (currentValue === value) return null;

  const amendmentNumber = (trade.amendmentHistory?.length || 0) + 
                          (trade.pendingAmendments?.length || 0) + 1;

  return {
    amendmentNumber,
    desk,
    field,
    oldValue: currentValue,
    newValue: value,
    source,
    status: "PENDING",
    timestamp: Date.now()
  };
}

/**
 * Legacy compatibility wrapper.
 * Creates amendment by comparing truth vs booking.
 */
function createAmendmentFromInput(trade, field, value) {

  if (!trade || !trade.truths?.mo || !trade.booking) return null;

  const expected = trade.truths.mo[field];

  if (expected === value && trade.booking[field] !== value) {

    return {
      field,
      oldValue: trade.booking[field],
      newValue: value,
      source: "USER",
      status: "PENDING",
      timestamp: Date.now()
    };
  }

  return null;
}

/**
 * Apply a single amendment to the trade's booking and top-level fields.
 * Moves the amendment to history.
 * @param {Object} trade - The trade object (Mongoose document or plain)
 * @param {Object} amendment - The amendment to apply
 * @param {string} userId - Who applied it
 */
function applyAmendment(trade, amendment, userId) {

  // Apply to booking
  if (trade.booking) {
    trade.booking[amendment.field] = amendment.newValue;
  }

  // Apply to top-level trade fields
  if (trade[amendment.field] !== undefined) {
    trade[amendment.field] = amendment.newValue;
  }

  // Record in history
  if (!trade.amendmentHistory) {
    trade.amendmentHistory = [];
  }

  trade.amendmentHistory.push({
    amendmentNumber: amendment.amendmentNumber || (trade.amendmentHistory.length + 1),
    desk: amendment.desk || "MO",
    field: amendment.field,
    oldValue: amendment.oldValue,
    newValue: amendment.newValue,
    source: amendment.source || "USER",
    status: "ACCEPTED",
    appliedAt: new Date(),
    appliedBy: userId
  });
}

/**
 * Apply all pending amendments that have status "ACCEPTED".
 * Clears pending amendments after applying.
 * @param {Object} trade - The trade object
 * @param {string} userId - Who approved
 */
function applyAllAccepted(trade, userId) {
  if (!trade.pendingAmendments || trade.pendingAmendments.length === 0) return;

  const accepted = trade.pendingAmendments.filter(a => a.status === "ACCEPTED");

  for (const amendment of accepted) {
    applyAmendment(trade, amendment, userId);
  }

  // Clear pending
  trade.pendingAmendments = [];
}

module.exports = {
  extractAmendments,
  attachAmendments,
  createAmendment,
  createAmendmentFromInput,
  applyAmendment,
  applyAllAccepted
};