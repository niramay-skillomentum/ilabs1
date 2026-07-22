// ======================================
// STATEMENT CREATION SERVICE (a.k.a. Statement Importer)
// Creates Statement Reconciliation Items from generated SWIFT messages.
//
// Fired fire-and-forget after SWIFT generation (SwiftEngine).
// NEVER modifies the SWIFT Message or Trade Object.
// NEVER blocks the SWIFT generation flow.
//
// STRICT DATA-INDEPENDENCE CONTRACT
//   A statement item is populated ONLY from values that genuinely
//   exist inside the generated SWIFT message (top-level fields +
//   fieldMap tags). It is NEVER enriched from the Trade Object.
//   Any trade-specific attribute that is NOT physically present in
//   the SWIFT message stays NULL:
//     - tradeDate  → NULL (no trade date inside a payment message)
//     - itemRef1–6 → NULL (product/underlyer/entity/country are trade-only)
//
// The tradeRef survives into the statement ONLY because SWIFT Field 20
// (Transaction Reference) genuinely carries it — it lands in ref5, a
// SWIFT-sourced column. This is the single hidden identifier the
// matching engine later uses; it is never displayed as a relationship.
//
// NOTE ON STORAGE FORMAT
//   fieldMap tags are stored WITHOUT colons ("20", "59", "56A") and
//   each value is an object { value, description }. Multi-line field
//   values put the account on a line beginning with "/" followed by
//   name/BIC lines.
// ======================================

const repo = require("./reconciliationRepository");
const reconService = require("./reconciliationService");
const {
  RECON_SOURCE,
  RECON_STATUS,
  SWIFT_TAG,
  SWIFT_DIRECTION
} = require("./reconciliationConstants");

/**
 * Create a Statement Reconciliation Item from a generated SWIFT message.
 * Fire-and-forget — errors are logged, never propagated.
 *
 * The `trade` argument is accepted for signature compatibility with the
 * existing SwiftEngine call site but is DELIBERATELY NOT used to populate
 * any field. It is used only for idempotency logging.
 *
 * @param {Object} swiftMessage - SwiftMessage document (lean or mongoose)
 * @param {Object} [trade]      - Trade doc — NOT used for enrichment
 */
