// ======================================
// SWIFT MESSAGE GENERATION ENGINE
// Generates MT103, MT202, and MT202 COV SWIFT messages
// for settled trades based on counterparty type and agent presence.
//
// Rules:
//   Bank counterparty                → MT202
//   Non-Bank, no agent              → MT103
//   Non-Bank, agent exists          → MT103 + MT202 COV
//
// Buy/Sell determines sender/receiver role mapping.
// ======================================

const SwiftMessage = require("../models/SwiftMessage");
const SettlementCounter = require("../models/SettlementCounter");
const Trade = require("../models/Trade");
const SSIReference = require("../models/SSIReference");
const OurSSI = require("../models/OurSSI");

// Bank counterparty types → MT202
const BANK_TYPES = ["Investment Bank", "Custodian Bank", "Commercial Bank"];

// ============================
// REFERENCE GENERATORS
// ============================

/**
 * Generate next Settlement Reference.
 * Format: {YY}{4-digit seq}  e.g. "260001", "260002"
 */
async function getNextSettlementRef() {
  const currentYear = new Date().getFullYear() % 100; // 26 for 2026
  const { sequence } = await SettlementCounter.getNext("SETTLEMENT_REF", currentYear);
  return `${String(currentYear).padStart(2, "0")}${String(sequence).padStart(4, "0")}`;
}

/**
 * Generate next SSI Reference for a given currency.
 * Format: SGB-{CCY}-{3-digit seq}  e.g. "SGB-EUR-001", "SGB-USD-002"
 * Sequence increments independently per currency.
 */
