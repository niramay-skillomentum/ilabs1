// ======================================
// SWIFT FACTORY
// Determines which SWIFT message type(s) to generate
// based on the counterparty's Default SWIFT value and
// the presence of an Agent Bank.
//
// Decision Matrix:
//   ┌──────────────────────┬─────────────┬─────────────────────┐
//   │ Default SWIFT        │ Agent Bank  │ Messages Generated  │
//   ├──────────────────────┼─────────────┼─────────────────────┤
//   │ MT103 (NON BANK)     │ NULL        │ MT103               │
//   │ MT202 (BANK)         │ any         │ MT202               │
//   │ MT103 (NON BANK)     │ EXISTS      │ MT103 + MT202COV    │
//   └──────────────────────┴─────────────┴─────────────────────┘
//
// Follows Open/Closed Principle:
//   To add MT210, MT910, etc., register a new field map
//   without modifying existing code.
// ======================================

const MT103FieldMap = require("./fieldMaps/MT103FieldMap");
const MT202FieldMap = require("./fieldMaps/MT202FieldMap");
const MT202COVFieldMap = require("./fieldMaps/MT202COVFieldMap");

// Registry of field mappers — add new message types here
const FIELD_MAP_REGISTRY = {
  MT103: MT103FieldMap,
  MT202: MT202FieldMap,
  MT202COV: MT202COVFieldMap
};

/**
 * Determine which SWIFT message type(s) to generate.
 *
 * @param {Object} instruction - PaymentInstruction
 * @returns {Array<{ messageType: string, fieldMap: Object }>}
 */
function create(instruction) {
  const messageTypes = determineMessageTypes(instruction);
  const results = [];

  for (const msgType of messageTypes) {
    const mapper = FIELD_MAP_REGISTRY[msgType];
    if (!mapper) {
      throw new Error(`No field mapper registered for message type: ${msgType}`);
    }

    results.push({
      messageType: msgType,
      fieldMap: mapper.mapFields(instruction)
    });
  }

  return results;
}

/**
 * Determine which message type(s) to generate based on
 * the counterparty's Default SWIFT column and Agent Bank presence.
 *
 * @param {Object} instruction - PaymentInstruction
 * @returns {string[]} Array of message types
 */
function determineMessageTypes(instruction) {
  const defaultSwift = normalizeDefaultSwift(instruction.counterparty.defaultSwift);
  const hasAgent = !!(
    instruction.intermediary &&
    instruction.intermediary.bank &&
    String(instruction.intermediary.bank).trim().length > 0
  );

  // MT202 (BANK counterparty) — always MT202 regardless of agent
  if (defaultSwift === "MT202") {
    return ["MT202"];
  }

  // MT103 (NON BANK counterparty)
  if (defaultSwift === "MT103") {
    if (hasAgent) {
      // Agent Bank exists → generate MT103 + MT202COV pair
      return ["MT103", "MT202COV"];
    }
    // No agent → MT103 only
    return ["MT103"];
  }

  // Fallback: default to MT103 if defaultSwift is unrecognised
  console.warn(`[SwiftFactory] Unrecognised defaultSwift: "${instruction.counterparty.defaultSwift}", defaulting to MT103`);
  return ["MT103"];
}

/**
 * Normalize the Default SWIFT value from SSI data.
 * Handles various formats: "MT103", "mt103", "103", etc.
 */
function normalizeDefaultSwift(value) {
  if (!value) return "MT103";
  const cleaned = String(value).toUpperCase().trim();
  if (cleaned === "MT103" || cleaned === "103") return "MT103";
  if (cleaned === "MT202" || cleaned === "202") return "MT202";
  return cleaned;
}

/**
 * Get all registered message types.
 */
function getRegisteredTypes() {
  return Object.keys(FIELD_MAP_REGISTRY);
}

module.exports = {
  create,
  determineMessageTypes,
  normalizeDefaultSwift,
  getRegisteredTypes,
  FIELD_MAP_REGISTRY
};