async function createStatementItem(swiftMessage, trade) {
  try {
    if (!swiftMessage) return;

    // Only import successfully generated messages.
    if (swiftMessage.status !== "GENERATED") return;

    const fieldMap = swiftMessage.fieldMap || {};

    // Canonical transaction reference carried by the message.
    // For a plain MT103/MT202 this is Field 20 (= tradeRef).
    // For the MT202COV leg of a pair, Field 20 is "COV<tradeRef>" while
    // Field 21 (Related Reference) carries the plain tradeRef — so we
    // prefer Field 21 when present. This keeps EXACTLY ONE statement item
    // per settled trade and makes ref5 equal the ledger's tradeRef.
    const field21 = tagValue(fieldMap, SWIFT_TAG.RELATED_REF);
    const field20 = tagValue(fieldMap, SWIFT_TAG.TRANSACTION_REF);
    const txnRef = field21 || field20;

    // Idempotency: one statement item per SWIFT transaction reference
    // (dedupes the MT103 + MT202COV pair down to a single row).
    if (txnRef && await repo.statementExistsForTrade(txnRef)) {
      return;
    }

    const itemId = await reconService.generateItemId();
    const direction = String(swiftMessage.paymentDirection || "").toUpperCase();
    const isPay = direction === SWIFT_DIRECTION.PAY;

    // Buyer = payer (ordering), Seller = payee (beneficiary).
    // Resolve buyer/seller BIC from the SWIFT message routing only.
    const buyerBIC = isPay ? swiftMessage.senderBIC : swiftMessage.receiverBIC;
    const sellerBIC = isPay ? swiftMessage.receiverBIC : swiftMessage.senderBIC;

    // Buyer account = ordering customer (50K); Seller account = beneficiary (59).
    const buyerAccount = parseAccount(tagValue(fieldMap, SWIFT_TAG.ORDERING_CUSTOMER));
    const sellerAccount = parseAccount(tagValue(fieldMap, SWIFT_TAG.BENEFICIARY_CUSTOMER));

    const item = await repo.createItem({
      itemId,
      status: RECON_STATUS.OUTSTANDING,
      source: RECON_SOURCE.STATEMENT,

      // Item type derived from SWIFT paymentDirection (SWIFT-sourced).
      itemType: reconService.deriveStatementItemType(swiftMessage.paymentDirection),

      // Economics — ONLY from the SWIFT message.
      amount: swiftMessage.amount ?? null,
      currency: swiftMessage.currency || null,
      tradeDate: null,                      // Not present in a SWIFT payment message.
      valueDate: swiftMessage.valueDate || null,

      // Recon desk derived from the SWIFT BIC geography (SWIFT-sourced).
      reconDesk: reconService.deriveReconDeskFromBIC(swiftMessage.senderBIC || swiftMessage.receiverBIC),

      matchId: null,

      // Item References (trade-level) — MUST remain NULL for statement items.
      itemRef1: null, itemRef2: null, itemRef3: null,
      itemRef4: null, itemRef5: null, itemRef6: null,

      // SWIFT References (statement-level) — all SWIFT-sourced.
      ref1: buyerBIC || null,                                   // Buyer BIC
      ref2: sellerAccount || null,                              // Seller Account
      ref3: buyerAccount || null,                               // Buyer Account
      ref4: sellerBIC || null,                                  // Seller BIC
      ref5: txnRef || null,                                    // Field 20/21 (Transaction Ref)
      ref6: firstLine(tagValue(fieldMap, SWIFT_TAG.INTERMEDIARY)),      // 56A Intermediary
      ref7: parseBIC(tagValue(fieldMap, SWIFT_TAG.ACCOUNT_WITH_INST))
            || firstLine(tagValue(fieldMap, SWIFT_TAG.ACCOUNT_WITH_INST)), // 57A Institution
      ref8: parseBIC(tagValue(fieldMap, SWIFT_TAG.ORDERING_INSTITUTION))
            || parseBIC(tagValue(fieldMap, SWIFT_TAG.BENEFICIARY_INSTITUTION)) // 52A/58A Bank
    });

    console.log(`[StatementCreation] Created statement item ${itemId} (${swiftMessage.messageType}, Ref=${txnRef || "n/a"})`);
    return item;

  } catch (err) {
    console.warn(`[StatementCreation] Error creating statement item:`, err.message);
  }
}

// ======================================
// SWIFT FIELD PARSERS
// Operate purely on the stored fieldMap. No trade data.
// ======================================

/**
 * Read a fieldMap tag's raw value. Handles both { value, description }
 * objects and plain-string storage. Returns "" when absent.
 */
function tagValue(fieldMap, tag) {
  const entry = fieldMap[tag];
  if (entry === null || entry === undefined) return "";
  if (typeof entry === "object") return String(entry.value ?? "");
  return String(entry);
}

/** First non-empty line of a (possibly multi-line) field value. */
function firstLine(value) {
  if (!value) return null;
  const line = String(value).split("\n").map(s => s.trim()).find(Boolean);
  return line || null;
}

/**
 * Extract the account from a field value. SWIFT account lines begin
 * with "/" (e.g. "/12345678"). Returns the account without the slash.
 */
function parseAccount(value) {
  if (!value) return null;
  for (const raw of String(value).split("\n")) {
    const line = raw.trim();
    if (line.startsWith("/")) {
      const acc = line.replace(/^\/+/, "").trim();
      if (acc) return acc;
    }
  }
  return null;
}

/**
 * Extract a BIC from a field value. A BIC is 8 or 11 uppercase
 * alphanumerics on its own line (after any leading account line).
 */
function parseBIC(value) {
  if (!value) return null;
  for (const raw of String(value).split("\n")) {
    const line = raw.trim();
    if (/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(line)) return line;
  }
  return null;
}

module.exports = {
  createStatementItem
};