async function getNextSSIRef(currency) {
  const ccy = String(currency).toUpperCase();
  const currentYear = new Date().getFullYear() % 100;
  const { sequence } = await SettlementCounter.getNext(`SSI_REF_${ccy}`, currentYear);
  return `SGB-${ccy}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Generate Field 72 dynamically.
 * Template: REF:SGB-{SettlementReference}
 */
function generateField72(settlementRef) {
  return `REF:SGB-${settlementRef}`;
}

// ============================
// HELPERS
// ============================

/**
 * Format a date as YYMMDD for SWIFT fields.
 */
function formatDateSWIFT(date) {
  if (!date) return "000000";
  const d = new Date(date);
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * Format amount for SWIFT (no thousands separator, comma for decimal).
 * e.g. 1000000 → "1000000,00"
 */
function formatAmountSWIFT(amount) {
  if (!amount) return "0,00";
  const parts = Number(amount).toFixed(2).split(".");
  return `${parts[0]},${parts[1]}`;
}

/**
 * Generate a unique transaction reference for Field 20.
 * Format: {dateYYMMDD}{TradeRef suffix} — max 16 chars per SWIFT spec
 */
function generateTransactionRef(tradeRef, prefix = "") {
  const dateStr = formatDateSWIFT(new Date());
  // Take last 10 chars of tradeRef to fit 16-char limit
  const refPart = String(tradeRef).replace(/[^A-Za-z0-9]/g, "").slice(-10);
  const result = `${prefix}${dateStr}${refPart}`;
  return result.substring(0, 16);
}

/**
 * Clean address — trim and limit to SWIFT's 4 × 35-char lines.
 */
function formatAddressSWIFT(address) {
  if (!address) return "";
  // Split by newlines, trim each, filter empty, take max 4 lines
  const lines = String(address)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 4)
    .map(l => l.substring(0, 35));
  return lines.join("\n");
}

/**
 * Determine if a counterparty type is "Bank" (MT202) or "Non-Bank" (MT103).
 */
function isBankType(counterpartyType) {
  return BANK_TYPES.includes(counterpartyType);
}

/**
 * Look up the counterparty SSI record from the trade.
 */
async function getCounterpartySSI(trade) {
  // Try truthSSIRefId first (the verified SSI), fall back to presentedSSIRefId
  const refId = trade.truthSSIRefId || trade.presentedSSIRefId ||
                trade.truths?.settlement?.ssiRefId || trade.settlementDetails?.ssiRefId;
  if (!refId) return null;
  return SSIReference.findById(refId).lean();
}

/**
 * Look up our bank's SSI for the trade's entity + currency.
 */
async function getOurSSIForTrade(trade) {
  const currency = String(trade.currency).toUpperCase();
  const entity = trade.entity;

  if (!entity || !currency) return null;

  // Try matching by entity name first
  let ourSSI = await OurSSI.findOne({ entityName: entity, currency }).lean();

  // If not found, try fuzzy match — entity field might be just the code
  if (!ourSSI) {
    ourSSI = await OurSSI.findOne({ entityCode: entity, currency }).lean();
  }

  // If still not found, try partial match on entity name
  if (!ourSSI) {
    ourSSI = await OurSSI.findOne({
      entityName: { $regex: entity, $options: "i" },
      currency
    }).lean();
  }

  // Final fallback: any Our SSI for this currency
  if (!ourSSI) {
    ourSSI = await OurSSI.findOne({ currency }).lean();
  }

  return ourSSI;
}

// ============================
// MT103 GENERATOR
// Single Customer Credit Transfer
// ============================

function buildMT103(params) {
  const {
    senderBIC,
    receiverBIC,
    settlementRef,
    transactionRef,
    valueDate,
    currency,
    amount,
    orderingCustomerAccount,
    orderingCustomerName,
    orderingCustomerAddress,
    orderingInstitution,
    orderingInstitutionAccount,
    senderCorrespondentBIC,
    receiverCorrespondentBIC,
    intermediaryBIC,
    intermediaryName,
    accountWithInstitutionBIC,
    accountWithInstitutionAccount,
    accountWithInstitutionName,
    accountWithInstitutionAddress,
    beneficiaryAccount,
    beneficiaryName,
    beneficiaryAddress,
    remittanceInfo,
    chargeCode,
    field72,
  } = params;

  const fields = {};
  const lines = [];

  // Header blocks
  lines.push(`{1:F01${senderBIC}XXXX1234567890} {2:I103${receiverBIC}XXXXN} {3:{108:REF${settlementRef}}}`);
  lines.push("{4:");

  // Field 20: Transaction Reference Number
  fields.field20 = transactionRef;
  lines.push(`:20:${transactionRef}`);

  // Field 23B: Bank Operation Code
  fields.field23B = "CRED";
  lines.push(":23B:CRED");

  // Field 32A: Value Date/Currency/Interbank Settled Amount
  const f32a = `${formatDateSWIFT(valueDate)}${currency}${formatAmountSWIFT(amount)}`;
  fields.field32A = f32a;
  lines.push(`:32A:${f32a}`);

  // Field 50K: Ordering Customer (Payer) — Name & Address
  if (orderingCustomerAccount || orderingCustomerName) {
    const f50k = [];
    if (orderingCustomerAccount) f50k.push(`/${orderingCustomerAccount}`);
    if (orderingCustomerName) f50k.push(orderingCustomerName);
    if (orderingCustomerAddress) {
      formatAddressSWIFT(orderingCustomerAddress).split("\n").forEach(l => f50k.push(l));
    }
    fields.field50K = f50k.join("\n");
    lines.push(`:50K:${f50k.join("\n")}`);
  }

  // Field 52D: Ordering Institution — Name & Address
  if (orderingInstitution) {
    const f52 = [];
    if (orderingInstitutionAccount) f52.push(`/${orderingInstitutionAccount}`);
    f52.push(orderingInstitution);
    fields.field52D = f52.join("\n");
    lines.push(`:52D:${f52.join("\n")}`);
  }

  // Field 53A: Sender's Correspondent
  if (senderCorrespondentBIC) {
    fields.field53A = senderCorrespondentBIC;
    lines.push(`:53A:${senderCorrespondentBIC}`);
  }

  // Field 54A: Receiver's Correspondent
  if (receiverCorrespondentBIC) {
    fields.field54A = receiverCorrespondentBIC;
    lines.push(`:54A:${receiverCorrespondentBIC}`);
  }

  // Field 56A: Intermediary Bank
  if (intermediaryBIC) {
    fields.field56A = intermediaryBIC;
    if (intermediaryName) {
      lines.push(`:56A:${intermediaryBIC}`);
    } else {
      lines.push(`:56A:${intermediaryBIC}`);
    }
  }

  // Field 57A: Account With Institution (Beneficiary's Bank)
  if (accountWithInstitutionBIC || accountWithInstitutionName) {
    const f57 = [];
    if (accountWithInstitutionBIC) f57.push(accountWithInstitutionBIC);
    if (accountWithInstitutionAccount) f57.push(`//${accountWithInstitutionAccount}`);
    if (accountWithInstitutionName) f57.push(accountWithInstitutionName);
    if (accountWithInstitutionAddress) {
      formatAddressSWIFT(accountWithInstitutionAddress).split("\n").forEach(l => f57.push(l));
    }
    fields.field57A = f57.join("\n");
    lines.push(`:57A:${f57.join("\n")}`);
  }

  // Field 59: Beneficiary
  if (beneficiaryAccount || beneficiaryName) {
    const f59 = [];
    if (beneficiaryAccount) f59.push(`/${beneficiaryAccount}`);
    if (beneficiaryName) f59.push(beneficiaryName);
    if (beneficiaryAddress) {
      formatAddressSWIFT(beneficiaryAddress).split("\n").forEach(l => f59.push(l));
    }
    fields.field59 = f59.join("\n");
    lines.push(`:59:${f59.join("\n")}`);
  }

  // Field 70: Remittance Information
  if (remittanceInfo) {
    fields.field70 = remittanceInfo;
    lines.push(`:70:${remittanceInfo}`);
  }

  // Field 71A: Details of Charges
  fields.field71A = chargeCode || "SHA";
  lines.push(`:71A:${chargeCode || "SHA"}`);

  // Field 72: Sender to Receiver Information
  if (field72) {
    fields.field72 = `/INS/${field72}`;
    lines.push(`:72:/INS/${field72}`);
  }

  lines.push("-}");

  return {
    messageContent: lines.join("\n"),
    fields
  };
}

