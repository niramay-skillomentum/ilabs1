// ======================================
// SWIFT ENGINE (ORCHESTRATOR)
// Central entry point for SWIFT message generation.
//
// This is the ONLY module that external code calls.
// It coordinates:
//   1. Loading trade data
//   2. Loading entity (our bank) data
//   3. Loading counterparty SSI data
//   4. Building the canonical PaymentInstruction
//   5. Validating
//   6. Determining message type(s) via SwiftFactory
//   7. Rendering via SwiftRenderer
//   8. Persisting to SwiftMessage collection
//   9. Recording audit event
//
// All operations are safe — failures never break settlement.
// ======================================

const Trade = require("../../models/Trade");
const SwiftMessage = require("../../models/SwiftMessage");
const SSIReference = require("../../models/SSIReference");
const Entity = require("../../models/Entity");
const auditEngine = require("../auditEngine");
const PaymentInstruction = require("./PaymentInstruction");
const SwiftFactory = require("./SwiftFactory");
const SwiftValidator = require("./validators/SwiftValidator");
const SwiftRenderer = require("./renderers/SwiftRenderer");

/**
 * Generate SWIFT message(s) for a settled trade.
 * Fire-and-forget — never throws, never blocks settlement.
 *
 * @param {string} tradeRef - Trade reference
 * @param {string} userId   - User who settled the trade (or "SYSTEM")
 * @returns {Promise<Object>} { success, messages[], errors[] }
 */
async function generateSwiftMessages(tradeRef, userId) {
  try {
    console.log(`[SwiftEngine] Generating SWIFT for trade: ${tradeRef}`);

    // ── 1. Load trade ──
    const trade = await Trade.findOne({ tradeRef }).lean();
    if (!trade) {
      return fail(tradeRef, userId, "Trade not found");
    }

    if (trade.currentStatus !== "SETTLED") {
      return fail(tradeRef, userId, `Trade is not SETTLED (current: ${trade.currentStatus})`);
    }

    // ── 2. Load entity (our bank) for this trade's currency ──
    const ourBank = await loadOurBank(trade.entity, trade.currency);
    if (!ourBank) {
      return fail(tradeRef, userId,
        `No entity found for "${trade.entity}" / ${trade.currency}. Cannot determine our bank details.`
      );
    }

    // ── 3. Load counterparty SSI ──
    const counterpartySSI = await loadCounterpartySSI(trade);
    if (!counterpartySSI) {
      return fail(tradeRef, userId,
        `No SSI reference found for counterparty "${trade.counterpartyGroup || trade.counterparty}" / ${trade.currency}.`
      );
    }

    // ── 4. Build PaymentInstruction ──
    const instruction = PaymentInstruction.build(trade, ourBank, counterpartySSI);

    // ── 5. Determine message types ──
    const messageSpecs = SwiftFactory.create(instruction);

    // ── 6. Validate & Render each message ──
    const generatedMessages = [];
    const errors = [];

    for (const spec of messageSpecs) {
      // Validate
      const validation = SwiftValidator.validate(instruction, spec.messageType);
      if (!validation.valid) {
        console.warn(`[SwiftEngine] Validation failed for ${spec.messageType}:`, validation.errors);
        errors.push(...validation.errors.map(e => `${spec.messageType}: ${e}`));

        // Store failed message for audit
        const failedMsg = await SwiftMessage.create({
          tradeRef,
          settlementRef: instruction.settlementRef,
          messageType: spec.messageType,
          messagePayload: "",
          senderBIC: instruction.senderBIC,
          receiverBIC: instruction.receiverBIC,
          amount: instruction.amount,
          currency: instruction.currency,
          valueDate: instruction.valueDate,
          counterpartyType: instruction.counterparty.counterpartyType,
          defaultSwift: instruction.counterparty.defaultSwift,
          paymentDirection: instruction.paymentDirection,
          fieldMap: spec.fieldMap,
          generatedBy: userId || "SYSTEM",
          status: "FAILED",
          validationErrors: validation.errors
        });
        generatedMessages.push(failedMsg);
        continue;
      }

      // Render
      const rawPayload = SwiftRenderer.render(
        spec.messageType, spec.fieldMap,
        instruction.senderBIC, instruction.receiverBIC
      );

      const displayPayload = SwiftRenderer.renderDisplay(
        spec.messageType, spec.fieldMap,
        instruction.senderBIC, instruction.receiverBIC
      );

      // Persist
      const msg = await SwiftMessage.create({
        tradeRef,
        settlementRef: instruction.settlementRef,
        messageType: spec.messageType,
        messagePayload: rawPayload,
        senderBIC: instruction.senderBIC,
        receiverBIC: instruction.receiverBIC,
        amount: instruction.amount,
        currency: instruction.currency,
        valueDate: instruction.valueDate,
        counterpartyType: instruction.counterparty.counterpartyType,
        defaultSwift: instruction.counterparty.defaultSwift,
        paymentDirection: instruction.paymentDirection,
        fieldMap: spec.fieldMap,
        generatedBy: userId || "SYSTEM",
        status: "GENERATED"
      });

      generatedMessages.push(msg);
      console.log(`[SwiftEngine] ${spec.messageType} generated for ${tradeRef} (id: ${msg._id})`);

      // Fire-and-forget: Create Statement Reconciliation Item
      try { require("../statementImporter").createStatementItem(msg, trade); } catch (e) {}
    }

    // ── 7. Link related messages (MT103 ↔ MT202COV pair) ──
    if (generatedMessages.length === 2) {
      const successMsgs = generatedMessages.filter(m => m.status === "GENERATED");
      if (successMsgs.length === 2) {
        await SwiftMessage.updateOne(
          { _id: successMsgs[0]._id },
          { $push: { relatedMessages: successMsgs[1]._id } }
        );
        await SwiftMessage.updateOne(
          { _id: successMsgs[1]._id },
          { $push: { relatedMessages: successMsgs[0]._id } }
        );
      }
    }

    // ── 8. Audit ──
    const successCount = generatedMessages.filter(m => m.status === "GENERATED").length;
    const failCount = generatedMessages.filter(m => m.status === "FAILED").length;
    const types = generatedMessages.map(m => m.messageType).join(", ");

    await auditEngine.recordEvent(
      tradeRef,
      userId || "SYSTEM",
      failCount > 0 ? "SWIFT_GENERATION_PARTIAL" : "SWIFT_GENERATED",
      `Generated ${successCount} SWIFT message(s) [${types}]. ${failCount > 0 ? `${failCount} failed validation.` : ""}`,
      !userId
    );

    return {
      success: true,
      messages: generatedMessages,
      errors
    };

  } catch (err) {
    console.error(`[SwiftEngine] Fatal error for ${tradeRef}:`, err.message);
    return fail(tradeRef, userId, err.message);
  }
}

