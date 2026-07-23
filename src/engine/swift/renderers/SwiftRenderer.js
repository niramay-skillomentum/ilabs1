// ======================================
// SWIFT RENDERER
// Converts a field map into a properly formatted SWIFT message.
//
// SWIFT message structure:
//   {1: Basic Header}
//   {2: Application Header}
//   {4: Text Block (fields)
//   :TAG:VALUE
//   -}
//
// This module handles ONLY rendering. Business logic and
// field selection are handled by the FieldMap modules.
// ======================================

/**
 * Render a complete SWIFT message from a field map.
 *
 * @param {string} messageType    - "MT103", "MT202", or "MT202COV"
 * @param {Object} fieldMap       - Map of { tag: { value, description } }
 * @param {string} senderBIC      - 8 or 11 char BIC of sender
 * @param {string} receiverBIC    - 8 or 11 char BIC of receiver
 * @returns {string} Complete SWIFT message text
 */
function render(messageType, fieldMap, senderBIC, receiverBIC) {
  const header = renderHeader(senderBIC, receiverBIC, messageType);
  const body = renderBody(fieldMap);
  const trailer = renderTrailer();

  return `${header}\n${body}\n${trailer}`;
}

/**
 * Render a human-readable display version (for UI preview).
 * Shows field descriptions alongside values.
 *
 * @param {string} messageType
 * @param {Object} fieldMap
 * @param {string} senderBIC
 * @param {string} receiverBIC
 * @returns {string} Display-formatted SWIFT message
 */
function renderDisplay(messageType, fieldMap, senderBIC, receiverBIC) {
  const lines = [];
  const msgTypeNum = messageType.replace("MT", "").replace("COV", " COV");

  lines.push(`╔══════════════════════════════════════════════════╗`);
  lines.push(`║  SWIFT ${messageType} — ${getMessageTitle(messageType)}`);
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║  Sender:   ${padBIC(senderBIC)}`);
  lines.push(`║  Receiver: ${padBIC(receiverBIC)}`);
  lines.push(`╠══════════════════════════════════════════════════╣`);

  const tags = Object.keys(fieldMap);
  for (const tag of tags) {
    const field = fieldMap[tag];
    const valueLines = String(field.value).split("\n");

    lines.push(`║`);
    lines.push(`║  :${tag}: ${field.description}`);
    for (const vl of valueLines) {
      lines.push(`║    ${vl}`);
    }
  }

  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║  End of Message`);
  lines.push(`╚══════════════════════════════════════════════════╝`);

  return lines.join("\n");
}

// ============================
// INTERNAL RENDERERS
// ============================

/**
 * Render SWIFT Basic Header {1:} and Application Header {2:}
 *
 * {1:F01SENDERBICAXXX0000000000}
 * {2:I103RECEIVERBICXXXXN}
 */
function renderHeader(senderBIC, receiverBIC, messageType) {
  const sender = normalizeBIC(senderBIC);
  const receiver = normalizeBIC(receiverBIC);
  const msgNum = getMessageNumber(messageType);

  // {1: Basic Header Block}
  // F = FIN, 01 = application ID
  const block1 = `{1:F01${sender}0000000000}`;

  // {2: Application Header Block}
  // I = Input, msgNum = message type, N = Normal priority
  const block2 = `{2:I${msgNum}${receiver}N}`;

  return `${block1}\n${block2}`;
}

const SWIFT_TAG_ORDER = ["20", "21", "23B", "32A", "33B", "50A", "50F", "50K", "52A", "52D", "53A", "53B", "54A", "54B", "56A", "56C", "57A", "57B", "57C", "58A", "59", "59A", "70", "71A", "72", "77B"];

function getSortedTags(fieldMap) {
  return Object.keys(fieldMap).sort((a, b) => {
    let idxA = SWIFT_TAG_ORDER.indexOf(a);
    let idxB = SWIFT_TAG_ORDER.indexOf(b);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });
}

function renderBody(fieldMap) {
  const lines = ["{4:"];
  const tags = getSortedTags(fieldMap);

  for (const tag of tags) {
    const field = fieldMap[tag];
    const valueLines = String(field.value).split("\n");

    // First line: :TAG:VALUE
    lines.push(`:${tag}:${valueLines[0]}`);

    // Continuation lines
    for (let i = 1; i < valueLines.length; i++) {
      lines.push(valueLines[i]);
    }
  }

  lines.push("-}");
  return lines.join("\n");
}

/**
 * Render the trailer block {5:}
 */
function renderTrailer() {
  return "{5:{CHK:000000000000}}";
}

// ============================
// UTILITIES
// ============================

/**
 * Normalize BIC to 12 characters (8-char BIC + AXXX padding).
 */
function normalizeBIC(bic) {
  if (!bic) return "UNKNOWNXXXXX";
  let cleaned = String(bic).replace(/\s/g, "").toUpperCase();
  if (cleaned.length === 8) cleaned += "AXXX";
  else if (cleaned.length === 11) cleaned += "X".repeat(12 - cleaned.length);
  return cleaned.substring(0, 12);
}

/**
 * Get the 3-digit message type number.
 */
function getMessageNumber(messageType) {
  switch (messageType) {
    case "MT103": return "103";
    case "MT202": return "202";
    case "MT202COV": return "202";
    default: return "103";
  }
}

/**
 * Get human-readable message title.
 */
function getMessageTitle(messageType) {
  switch (messageType) {
    case "MT103": return "Single Customer Credit Transfer";
    case "MT202": return "General Financial Institution Transfer";
    case "MT202COV": return "Cover Payment (Customer Credit Transfer)";
    default: return "SWIFT Message";
  }
}

function padBIC(bic) {
  return String(bic || "").padEnd(12);
}

module.exports = {
  render,
  renderDisplay,
  normalizeBIC,
  getMessageTitle
};