// ============================
// MT202 GENERATOR
// General Financial Institution Transfer
// ============================

function buildMT202(params) {
  const {
    senderBIC,
    receiverBIC,
    settlementRef,
    transactionRef,
    relatedRef,
    valueDate,
    currency,
    amount,
    orderingInstitutionBIC,
    senderCorrespondentBIC,
    receiverCorrespondentBIC,
    intermediaryBIC,
    accountWithInstitutionBIC,
    beneficiaryInstitutionBIC,
    beneficiaryInstitutionName,
    field72,
  } = params;

  const fields = {};
  const lines = [];

  // Header blocks
  lines.push(`{1:F01${senderBIC}XXXX1234567890} {2:I202${receiverBIC}XXXXN} {3:{108:REF${settlementRef}}}`);
  lines.push("{4:");

  // Field 20: Transaction Reference Number
  fields.field20 = transactionRef;
  lines.push(`:20:${transactionRef}`);

  // Field 21: Related Reference
  if (relatedRef) {
    fields.field21 = relatedRef;
    lines.push(`:21:${relatedRef}`);
  }

  // Field 32A: Value Date/Currency/Amount
  const f32a = `${formatDateSWIFT(valueDate)}${currency}${formatAmountSWIFT(amount)}`;
  fields.field32A = f32a;
  lines.push(`:32A:${f32a}`);

  // Field 52A: Ordering Institution
  if (orderingInstitutionBIC) {
    fields.field52A = orderingInstitutionBIC;
    lines.push(`:52A:${orderingInstitutionBIC}`);
  }

  // Field 53A: Sender's Correspondent
  if (senderCorrespondentBIC) {
    fields.field53A = senderCorrespondentBIC;
    lines.push(`:53A:${senderCorrespondentBIC}`);
  }

  // Field 54A: Receiver's Correspondent
  if (receiverCorrespondentBIC) {
    fields.field54A = receiverCorrespondentBIC;
    lines.push(`:54A:${receiverCorrespondentBIC}`);
  }

  // Field 56A: Intermediary Institution
  if (intermediaryBIC) {
    fields.field56A = intermediaryBIC;
    lines.push(`:56A:${intermediaryBIC}`);
  }

  // Field 57A: Account With Institution
  if (accountWithInstitutionBIC) {
    fields.field57A = accountWithInstitutionBIC;
    lines.push(`:57A:${accountWithInstitutionBIC}`);
  }

  // Field 58A: Beneficiary Institution
  if (beneficiaryInstitutionBIC) {
    fields.field58A = beneficiaryInstitutionBIC;
    if (beneficiaryInstitutionName) {
      lines.push(`:58A:${beneficiaryInstitutionBIC}`);
    } else {
      lines.push(`:58A:${beneficiaryInstitutionBIC}`);
    }
  }

  // Field 72: Sender to Receiver Information
  if (field72) {
    fields.field72 = `/INS/${field72}`;
    lines.push(`:72:/INS/${field72}`);
  }

  lines.push("-}");

  return {
    messageContent: lines.join("\n"),
    fields
  };
}