/**
 * Get all SWIFT messages for a trade.
 *
 * @param {string} tradeRef
 * @returns {Promise<Object[]>}
 */
async function getMessagesForTrade(tradeRef) {
  return SwiftMessage.find({ tradeRef }).sort({ generatedAt: -1 }).lean();
}

/**
 * Get a single SWIFT message by ID.
 *
 * @param {string} messageId
 * @returns {Promise<Object|null>}
 */
async function getMessageById(messageId) {
  return SwiftMessage.findById(messageId).lean();
}

/**
 * Regenerate SWIFT messages for a trade.
 * Marks old messages as REGENERATED.
 *
 * @param {string} tradeRef
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function regenerateSwiftMessages(tradeRef, userId) {
  // Mark existing messages as REGENERATED
  await SwiftMessage.updateMany(
    { tradeRef, status: "GENERATED" },
    { $set: { status: "REGENERATED" } }
  );

  // Generate fresh messages
  return generateSwiftMessages(tradeRef, userId);
}

// ============================
// DATA LOADERS
// ============================

/**
 * Load our bank entity for the given entity name and currency.
 * Tries exact match first, then falls back to entity name only.
 */
async function loadOurBank(entityName, currency) {
  if (!entityName) return null;

  // Try exact match: entity name + currency
  let entity = await Entity.findOne({
    entityName,
    currency: currency ? currency.toUpperCase() : undefined
  }).lean();

  if (entity) return entity;

  // Fallback: any entity with this name (first match)
  entity = await Entity.findOne({ entityName }).lean();
  return entity;
}

/**
 * Load the counterparty SSI record for a trade.
 * Uses the trade's truth SSI reference if available, otherwise looks up by counterparty + currency.
 */
async function loadCounterpartySSI(trade) {
  // Priority 1: Use the truth SSI reference ID from the trade
  if (trade.truthSSIRefId) {
    const ssi = await SSIReference.findById(trade.truthSSIRefId).lean();
    if (ssi) return ssi;
  }

  // Priority 2: Use the truth settlement ssiRefId
  if (trade.truths && trade.truths.settlement && trade.truths.settlement.ssiRefId) {
    const ssi = await SSIReference.findById(trade.truths.settlement.ssiRefId).lean();
    if (ssi) return ssi;
  }

  // Priority 3: Use the presented SSI reference ID
  if (trade.presentedSSIRefId) {
    const ssi = await SSIReference.findById(trade.presentedSSIRefId).lean();
    if (ssi) return ssi;
  }

  // Priority 4: Lookup by counterparty group + currency
  const groupName = trade.counterpartyGroup || trade.counterparty;
  if (groupName && trade.currency) {
    const ssi = await SSIReference.findOne({
      groupCounterPartyName: groupName,
      currency: trade.currency.toUpperCase(),
      active: true
    }).lean();
    if (ssi) return ssi;
  }

  return null;
}

// ============================
// HELPERS
// ============================

async function fail(tradeRef, userId, errorMessage) {
  console.error(`[SwiftEngine] Failed for ${tradeRef}: ${errorMessage}`);
  try {
    await auditEngine.recordEvent(
      tradeRef,
      userId || "SYSTEM",
      "SWIFT_GENERATION_FAILED",
      `SWIFT generation failed: ${errorMessage}`,
      !userId
    );
  } catch (e) { /* ignore audit failure */ }

  return {
    success: false,
    messages: [],
    errors: [errorMessage]
  };
}

module.exports = {
  generateSwiftMessages,
  getMessagesForTrade,
  getMessageById,
  regenerateSwiftMessages,
  loadOurBank,
  loadCounterpartySSI
};
