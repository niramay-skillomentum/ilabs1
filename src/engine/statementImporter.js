// ======================================
// STATEMENT IMPORTER
// Creates Statement Reconciliation Items from SWIFT Messages.
//
// Called fire-and-forget after SWIFT message generation (SwiftEngine).
// Never modifies the SWIFT Message or Trade Object.
// Never blocks the SWIFT generation flow.
//
// For each SWIFT message:
//   - Creates ONE ReconciliationItem with source = "STATEMENT"
//   - Status = "Outstanding"
//   - MatchId = null
//   - Populates SWIFT refs (ref1-ref8) from SWIFT message fieldMap
// ======================================

const ReconciliationItem = require("../models/ReconciliationItem");
const reconService = require("./reconciliationService");

/**
 * Create a Statement Reconciliation Item from a generated SWIFT message.
 * Fire-and-forget — errors are logged but never propagated.
 *
 * @param {Object} swiftMessage - SwiftMessage document (lean or mongoose)
 * @param {Object} trade        - Trade document (lean) for trade-level references
 */
async function createStatementItem(swiftMessage, trade) {
  try {
    if (!swiftMessage || !trade) return;

    // Only import successfully generated messages
    if (swiftMessage.status !== "GENERATED") return;

    const itemId = await reconService.generateItemId();
    const fieldMap = swiftMessage.fieldMap || {};

    const item = await ReconciliationItem.create({
      itemId,
      status: "Outstanding",
      source: "STATEMENT",
      itemType: reconService.deriveItemType("STATEMENT", trade.direction),

      // Trade economics (from SWIFT message, which mirrors trade)
      amount: swiftMessage.amount || trade.amount,
      currency: swiftMessage.currency || trade.currency,
      tradeDate: trade.tradeDate,
      valueDate: swiftMessage.valueDate || trade.valueDate,

      // Recon desk (derived from trade's FO Region)
      reconDesk: reconService.deriveReconDesk(trade.foRegion),

      // Match ID — null until matched
      matchId: null,

      // Item References (trade-level — same as ledger)
      itemRef1: trade.tradeRef || null,
      itemRef2: trade.underlyer || null,
      itemRef3: trade.entity || null,
      itemRef4: trade.truths?.settlement?.country || null,
      itemRef5: trade.product || null,
      itemRef6: trade.productType || null,

      // SWIFT References (statement-level)
      ref1: extractBuyerBIC(swiftMessage, trade),
      ref2: extractSellerAccount(swiftMessage, fieldMap, trade),
      ref3: extractBuyerAccount(swiftMessage, fieldMap, trade),
      ref4: extractSellerBIC(swiftMessage, trade),
      ref5: extractField20(fieldMap, trade),
      ref6: extractField56A(fieldMap),
      ref7: extractInstitutionName(fieldMap, swiftMessage),
      ref8: extractBankName(fieldMap, trade)
    });

    console.log(`[StatementImporter] Created statement item ${itemId} for ${trade.tradeRef} (${swiftMessage.messageType})`);
    return item;

  } catch (err) {
    console.warn(`[StatementImporter] Error creating statement item for ${trade?.tradeRef}:`, err.message);
  }
}

// ======================================
// SWIFT FIELD EXTRACTORS
// Map SWIFT message data to ref1-ref8
// ======================================

/**
 * ref1 — Buyer BIC
 * For BUY trades: receiverBIC (counterparty receives our payment)
 * For SELL trades: senderBIC (counterparty sends us payment)
 */
function extractBuyerBIC(swiftMessage, trade) {
  const dir = String(trade.direction || "").toUpperCase();
  if (dir === "BUY" || dir === "PAY") {
    return swiftMessage.senderBIC || null;
  }
  return swiftMessage.receiverBIC || null;
}

/**
 * ref2 — Seller Account
 */
function extractSellerAccount(swiftMessage, fieldMap, trade) {
  // Try to extract from SWIFT field :59: (Beneficiary) for BUY
  // or :50: (Ordering Customer) for SELL
  const dir = String(trade.direction || "").toUpperCase();
  if (dir === "BUY" || dir === "PAY") {
    return fieldMap[":59:"]?.account || fieldMap[":59A:"] || null;
  }
  return fieldMap[":50K:"]?.account || fieldMap[":50A:"] || null;
}

/**
 * ref3 — Buyer Account
 */
function extractBuyerAccount(swiftMessage, fieldMap, trade) {
  const dir = String(trade.direction || "").toUpperCase();
  if (dir === "BUY" || dir === "PAY") {
    return fieldMap[":50K:"]?.account || fieldMap[":50A:"] || null;
  }
  return fieldMap[":59:"]?.account || fieldMap[":59A:"] || null;
}

/**
 * ref4 — Seller BIC
 */
function extractSellerBIC(swiftMessage, trade) {
  const dir = String(trade.direction || "").toUpperCase();
  if (dir === "BUY" || dir === "PAY") {
    return swiftMessage.receiverBIC || null;
  }
  return swiftMessage.senderBIC || null;
}

/**
 * ref5 — Field 20 (Transaction Reference Number)
 */
function extractField20(fieldMap, trade) {
  return fieldMap[":20:"] || trade.tradeRef || null;
}

/**
 * ref6 — Field 56A (Intermediary)
 */
function extractField56A(fieldMap) {
  return fieldMap[":56A:"] || fieldMap[":56D:"] || null;
}

/**
 * ref7 — Institution Name (Account With Institution)
 */
function extractInstitutionName(fieldMap, swiftMessage) {
  return fieldMap[":57A:"] || fieldMap[":57D:"] || swiftMessage.receiverBIC || null;
}

/**
 * ref8 — Bank Name (Ordering/Sender Institution)
 */
function extractBankName(fieldMap, trade) {
  return fieldMap[":52A:"] || fieldMap[":52D:"] || trade.entity || null;
}

module.exports = {
  createStatementItem
};