// ============================
// MT202 COV GENERATOR
// Cover Payment (includes ordering customer + beneficiary from MT103)
// ============================

function buildMT202COV(params) {
  const {
    senderBIC,
    receiverBIC,
    settlementRef,
    transactionRef,
    mt103Ref,
    valueDate,
    currency,
    amount,
    orderingInstitutionBIC,
    senderCorrespondentBIC,
    receiverCorrespondentBIC,
    intermediaryBIC,
    accountWithInstitutionBIC,
    beneficiaryInstitutionBIC,
    // Coverage sequence — ordering customer + beneficiary from MT103
    orderingCustomerAccount,
    orderingCustomerName,
    orderingCustomerAddress,
    beneficiaryAccount,
    beneficiaryName,
    beneficiaryAddress,
    field72,
  } = params;

  const fields = {};
  const lines = [];

  // Header blocks — COV variant
  lines.push(`{1:F01${senderBIC}XXXX1234567890} {2:I202COV${receiverBIC}XXXXN} {3:{108:COV${settlementRef}}}`);
  lines.push("{4:");

  // Field 20: Transaction Reference
  const covRef = `COV${transactionRef}`.substring(0, 16);
  fields.field20 = covRef;
  lines.push(`:20:${covRef}`);

  // Field 21: Related Reference (MT103 ref)
  if (mt103Ref) {
    fields.field21 = mt103Ref;
    lines.push(`:21:${mt103Ref}`);
  }

  // Field 32A
  const f32a = `${formatDateSWIFT(valueDate)}${currency}${formatAmountSWIFT(amount)}`;
  fields.field32A = f32a;
  lines.push(`:32A:${f32a}`);

  // Field 52A: Ordering Institution
  if (orderingInstitutionBIC) {
    fields.field52A = orderingInstitutionBIC;
    lines.push(`:52A:${orderingInstitutionBIC}`);
  }

  // Field 53A: Sender's Correspondent
  if (senderCorrespondentBIC) {
    fields.field53A = senderCorrespondentBIC;
    lines.push(`:53A:${senderCorrespondentBIC}`);
  }

  // Field 54A: Receiver's Correspondent
  if (receiverCorrespondentBIC) {
    fields.field54A = receiverCorrespondentBIC;
    lines.push(`:54A:${receiverCorrespondentBIC}`);
  }

  // Field 56A: Intermediary Institution
  if (intermediaryBIC) {
    fields.field56A = intermediaryBIC;
    lines.push(`:56A:${intermediaryBIC}`);
  }

  // Field 57A: Account With Institution
  if (accountWithInstitutionBIC) {
    fields.field57A = accountWithInstitutionBIC;
    lines.push(`:57A:${accountWithInstitutionBIC}`);
  }

  // Field 58A: Beneficiary Institution
  if (beneficiaryInstitutionBIC) {
    fields.field58A = beneficiaryInstitutionBIC;
    lines.push(`:58A:${beneficiaryInstitutionBIC}`);
  }

  // Field 50K: Ordering Customer (from MT103)
  if (orderingCustomerAccount || orderingCustomerName) {
    const f50k = [];
    if (orderingCustomerAccount) f50k.push(`/${orderingCustomerAccount}`);
    if (orderingCustomerName) f50k.push(orderingCustomerName);
    if (orderingCustomerAddress) {
      formatAddressSWIFT(orderingCustomerAddress).split("\n").forEach(l => f50k.push(l));
    }
    fields.field50K = f50k.join("\n");
    lines.push(`:50K:${f50k.join("\n")}`);
  }

  // Field 59: Beneficiary (from MT103)
  if (beneficiaryAccount || beneficiaryName) {
    const f59 = [];
    if (beneficiaryAccount) f59.push(`/${beneficiaryAccount}`);
    if (beneficiaryName) f59.push(beneficiaryName);
    if (beneficiaryAddress) {
      formatAddressSWIFT(beneficiaryAddress).split("\n").forEach(l => f59.push(l));
    }
    fields.field59 = f59.join("\n");
    lines.push(`:59:${f59.join("\n")}`);
  }

  // Field 72
  if (field72) {
    fields.field72 = `/INS/${field72}`;
    lines.push(`:72:/INS/${field72}`);
  }

  lines.push("-}");

  return {
    messageContent: lines.join("\n"),
    fields
  };
}

// ============================
// MAIN SWIFT GENERATION ORCHESTRATOR
// ============================

/**
 * Generate SWIFT message(s) for a settled trade.
 *
 * @param {Object} trade - Mongoose trade document (or lean object)
 * @param {string} userId - User who triggered generation
 * @returns {Object} { success, messages: SwiftMessage[], settlementRef, ssiRef }
 */
async function generateSwiftForTrade(trade, userId) {
  // 1. Validate trade is settled
  if (trade.currentStatus !== "SETTLED") {
    throw new Error("SWIFT can only be generated for settled trades");
  }

  // 2. Check if already generated
  if (trade.swiftGenerated) {
    const existing = await SwiftMessage.find({ tradeRef: trade.tradeRef }).lean();
    return {
      success: true,
      messages: existing,
      settlementRef: trade.settlementRef,
      ssiRef: trade.ssiReference,
      alreadyGenerated: true
    };
  }

  // 3. Look up counterparty SSI
  const cptySSI = await getCounterpartySSI(trade);
  if (!cptySSI) {
    throw new Error("Counterparty SSI not found for this trade");
  }

  // 4. Look up Our SSI
  const ourSSI = await getOurSSIForTrade(trade);
  if (!ourSSI) {
    throw new Error(`Our SSI not found for entity=${trade.entity}, currency=${trade.currency}`);
  }

  // 5. Generate references
  const settlementRef = await getNextSettlementRef();
  const ssiRef = await getNextSSIRef(trade.currency);
  const field72Value = generateField72(settlementRef);

  // 6. Determine message type(s) based on counterparty type + agent
  const cptyType = cptySSI.counterpartyType || "";
  const defaultSwift = cptySSI.defaultSwift || "";
  const hasAgent = !!(cptySSI.agentBank && String(cptySSI.agentBank).trim().length > 0);
  const isBank = isBankType(cptyType) || defaultSwift === "MT202";
  const direction = trade.direction; // BUY or SELL

  const messages = [];
  const messageTypes = [];

  if (isBank) {
    // ── BANK → MT202 ──
    const mt202 = generateMT202Message({
      trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value
    });
    const saved = await SwiftMessage.create({
      tradeRef: trade.tradeRef,
      settlementRef,
      ssiRef,
      messageType: "MT202",
      direction,
      counterpartyType: "Bank",
      messageContent: mt202.messageContent,
      fields: mt202.fields,
      generatedBy: userId
    });
    messages.push(saved);
    messageTypes.push("MT202");

  } else if (!hasAgent) {
    // ── NON-BANK, NO AGENT → MT103 ──
    const mt103 = generateMT103Message({
      trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value
    });
    const saved = await SwiftMessage.create({
      tradeRef: trade.tradeRef,
      settlementRef,
      ssiRef,
      messageType: "MT103",
      direction,
      counterpartyType: "Non-Bank",
      messageContent: mt103.messageContent,
      fields: mt103.fields,
      generatedBy: userId
    });
    messages.push(saved);
    messageTypes.push("MT103");

  } else {
    // ── NON-BANK, AGENT EXISTS → MT103 + MT202 COV ──
    const mt103 = generateMT103Message({
      trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value
    });
    const savedMT103 = await SwiftMessage.create({
      tradeRef: trade.tradeRef,
      settlementRef,
      ssiRef,
      messageType: "MT103",
      direction,
      counterpartyType: "Non-Bank",
      messageContent: mt103.messageContent,
      fields: mt103.fields,
      generatedBy: userId
    });
    messages.push(savedMT103);

    const mt202cov = generateMT202COVMessage({
      trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value,
      mt103Ref: mt103.fields.field20
    });
    const savedCOV = await SwiftMessage.create({
      tradeRef: trade.tradeRef,
      settlementRef,
      ssiRef,
      messageType: "MT202COV",
      direction,
      counterpartyType: "Non-Bank",
      messageContent: mt202cov.messageContent,
      fields: mt202cov.fields,
      generatedBy: userId
    });
    messages.push(savedCOV);
    messageTypes.push("MT103", "MT202COV");
  }

  // 7. Update trade with SWIFT tracking data
  await Trade.updateOne(
    { tradeRef: trade.tradeRef },
    {
      $set: {
        settlementRef,
        ssiReference: ssiRef,
        swiftGenerated: true,
        swiftGeneratedAt: new Date(),
        swiftMessageTypes: messageTypes
      }
    }
  );

  console.log(`[SwiftEngine] Generated ${messageTypes.join(" + ")} for ${trade.tradeRef} | Settlement: ${settlementRef} | SSI: ${ssiRef}`);

  return {
    success: true,
    messages,
    settlementRef,
    ssiRef,
    alreadyGenerated: false
  };
}

// ============================
// ROLE-MAPPED MESSAGE BUILDERS
// These apply the Buy/Sell direction logic.
// ============================

/**
 * BUY (We Pay):  Our SSI = Sender/Ordering Customer  |  Cpty SSI = Beneficiary
 * SELL (We Receive): Our SSI = Beneficiary  |  Cpty SSI = Sender/Ordering Customer
 */
function generateMT103Message({ trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value }) {
  const isBuy = direction === "BUY";

  // Determine sender and receiver
  const sender = isBuy ? ourSSI : cptySSI;
  const receiver = isBuy ? cptySSI : ourSSI;

  const senderBIC = isBuy ? (ourSSI.bicSwiftCode || "SBGKGB2LXXX") : (cptySSI.swiftBicCode || "UNKNOWNXXX");
  const receiverBIC = isBuy ? (cptySSI.swiftBicCode || "UNKNOWNXXX") : (ourSSI.bicSwiftCode || "SBGKGB2LXXX");

  const transactionRef = generateTransactionRef(trade.tradeRef);

  return buildMT103({
    senderBIC: senderBIC.substring(0, 11).padEnd(11, "X"),
    receiverBIC: receiverBIC.substring(0, 11).padEnd(11, "X"),
    settlementRef,
    transactionRef,
    valueDate: trade.valueDate,
    currency: trade.currency,
    amount: trade.amount,

    // Ordering Customer (Payer) → Sender side
    orderingCustomerAccount: isBuy ? ourSSI.accountNumber : cptySSI.accountNumber,
    orderingCustomerName: isBuy ? (ourSSI.accountName || ourSSI.entityName) : (cptySSI.finalBeneficiary || cptySSI.counterPartyName),
    orderingCustomerAddress: isBuy ? ourSSI.address : (cptySSI.bankAddress || ""),

    // Ordering Institution
    orderingInstitution: isBuy ? ourSSI.entityName : (cptySSI.accountWithInstitution || cptySSI.counterPartyName),
    orderingInstitutionAccount: null,

    // Correspondents
    senderCorrespondentBIC: isBuy ? (ourSSI.bicSwiftCode || "") : (cptySSI.agentSwiftCode || cptySSI.swiftBicCode || ""),
    receiverCorrespondentBIC: isBuy ? (cptySSI.agentSwiftCode || cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Intermediary
    intermediaryBIC: cptySSI.agentSwiftCode || null,
    intermediaryName: cptySSI.agentBank || null,

    // Account With Institution (Beneficiary's Bank)
    accountWithInstitutionBIC: isBuy ? (cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),
    accountWithInstitutionAccount: isBuy ? cptySSI.accountNumber : ourSSI.accountNumber,
    accountWithInstitutionName: isBuy ? (cptySSI.accountWithInstitution || "") : ourSSI.entityName,
    accountWithInstitutionAddress: isBuy ? (cptySSI.bankAddress || "") : (ourSSI.address || ""),

    // Beneficiary → Receiver side
    beneficiaryAccount: isBuy ? (cptySSI.accountNumber ? String(cptySSI.accountNumber) : "") : ourSSI.accountNumber,
    beneficiaryName: isBuy ? (cptySSI.finalBeneficiary || cptySSI.counterPartyName) : (ourSSI.accountName || ourSSI.entityName),
    beneficiaryAddress: isBuy ? (cptySSI.bankAddress || "") : (ourSSI.address || ""),

    // Payment reference
    remittanceInfo: trade.tradeRef,

    // Charges (from SWIFT 71A column)
    chargeCode: cptySSI.swift71A || "SHA",

    // Field 72
    field72: field72Value
  });
}

/**
 * BUY (We Pay):  Our SSI = Sending Bank  |  Cpty SSI = Receiving Bank
 * SELL (We Receive): Our SSI = Receiving Bank  |  Cpty SSI = Sending Bank
 */
function generateMT202Message({ trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value }) {
  const isBuy = direction === "BUY";

  const senderBIC = isBuy ? (ourSSI.bicSwiftCode || "SBGKGB2LXXX") : (cptySSI.swiftBicCode || "UNKNOWNXXX");
  const receiverBIC = isBuy ? (cptySSI.swiftBicCode || "UNKNOWNXXX") : (ourSSI.bicSwiftCode || "SBGKGB2LXXX");

  const transactionRef = generateTransactionRef(trade.tradeRef);
  const relatedRef = `CORR${formatDateSWIFT(new Date())}${trade.tradeRef.replace(/[^A-Za-z0-9]/g, "").slice(-4)}`;

  return buildMT202({
    senderBIC: senderBIC.substring(0, 11).padEnd(11, "X"),
    receiverBIC: receiverBIC.substring(0, 11).padEnd(11, "X"),
    settlementRef,
    transactionRef,
    relatedRef: relatedRef.substring(0, 16),
    valueDate: trade.valueDate,
    currency: trade.currency,
    amount: trade.amount,

    // Ordering Institution (Sending Bank)
    orderingInstitutionBIC: senderBIC,

    // Correspondents
    senderCorrespondentBIC: isBuy ? (ourSSI.bicSwiftCode || "") : (cptySSI.swiftBicCode || ""),
    receiverCorrespondentBIC: isBuy ? (cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Intermediary
    intermediaryBIC: cptySSI.agentSwiftCode || null,

    // Account With Institution
    accountWithInstitutionBIC: isBuy ? (cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Beneficiary Institution (Receiving Bank)
    beneficiaryInstitutionBIC: receiverBIC,
    beneficiaryInstitutionName: isBuy ? (cptySSI.accountWithInstitution || cptySSI.counterPartyName) : ourSSI.entityName,

    field72: field72Value
  });
}

/**
 * MT202 COV: Coverage payment for MT103 + agent bank scenario.
 * BUY:  Sender in both MT103 and MT202 COV = Our SSI
 * SELL: Beneficiary in MT103, Receiving Institution in MT202 COV = Our SSI
 */
function generateMT202COVMessage({ trade, ourSSI, cptySSI, direction, settlementRef, ssiRef, field72Value, mt103Ref }) {
  const isBuy = direction === "BUY";

  const senderBIC = isBuy ? (ourSSI.bicSwiftCode || "SBGKGB2LXXX") : (cptySSI.swiftBicCode || "UNKNOWNXXX");
  const receiverBIC = isBuy ? (cptySSI.agentSwiftCode || cptySSI.swiftBicCode || "UNKNOWNXXX") : (ourSSI.bicSwiftCode || "SBGKGB2LXXX");

  const transactionRef = generateTransactionRef(trade.tradeRef, "");

  return buildMT202COV({
    senderBIC: senderBIC.substring(0, 11).padEnd(11, "X"),
    receiverBIC: receiverBIC.substring(0, 11).padEnd(11, "X"),
    settlementRef,
    transactionRef,
    mt103Ref: mt103Ref || "",
    valueDate: trade.valueDate,
    currency: trade.currency,
    amount: trade.amount,

    // Ordering Institution
    orderingInstitutionBIC: senderBIC,

    // Correspondents
    senderCorrespondentBIC: isBuy ? (ourSSI.bicSwiftCode || "") : (cptySSI.swiftBicCode || ""),
    receiverCorrespondentBIC: isBuy ? (cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Intermediary — the agent bank
    intermediaryBIC: cptySSI.agentSwiftCode || null,

    // Account With Institution
    accountWithInstitutionBIC: isBuy ? (cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Beneficiary Institution
    beneficiaryInstitutionBIC: isBuy ? (cptySSI.agentSwiftCode || cptySSI.swiftBicCode || "") : (ourSSI.bicSwiftCode || ""),

    // Ordering Customer (from MT103 sender side)
    orderingCustomerAccount: isBuy ? ourSSI.accountNumber : (cptySSI.accountNumber ? String(cptySSI.accountNumber) : ""),
    orderingCustomerName: isBuy ? (ourSSI.accountName || ourSSI.entityName) : (cptySSI.finalBeneficiary || cptySSI.counterPartyName),
    orderingCustomerAddress: isBuy ? (ourSSI.address || "") : (cptySSI.bankAddress || ""),

    // Beneficiary (from MT103 receiver side)
    beneficiaryAccount: isBuy ? (cptySSI.accountNumber ? String(cptySSI.accountNumber) : "") : ourSSI.accountNumber,
    beneficiaryName: isBuy ? (cptySSI.finalBeneficiary || cptySSI.counterPartyName) : (ourSSI.accountName || ourSSI.entityName),
    beneficiaryAddress: isBuy ? (cptySSI.bankAddress || "") : (ourSSI.address || ""),

    field72: field72Value
  });
}

// ============================
// FETCH EXISTING MESSAGES
// ============================

/**
 * Retrieve all SWIFT messages for a trade.
 */
async function getSwiftMessages(tradeRef) {
  return SwiftMessage.find({ tradeRef }).sort({ messageType: 1 }).lean();
}

module.exports = {
  generateSwiftForTrade,
  getSwiftMessages,
  getNextSettlementRef,
  getNextSSIRef,
  generateField72,
  // Exposed for testing
  isBankType,
  formatDateSWIFT,
  formatAmountSWIFT
};
