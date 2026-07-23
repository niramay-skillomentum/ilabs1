// ======================================
// TRADE GENERATOR (V3 — REFERENCE-DATA-DRIVEN)
// Generates realistic trades with:
// - 3-tier product taxonomy: Product → Product Type → Trade Type
// - Entity data from Entity data.xlsx
// - Security/underlyer from Security Data.xlsx (3 sheets)
// - Counterparty from SSI Reference.xlsx
// - SSI IDs for each trade
// - truths.mo (FO truth for MO validation)
// - truths.confirmation (counterparty expected economics)
// - State-aware XML audit trails
//
// Product Taxonomy:
//   Derivative  → [Forward, Swap, Listed Options, Listed Futures]
//   FX          → [FX Spot, FX Forward]
//   Equity      → [Equity]
//   Fixed Income → [Corporate Bond, Government Bond, Treasury Note]
//
// Trade Type Mapping:
//   OTC      → Forward, Swap, FX Spot, FX Forward
//   Exchange → Listed Options, Listed Futures
//   Listed   → Corporate Bond, Government Bond, Treasury Note, Equity
// ======================================

const Trade = require("../models/Trade");
const AuditLog = require("../models/AuditLog");
const ageCalculator = require("./ageCalculator");
const ssiRepository = require("./ssiRepository");
const SystemConfig = require("../models/SystemConfig");

// ============================
// 3-TIER PRODUCT TAXONOMY
// ============================
const PRODUCT_TAXONOMY = {
  "Derivative": {
    productTypes: ["Forward", "Swap", "Listed Options", "Listed Futures"],
    tradeTypeMap: {
      "Forward": "OTC",
      "Swap": "OTC",
      "Listed Options": "Exchange",
      "Listed Futures": "Exchange"
    }
  },
  "FX": {
    productTypes: ["FX Spot", "FX Forward"],
    tradeTypeMap: {
      "FX Spot": "OTC",
      "FX Forward": "OTC"
    }
  },
  "Equity": {
    productTypes: ["Equity"],
    tradeTypeMap: {
      "Equity": "Listed"
    }
  },
  "Fixed Income": {
    productTypes: ["Corporate Bond", "Government Bond", "Treasury Note"],
    tradeTypeMap: {
      "Corporate Bond": "Listed",
      "Government Bond": "Listed",
      "Treasury Note": "Listed"
    }
  }
};

const PRODUCTS = Object.keys(PRODUCT_TAXONOMY);

// Settlement type derived from trade type
function deriveSettlementType(tradeType) {
  if (tradeType === "OTC") return "BILATERAL";
  return "ELECTRONIC"; // Exchange, Listed
}

// ============================
// FALLBACK REFERENCE DATA (when MongoDB unavailable)
// ============================
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD"];
const COUNTERPARTIES = ["CITI", "HSBC", "DB", "JPM", "BNP", "BARC", "MS", "UBS"];
const ENTITIES = ["SBG London", "SBG New York", "SBG Singapore", "SBG Tokyo", "SBG Frankfurt"];
const REGIONS = ["AMER", "EMEA", "APAC"];
const DIRECTIONS = ["BUY", "SELL"];

const MO_BREAK_TYPES = ["AMOUNT", "VALUE_DATE", "CURRENCY", "COUNTERPARTY"];
const CONFIRMATION_BREAK_TYPES = ["AMOUNT", "VALUE_DATE", "CURRENCY"];

// System actors for automated audit trails
const SYSTEM_ACTORS = [
  "SYSTEM_BOOKING_ENGINE",
  "AUTO_VALIDATOR",
  "TRADE_CAPTURE_SYSTEM",
  "RISK_ENGINE",
  "COMPLIANCE_CHECK",
  "MO_ANALYST_SYSTEM"
];

// ~30% of MO-clean trades will have a confirmation-level discrepancy
const CONFIRMATION_BREAK_RATIO = 0.3;

// ============================
// IN-MEMORY SSI FALLBACK (for offline/dev mode)
// ============================
function generateSSICodes(ssiId) {
  let hash = 0;
  for (let i = 0; i < ssiId.length; i++) {
    hash = ((hash << 5) - hash + ssiId.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const alphaChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let alertCode = "";
  let h = absHash;
  for (let i = 0; i < 6; i++) {
    alertCode += alphaChars[h % alphaChars.length];
    h = Math.floor(h / alphaChars.length) + (i + 1) * 7;
  }
  const acronymCode = String(100000 + (absHash % 900000));
  return { alertCode, acronymCode };
}

function enrichSSIs(ssiDict) {
  for (const key in ssiDict) {
    ssiDict[key] = ssiDict[key].map(ssi => {
      const codes = generateSSICodes(ssi.ssiId);
      return { ...ssi, alertCode: codes.alertCode, acronymCode: codes.acronymCode };
    });
  }
  return ssiDict;
}

const CPTY_SSIS = enrichSSIs({
  "CITI": [
    { ssiId: "CPTY-CITI-01", beneficiaryName: "Citigroup Global Markets Inc", beneficiaryBank: "Citibank N.A. New York", beneficiaryBIC: "CITIUS33", accountNumber: "10293847", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. New York" },
    { ssiId: "CPTY-CITI-02", beneficiaryName: "Citigroup Global Markets Ltd", beneficiaryBank: "Citibank N.A. London", beneficiaryBIC: "CITIGB2L", accountNumber: "39481920", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. London" }
  ],
  "HSBC": [
    { ssiId: "CPTY-HSBC-01", beneficiaryName: "HSBC Bank PLC", beneficiaryBank: "HSBC London", beneficiaryBIC: "HSBCGB2L", accountNumber: "88992211", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "HSBC London" },
    { ssiId: "CPTY-HSBC-02", beneficiaryName: "HSBC USA Inc", beneficiaryBank: "HSBC Bank USA N.A.", beneficiaryBIC: "HSBCUS33", accountNumber: "77665544", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "HSBC Bank USA N.A." }
  ],
  "DB": [
    { ssiId: "CPTY-DB-01", beneficiaryName: "Deutsche Bank AG Frankfurt", beneficiaryBank: "Deutsche Bank AG", beneficiaryBIC: "DEUTDEFF", accountNumber: "10203040", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Deutsche Bank AG" }
  ],
  "JPM": [
    { ssiId: "CPTY-JPM-01", beneficiaryName: "J.P. Morgan Securities LLC", beneficiaryBank: "JPMorgan Chase Bank N.A.", beneficiaryBIC: "CHASUS33", accountNumber: "90807060", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "JPMorgan Chase Bank N.A." }
  ],
  "BNP": [
    { ssiId: "CPTY-BNP-01", beneficiaryName: "BNP Paribas SA", beneficiaryBank: "BNP Paribas Paris", beneficiaryBIC: "BNPADEFF", accountNumber: "11112222", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "BNP Paribas Paris" }
  ],
  "BARC": [
    { ssiId: "CPTY-BARC-01", beneficiaryName: "Barclays Bank PLC", beneficiaryBank: "Barclays Bank PLC London", beneficiaryBIC: "BARCGB2L", accountNumber: "12344321", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "Barclays Bank PLC London" }
  ],
  "MS": [
    { ssiId: "CPTY-MS-01", beneficiaryName: "Morgan Stanley & Co. LLC", beneficiaryBank: "Morgan Stanley Bank N.A.", beneficiaryBIC: "MSUS33", accountNumber: "10101010", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Morgan Stanley Bank N.A." }
  ],
  "UBS": [
    { ssiId: "CPTY-UBS-01", beneficiaryName: "UBS AG", beneficiaryBank: "UBS AG Zurich", beneficiaryBIC: "UBSWCHZH", accountNumber: "99009900", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "UBS AG Zurich" }
  ]
});

const ENTITY_SSIS = enrichSSIs({
  "SBG London": [
    { ssiId: "ENT-SBGLON-01", beneficiaryName: "Skillomentum Global Bank London", beneficiaryBank: "SBG Bank PLC London", beneficiaryBIC: "SBGB2L", accountNumber: "12312312", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "SBG Bank PLC London" },
    { ssiId: "ENT-SBGLON-02", beneficiaryName: "Skillomentum Global Bank London", beneficiaryBank: "HSBC Bank PLC", beneficiaryBIC: "HSBCGB2L", accountNumber: "45645645", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "HSBC Bank PLC" }
  ],
  "SBG New York": [
    { ssiId: "ENT-SBGNY-01", beneficiaryName: "Skillomentum Global Bank NY", beneficiaryBank: "SBG Bank USA New York", beneficiaryBIC: "SBGUS33", accountNumber: "98798798", accountType: "Nostro", settlementMethod: "FEDWIRE", correspondentBank: "SBG Bank USA New York" }
  ],
  "SBG Singapore": [
    { ssiId: "ENT-SBGSG-01", beneficiaryName: "Skillomentum Global Bank Singapore", beneficiaryBank: "SBG Bank Singapore", beneficiaryBIC: "SBGSGSG", accountNumber: "11122233", accountType: "Nostro", settlementMethod: "MEPS", correspondentBank: "SBG Bank Singapore" }
  ],
  "SBG Tokyo": [
    { ssiId: "ENT-SBGTK-01", beneficiaryName: "Skillomentum Global Bank Tokyo", beneficiaryBank: "SBG Bank Tokyo", beneficiaryBIC: "SBGJPJT", accountNumber: "99988877", accountType: "Nostro", settlementMethod: "BOJ-NET", correspondentBank: "SBG Bank Tokyo" }
  ],
  "SBG Frankfurt": [
    { ssiId: "ENT-SBGFR-01", beneficiaryName: "Skillomentum Global Bank Europe SE", beneficiaryBank: "SBG Bank Europe Frankfurt", beneficiaryBIC: "SBGDEFF", accountNumber: "10102020", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "SBG Bank Europe Frankfurt" }
  ]
});

// ============================
// UTILITY FUNCTIONS
// ============================

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRealisticAmount(currency) {
  let base;
  if (currency === "JPY") base = Math.random() * 10000000;
  else base = Math.random() * 2000000;
  const irregular = Math.floor(Math.random() * 997) + 3;
  return Math.floor(base / irregular) * irregular + Math.floor(Math.random() * 97);
}

function generateTradeRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TRD-${random}`;
}

function formatDateForXml(date) {
  return new Date(date).toISOString();
}

// ============================
// BREAK DESCRIPTION HELPERS
// ============================

function describeBreak(trade) {
  const moTruth = trade.truths?.mo;
  if (!moTruth || !trade.booking) return "Discrepancy detected";

  const mismatches = [];

  if (moTruth.amount !== trade.booking.amount) {
    mismatches.push(`Amount mismatch: FO Truth = ${moTruth.currency || trade.currency} ${moTruth.amount}, Booking = ${trade.booking.currency || trade.currency} ${trade.booking.amount}`);
  }
  if (moTruth.valueDate && trade.booking.valueDate &&
    new Date(moTruth.valueDate).getTime() !== new Date(trade.booking.valueDate).getTime()) {
    mismatches.push(`Value Date mismatch: FO Truth = ${new Date(moTruth.valueDate).toISOString().split("T")[0]}, Booking = ${new Date(trade.booking.valueDate).toISOString().split("T")[0]}`);
  }
  if (moTruth.currency !== trade.booking.currency) {
    mismatches.push(`Currency mismatch: FO Truth = ${moTruth.currency}, Booking = ${trade.booking.currency}`);
  }
  if (moTruth.counterparty !== trade.booking.counterparty) {
    mismatches.push(`Counterparty mismatch: FO Truth = ${moTruth.counterparty}, Booking = ${trade.booking.counterparty}`);
  }

  return mismatches.length > 0
    ? mismatches.join("; ")
    : "Discrepancy detected between FO truth and booking record";
}

// ============================
// STATE-AWARE XML AUDIT GENERATOR
// ============================

function generateXmlAudit(trade) {
  const tradeDate = new Date(trade.tradeDate);
  const events = [];
  let evtCounter = 1;

  const moTruth = trade.truths?.mo;
  const hasBreak = moTruth && trade.booking &&
    (moTruth.amount !== trade.booking.amount ||
     moTruth.currency !== trade.booking.currency ||
     moTruth.counterparty !== trade.booking.counterparty ||
     (moTruth.valueDate && trade.booking.valueDate &&
      new Date(moTruth.valueDate).getTime() !== new Date(trade.booking.valueDate).getTime()));

  // ── CONFIRMATION_BREAK custom audit ──
  if (trade.nextDesk === "CONFIRMATION" && trade.currentStatus === "CONFIRMATION_BREAK") {
    events.push({
      eventId: `EVT_${trade.tradeRef}_001`,
      timestamp: new Date(),
      actor: "SYSTEM",
      action: "BREAK_GENERATED",
      details: "Electronically generated break",
      status: "CONFIRMATION_BREAK"
    });
  } else {
    // ── Normal Audit Generation ──
    const captureTime = new Date(tradeDate);
    captureTime.setMinutes(captureTime.getMinutes() + Math.floor(Math.random() * 30));
    events.push({
      eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
      timestamp: captureTime,
      actor: "TRADE_CAPTURE_SYSTEM",
      action: "TRADE_CAPTURED",
      details: `Trade ${trade.tradeRef} captured. Product: ${trade.product}, Product Type: ${trade.productType || ""}, Direction: ${trade.direction}, Amount: ${trade.currency} ${trade.amount}, Counterparty: ${trade.counterparty}`,
      status: "NEW"
    });

    const complianceTime = new Date(captureTime);
    complianceTime.setMinutes(complianceTime.getMinutes() + Math.floor(Math.random() * 15) + 5);
    events.push({
      eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
      timestamp: complianceTime,
      actor: "COMPLIANCE_CHECK",
      action: "COMPLIANCE_VALIDATED",
      details: `Compliance check passed. Counterparty: ${trade.counterparty}, Entity: ${trade.entity}, Region: ${trade.foRegion}`,
      status: "COMPLIANCE_CLEARED"
    });

    const riskTime = new Date(complianceTime);
    riskTime.setMinutes(riskTime.getMinutes() + Math.floor(Math.random() * 20) + 5);
    events.push({
      eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
      timestamp: riskTime,
      actor: "RISK_ENGINE",
      action: "RISK_ASSESSED",
      details: `Risk assessment completed. Credit category: Standard. Settlement type: ${trade.settlementType}`,
      status: "RISK_CLEARED"
    });

    const bookingTime = new Date(riskTime);
    bookingTime.setMinutes(bookingTime.getMinutes() + Math.floor(Math.random() * 10) + 2);

    if (hasBreak) {
      events.push({
        eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
        timestamp: bookingTime,
        actor: "SYSTEM_BOOKING_ENGINE",
        action: "BOOKING_RECORDED",
        details: `Booking recorded. Amount: ${trade.booking.currency} ${trade.booking.amount}, Value Date: ${new Date(trade.booking.valueDate).toISOString().split("T")[0]}, Counterparty: ${trade.booking.counterparty}`,
        status: "BOOKING_RECORDED"
      });
    } else {
      events.push({
        eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
        timestamp: bookingTime,
        actor: "AUTO_VALIDATOR",
        action: "BOOKING_VALIDATED",
        details: `Booking matches front office truth. No discrepancies found. Trade routed to MO desk for validation.`,
        status: "BOOKING_VALIDATED"
      });
    }

    const routeTime = new Date(bookingTime);
    routeTime.setMinutes(routeTime.getMinutes() + Math.floor(Math.random() * 5) + 1);
    events.push({
      eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
      timestamp: routeTime,
      actor: "SYSTEM_BOOKING_ENGINE",
      action: "ROUTED_TO_MO",
      details: `Trade routed to MO desk for processing. Status: MO_PENDING`,
      status: "MO_PENDING"
    });

    if (trade.currentStatus === "MO_BREAK_OPEN") {
      const breakIdentifyTime = new Date(routeTime);
      breakIdentifyTime.setMinutes(breakIdentifyTime.getMinutes() + Math.floor(Math.random() * 45) + 10);
      const breakDescription = describeBreak(trade);
      events.push({
        eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
        timestamp: breakIdentifyTime,
        actor: "MO_ANALYST_SYSTEM",
        action: "BREAK_IDENTIFIED",
        details: `Break identified during MO review. ${breakDescription}. Trade status changed from MO_PENDING to MO_BREAK_OPEN.`,
        status: "MO_BREAK_OPEN"
      });
    }
  }

  // ── BUILD XML DOCUMENT ──
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<AuditTrail tradeRef="${trade.tradeRef}" generatedAt="${formatDateForXml(new Date())}">\n`;
  xml += `  <TradeInfo>\n`;
  xml += `    <TradeRef>${trade.tradeRef}</TradeRef>\n`;
  xml += `    <Product>${trade.product}</Product>\n`;
  xml += `    <ProductType>${trade.productType || ""}</ProductType>\n`;
  xml += `    <TradeType>${trade.tradeType || ""}</TradeType>\n`;
  xml += `    <Underlyer>${trade.underlyer || ""}</Underlyer>\n`;
  xml += `    <Direction>${trade.direction}</Direction>\n`;
  xml += `    <Currency>${trade.currency}</Currency>\n`;
  xml += `    <Amount>${trade.amount}</Amount>\n`;
  xml += `    <Counterparty>${trade.counterparty}</Counterparty>\n`;
  xml += `    <Entity>${trade.entity}</Entity>\n`;
  xml += `    <TradeDate>${formatDateForXml(trade.tradeDate)}</TradeDate>\n`;
  xml += `    <ValueDate>${formatDateForXml(trade.valueDate)}</ValueDate>\n`;
  xml += `    <CurrentStatus>${trade.currentStatus}</CurrentStatus>\n`;
  xml += `  </TradeInfo>\n`;

  if (hasBreak && moTruth) {
    xml += `  <DiscrepancyInfo>\n`;
    xml += `    <FOTruth>\n`;
    xml += `      <Amount>${moTruth.amount}</Amount>\n`;
    xml += `      <ValueDate>${formatDateForXml(moTruth.valueDate)}</ValueDate>\n`;
    xml += `      <Currency>${moTruth.currency}</Currency>\n`;
    xml += `      <Counterparty>${moTruth.counterparty}</Counterparty>\n`;
    xml += `    </FOTruth>\n`;
    xml += `    <Booking>\n`;
    xml += `      <Amount>${trade.booking.amount}</Amount>\n`;
    xml += `      <ValueDate>${formatDateForXml(trade.booking.valueDate)}</ValueDate>\n`;
    xml += `      <Currency>${trade.booking.currency}</Currency>\n`;
    xml += `      <Counterparty>${trade.booking.counterparty}</Counterparty>\n`;
    xml += `    </Booking>\n`;
    xml += `  </DiscrepancyInfo>\n`;
  }

  xml += `  <Events>\n`;
  events.forEach(evt => {
    xml += `    <Event>\n`;
    xml += `      <EventId>${evt.eventId}</EventId>\n`;
    xml += `      <Timestamp>${formatDateForXml(evt.timestamp)}</Timestamp>\n`;
    xml += `      <Actor>${evt.actor}</Actor>\n`;
    xml += `      <Action>${evt.action}</Action>\n`;
    xml += `      <Details>${evt.details}</Details>\n`;
    xml += `      <ResultingStatus>${evt.status}</ResultingStatus>\n`;
    xml += `    </Event>\n`;
  });
  xml += `  </Events>\n`;
  xml += `</AuditTrail>`;

  return { xml, events };
}

// ============================
// TRADE GENERATION
// ============================

/**
 * Generate a single realistic trade object with desk-specific truths.
 * @param {string} desk - Target desk (MO, CONFIRMATION, SETTLEMENT)
 * @param {boolean} isMoBreak - Whether to inject an MO-level break
 * @param {string|null} forcedStatus - Force a specific status
 * @param {boolean} hasConfirmationBreak - Whether to inject a confirmation-level break
 * @param {string} settlementInitialState - Configured initial state for settlement
 * @param {boolean} hasSettlementBreak - Whether to inject a settlement-level break
 * @param {Object|null} ssiPairData - Pre-selected SSI pair from ssiRepository
 * @returns {Object} Trade object (not yet saved to DB)
 */
function generateSingleTrade(desk, isMoBreak, forcedStatus = null, hasConfirmationBreak = false, settlementInitialState = "SETTLEMENT_PENDING", hasSettlementBreak = false, ssiPairData = null, options = {}) {
  const now = new Date();
  const tradeDate = new Date(now);

  let maxDaysAgo = 2; // MO default max days ago
  if (desk === "CONFIRMATION") maxDaysAgo = 3;
  if (desk === "SETTLEMENT") maxDaysAgo = 3;
  
  tradeDate.setDate(tradeDate.getDate() - Math.floor(Math.random() * (maxDaysAgo + 1)));

  // ── PRODUCT TAXONOMY SELECTION ──
  // When reference data provides product/productType/tradeType, use those.
  // Otherwise, randomly select from the taxonomy.
  let product, productType, tradeType;
  
  if (ssiPairData && ssiPairData.product) {
    product = ssiPairData.product;
    productType = ssiPairData.productType || pick(PRODUCT_TAXONOMY[product]?.productTypes || [product]);
    tradeType = ssiPairData.tradeType || PRODUCT_TAXONOMY[product]?.tradeTypeMap?.[productType] || "OTC";
  } else {
    product = pick(PRODUCTS);
    productType = pick(PRODUCT_TAXONOMY[product].productTypes);
    tradeType = PRODUCT_TAXONOMY[product].tradeTypeMap[productType];
  }

  const derivedSettlementType = deriveSettlementType(tradeType);

  // ── ENTITY SELECTION ──
  // From reference data or fallback
  let entity, foRegion;
  if (ssiPairData && ssiPairData.entityName) {
    entity = ssiPairData.entityName;
    foRegion = ssiPairData.entityRegion || pick(REGIONS);
  } else {
    entity = pick(ENTITIES);
    foRegion = pick(REGIONS);
  }

  // ── CURRENCY & COUNTERPARTY ──
  const currency = (ssiPairData && ssiPairData.currency) ? ssiPairData.currency : pick(CURRENCIES);
  const direction = pick(DIRECTIONS);

  // T+2 enforcement
  let valueDate = new Date(tradeDate);
  valueDate.setDate(tradeDate.getDate() + 2);

  let baseAmount;
  const recentAmounts = options.recentAmounts || [];
  if (recentAmounts.length > 0 && Math.random() < 0.20) {
    baseAmount = pick(recentAmounts);
  } else {
    baseAmount = generateRealisticAmount(currency);
    if (options.recentAmounts) {
      options.recentAmounts.push(baseAmount);
      // Keep memory short to encourage turnover
      if (options.recentAmounts.length > 20) options.recentAmounts.shift();
    }
  }

  const initialCounterpartyGroup = (ssiPairData && ssiPairData.truthSSI?.counterpartyGroup) ? ssiPairData.truthSSI.counterpartyGroup : (ssiPairData?.counterpartyName || pick(COUNTERPARTIES));
  const initialCounterparty = (ssiPairData && ssiPairData.truthSSI?.counterpartyName) ? ssiPairData.truthSSI.counterpartyName : initialCounterpartyGroup;

  // ── UNDERLYER ──
  const underlyer = (ssiPairData && ssiPairData.underlyer) ? ssiPairData.underlyer : null;

  // ── SSI IDs ──
  const ssiId = (ssiPairData && ssiPairData.presentedSsiId) ? ssiPairData.presentedSsiId : null;
  const truthSsiId = (ssiPairData && ssiPairData.truthSsiId) ? ssiPairData.truthSsiId : null;

  // 1. UNIVERSAL TRUTH
  const universalTruth = {
    amount: baseAmount,
    valueDate: new Date(valueDate),
    currency: currency,
    counterpartyGroup: initialCounterpartyGroup,
    counterparty: initialCounterparty
  };

  // 2. TRUTH SCENARIOS (40/30/30 Distribution)
  let moTruthAmount = universalTruth.amount;
  let moTruthValueDate = new Date(universalTruth.valueDate);
  let moTruthCurrency = universalTruth.currency;
  let moTruthCounterpartyGroup = universalTruth.counterpartyGroup;
  let moTruthCounterparty = universalTruth.counterparty;

  let confirmTruthAmount = universalTruth.amount;
  let confirmTruthValueDate = new Date(universalTruth.valueDate);
  let confirmTruthCurrency = universalTruth.currency;
  let confirmDisputeType = null;

  let rand = 0; // Strictly Clean Universally unless explicitly requested
  if (hasConfirmationBreak) {
    rand = 0.4 + (Math.random() * 0.6);
  }

  if (rand < 0.4) {
    // Scenario 1 (40%): Clean Universally
  } else if (rand < 0.7) {
    // Scenario 2 (30%): FO Error
    const errorField = pick(CONFIRMATION_BREAK_TYPES);
    if (errorField === "AMOUNT") moTruthAmount += (Math.floor(Math.random() * 5) + 1) * 10000;
    else if (errorField === "VALUE_DATE") moTruthValueDate.setDate(moTruthValueDate.getDate() + 1);
    else if (errorField === "CURRENCY") moTruthCurrency = pick(CURRENCIES.filter(c => c !== universalTruth.currency));
    confirmDisputeType = errorField;
  } else {
    // Scenario 3 (30%): CPTY Error
    confirmDisputeType = pick(CONFIRMATION_BREAK_TYPES);
    if (confirmDisputeType === "AMOUNT") confirmTruthAmount += (Math.floor(Math.random() * 5) + 1) * 10000;
    else if (confirmDisputeType === "VALUE_DATE") confirmTruthValueDate.setDate(confirmTruthValueDate.getDate() + 1);
    else if (confirmDisputeType === "CURRENCY") confirmTruthCurrency = pick(CURRENCIES.filter(c => c !== universalTruth.currency));
  }

  // 3. BOOKING GENERATION
  let bookingAmount = moTruthAmount;
  let bookingValueDate = new Date(moTruthValueDate);
  let bookingCurrency = moTruthCurrency;
  let bookingCounterpartyGroup = moTruthCounterpartyGroup;
  let bookingCounterparty = moTruthCounterparty;

  if (isMoBreak) {
    const moBreakType = pick(MO_BREAK_TYPES);
    if (moBreakType === "AMOUNT") {
      bookingAmount = moTruthAmount - (Math.floor(Math.random() * 5) + 1) * 10000;
    } else if (moBreakType === "VALUE_DATE") {
      bookingValueDate.setDate(bookingValueDate.getDate() - 1);
    } else if (moBreakType === "CURRENCY") {
      bookingCurrency = pick(CURRENCIES.filter(c => c !== moTruthCurrency));
    } else if (moBreakType === "COUNTERPARTY") {
      bookingCounterpartyGroup = pick(COUNTERPARTIES.filter(c => c !== moTruthCounterpartyGroup));
      bookingCounterparty = bookingCounterpartyGroup; // Simplification for breaks
    }
  }

  // Determine status
  let currentStatus;
  if (forcedStatus) {
    currentStatus = forcedStatus;
  } else if (desk === "MO") {
    currentStatus = "MO_PENDING";
  } else if (desk === "CONFIRMATION") {
    currentStatus = isMoBreak ? "CONFIRMATION_BREAK" : "CONFIRMATION_PENDING";
  } else if (desk === "SETTLEMENT") {
    currentStatus = isMoBreak ? "SETTLEMENT_BREAK" : settlementInitialState;
  } else {
    currentStatus = desk + "_PENDING";
  }

  // 4. SETTLEMENT DETAILS GENERATION
  const sPaymentReference = "TRD" + Math.floor(Math.random() * 900000) + 100000;
  const sSettlementDate = universalTruth.valueDate;

  let truthSettlement;
  let presentedSettlement;
  let truthSSIRefId = null;
  let presentedSSIRefId = null;

  if (ssiPairData) {
    // ── REFERENCE DATA PATH (MongoDB-backed) ──
    truthSSIRefId = ssiPairData.truthSSIRefId;
    presentedSSIRefId = ssiPairData.presentedSSIRefId;

    truthSettlement = {
      ...ssiPairData.truthSSI,
      ssiRefId: ssiPairData.truthSSIRefId,
      amount: universalTruth.amount,
      valueDate: universalTruth.valueDate,
      currency: universalTruth.currency,
      counterparty: universalTruth.counterparty,
      paymentReference: sPaymentReference,
      settlementDate: sSettlementDate,
      settlementType: ssiPairData.settlementType || derivedSettlementType
    };

    presentedSettlement = {
      ...ssiPairData.presentedSSI,
      ssiRefId: ssiPairData.presentedSSIRefId,
      currency: universalTruth.currency,
      paymentReference: sPaymentReference,
      settlementDate: bookingValueDate,
      settlementType: ssiPairData.settlementType || derivedSettlementType
    };

    console.log(`[TradeGen] SSI from reference data: truth=${truthSSIRefId}, presented=${presentedSSIRefId}, break=${ssiPairData.breakScenario || 'NONE'}`);
  } else {
    // ── IN-MEMORY FALLBACK PATH ──
    const ssiList = direction === "BUY" ? CPTY_SSIS[initialCounterparty] : ENTITY_SSIS[entity];
    const selectedSSI = ssiList ? pick(ssiList) : { ssiId: "FALLBACK-SSI-01", beneficiaryName: "Fallback", beneficiaryBank: "Fallback Bank", beneficiaryBIC: "FLLBK00", accountNumber: "00000000", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Fallback Bank" };

    truthSettlement = {
      ssiId: selectedSSI.ssiId,
      amount: universalTruth.amount,
      valueDate: universalTruth.valueDate,
      currency: universalTruth.currency,
      counterparty: universalTruth.counterparty,
      beneficiaryName: selectedSSI.beneficiaryName,
      beneficiaryBank: selectedSSI.beneficiaryBank,
      beneficiaryBIC: selectedSSI.beneficiaryBIC,
      accountNumber: selectedSSI.accountNumber,
      accountType: selectedSSI.accountType,
      settlementMethod: selectedSSI.settlementMethod,
      correspondentBank: selectedSSI.correspondentBank,
      paymentReference: sPaymentReference,
      settlementDate: sSettlementDate,
      settlementType: derivedSettlementType
    };

    if (hasSettlementBreak && ssiList && ssiList.length > 1) {
      const altSSI = pick(ssiList.filter(s => s.ssiId !== selectedSSI.ssiId));
      presentedSettlement = {
        ssiId: altSSI.ssiId,
        beneficiaryName: altSSI.beneficiaryName,
        beneficiaryBank: altSSI.beneficiaryBank,
        beneficiaryBIC: altSSI.beneficiaryBIC,
        accountNumber: altSSI.accountNumber,
        accountType: altSSI.accountType,
        currency: universalTruth.currency,
        settlementMethod: altSSI.settlementMethod,
        correspondentBank: altSSI.correspondentBank,
        paymentReference: sPaymentReference,
        settlementDate: bookingValueDate,
        settlementType: derivedSettlementType
      };
    } else {
      presentedSettlement = {
        ...truthSettlement,
        settlementDate: bookingValueDate
      };
    }
  }

  const trade = {
    tradeRef: generateTradeRef(),
    originType: "AUTO_GENERATED",
    isAutoGenerated: true,

    tradeDate,
    valueDate: bookingValueDate,
    nextDesk: desk,
    currentStatus,

    amount: bookingAmount,
    currency: bookingCurrency,
    counterpartyGroup: bookingCounterpartyGroup,
    counterparty: bookingCounterparty,

    // SSI reference traceability
    truthSSIRefId,
    presentedSSIRefId,

    truths: {
      universal: {
        amount: universalTruth.amount,
        valueDate: universalTruth.valueDate,
        currency: universalTruth.currency,
        counterpartyGroup: universalTruth.counterpartyGroup,
        counterparty: universalTruth.counterparty
      },
      mo: {
        amount: moTruthAmount,
        valueDate: moTruthValueDate,
        currency: moTruthCurrency,
        counterpartyGroup: moTruthCounterpartyGroup,
        counterparty: moTruthCounterparty
      },
      confirmation: {
        amount: confirmTruthAmount,
        valueDate: confirmTruthValueDate,
        currency: confirmTruthCurrency
      },
      settlement: truthSettlement
    },

    settlementDetails: presentedSettlement,

    booking: {
      amount: bookingAmount,
      valueDate: bookingValueDate,
      currency: bookingCurrency,
      counterpartyGroup: bookingCounterpartyGroup,
      counterparty: bookingCounterparty
    },

    // Confirmation scenario metadata
    confirmationScenario: {
      disputeType: confirmDisputeType,
      expectedEconomics: confirmDisputeType ? {
        amount: confirmTruthAmount,
        valueDate: confirmTruthValueDate,
        currency: confirmTruthCurrency
      } : null,
      evidence: []
    },

    foEscalation: {
      status: null
    },

    amendmentHistory: [],

    direction,
    entity,
    foRegion,
    product,
    productType,
    tradeType,
    settlementType: derivedSettlementType,
    underlyer,
    ssiId,
    truthSsiId,

    age: ageCalculator.calculateAge(tradeDate, now, desk),
    assignedTo: null,
    auditXml: null
  };

  return trade;
}

/**
 * Generate trades with proper MO state distribution.
 */
async function generateTrades(cleanCount, breakCount, desk, settlementInitialState = "SETTLEMENT_PENDING") {
  const trades = [];

  let defaultCleanStatus = "MO_PENDING";
  if (desk === "CONFIRMATION") defaultCleanStatus = "CONFIRMATION_PENDING";
  if (desk === "SETTLEMENT") defaultCleanStatus = settlementInitialState;

  // ── Pre-fetch SSI pairs from reference data (if available) ──
  const useRefData = await ssiRepository.isReferenceDataAvailable();
  let ssiPairs = [];

  if (useRefData) {
    console.log(`[TradeGen] Using reference data for SSI generation`);
    const totalTrades = cleanCount + breakCount;
    ssiPairs = await _prefetchSSIPairs(totalTrades, cleanCount, breakCount);
    console.log(`[TradeGen] Pre-fetched ${ssiPairs.length} SSI pairs (${ssiPairs.filter(p => p.breakScenario).length} breaks)`);
  } else {
    console.log(`[TradeGen] MongoDB unavailable — using in-memory SSI fallback`);
  }

  let ssiIndex = 0;

  // ── Pre-fetch RECENT_AMOUNTS from MongoDB ──
  let recentAmountsDoc = await SystemConfig.findOne({ key: "RECENT_AMOUNTS" });
  let recentAmounts = recentAmountsDoc ? (recentAmountsDoc.value || []) : [];
  const genOptions = { recentAmounts };

  // 1. Generate Clean Trades ──
  for (let i = 0; i < cleanCount; i++) {
    let hasConfirmationBreak = false;
    if (desk === "MO") {
      hasConfirmationBreak = Math.random() < CONFIRMATION_BREAK_RATIO;
    }

    const ssiPairData = ssiPairs[ssiIndex] || null;
    if (ssiPairData) ssiIndex++;

    const trade = generateSingleTrade(desk, false, defaultCleanStatus, hasConfirmationBreak, settlementInitialState, false, ssiPairData, genOptions);

    const { xml } = generateXmlAudit(trade);
    trade.auditXml = xml;

    trades.push(trade);
  }

  // ── Generate BREAK trades with varied states ──
  for (let i = 0; i < breakCount; i++) {
    let isMoBreak = false;
    let status = defaultCleanStatus;
    let hasConfirmationBreak = false;
    let hasSettlementBreak = false;

    if (desk === "MO") {
      isMoBreak = true;
      status = i < Math.ceil(breakCount * 0.5) ? "MO_PENDING" : "MO_BREAK_OPEN";
      hasConfirmationBreak = Math.random() < CONFIRMATION_BREAK_RATIO;
    } else if (desk === "CONFIRMATION") {
      isMoBreak = false;
      hasConfirmationBreak = true;
      status = "CONFIRMATION_BREAK";
    } else if (desk === "SETTLEMENT") {
      isMoBreak = false;
      hasSettlementBreak = true;
      status = settlementInitialState;
    }

    const ssiPairData = ssiPairs[ssiIndex] || null;
    if (ssiPairData) ssiIndex++;

    const trade = generateSingleTrade(desk, isMoBreak, status, hasConfirmationBreak, settlementInitialState, hasSettlementBreak, ssiPairData, genOptions);

    const { xml } = generateXmlAudit(trade);
    trade.auditXml = xml;

    trades.push(trade);
  }

  // ── Save updated RECENT_AMOUNTS back to MongoDB ──
  try {
    await SystemConfig.findOneAndUpdate(
      { key: "RECENT_AMOUNTS" },
      { $set: { value: genOptions.recentAmounts } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (e) {
    console.error("[TradeGen] Error saving RECENT_AMOUNTS:", e);
  }

  return trades;
}

/**
 * Pre-fetch SSI pairs from reference data for a batch of trades.
 * Now uses the 3-tier product taxonomy to select securities.
 */
async function _prefetchSSIPairs(totalCount, cleanCount, breakCount) {
  const pairs = [];

  // Step 1: Get available currencies from SSI reference data
  const ssiCurrencies = await ssiRepository.getAvailableCurrencies();
  if (ssiCurrencies.length === 0) return pairs;

  // Step 2: Get the natural CORRESPONDENT/DIRECT ratio
  const ratioData = await ssiRepository.getSettlementTypeRatio();
  const correspondentRatio = ratioData.ratio;

  const cleanCorrespondent = Math.round(cleanCount * correspondentRatio);
  const cleanDirect = cleanCount - cleanCorrespondent;
  const breakCorrespondent = Math.round(breakCount * correspondentRatio);
  const breakDirect = breakCount - breakCorrespondent;

  console.log(`[TradeGen] Settlement type ratio: ${(correspondentRatio * 100).toFixed(0)}% CORRESPONDENT / ${((1 - correspondentRatio) * 100).toFixed(0)}% DIRECT`);
  console.log(`[TradeGen] Distribution: Clean(CORR:${cleanCorrespondent} DIR:${cleanDirect}) Break(CORR:${breakCorrespondent} DIR:${breakDirect})`);

  for (let i = 0; i < cleanCorrespondent; i++) {
    const enriched = await _resolveReferenceChain(ssiCurrencies, false, "CORRESPONDENT");
    if (enriched) pairs.push(enriched);
  }
  for (let i = 0; i < cleanDirect; i++) {
    const enriched = await _resolveReferenceChain(ssiCurrencies, false, "DIRECT");
    if (enriched) pairs.push(enriched);
  }
  for (let i = 0; i < breakCorrespondent; i++) {
    const enriched = await _resolveReferenceChain(ssiCurrencies, true, "CORRESPONDENT");
    if (enriched) pairs.push(enriched);
  }
  for (let i = 0; i < breakDirect; i++) {
    const enriched = await _resolveReferenceChain(ssiCurrencies, true, "DIRECT");
    if (enriched) pairs.push(enriched);
  }

  return pairs;
}

/**
 * Resolve the full reference data chain for one trade using 3-tier taxonomy:
 *   Product → Product Type → Security (from matching sheet) → Currency → Counterparty → SSI
 *
 * Also fetches a random entity from the Entity collection.
 */
async function _resolveReferenceChain(ssiCurrencies, hasBreak, preferredSettlementType = null) {
  let pair = null;
  let currency = null;
  let counterparty = null;
  let security = null;

  // Pick product and product type from taxonomy
  const product = pick(PRODUCTS);
  const taxonomy = PRODUCT_TAXONOMY[product];
  const productType = pick(taxonomy.productTypes);
  const tradeType = taxonomy.tradeTypeMap[productType];

  // Get entity from reference data
  const entity = await ssiRepository.getRandomEntity();

  let attempts = 0;
  const maxAttempts = 10;

  while (!pair && attempts < maxAttempts) {
    attempts++;

    // Select a security matching the product type
    security = await ssiRepository.getSecurityByProductType(productType);

    if (security) {
      // Read currency from security
      currency = security.currency ? security.currency.toUpperCase() : null;

      if (currency) {
        // Verify this currency has SSI counterparties
        const counterparties = await ssiRepository.getCounterpartiesForCurrency(currency);
        if (counterparties.length === 0) continue;
        counterparty = pick(counterparties);
      } else {
        continue;
      }
    } else {
      // No security found for this product type — pick random currency from SSI
      currency = pick(ssiCurrencies);
      const counterparties = await ssiRepository.getCounterpartiesForCurrency(currency);
      if (counterparties.length === 0) continue;
      counterparty = pick(counterparties);
    }

    if (!counterparty) continue;

    pair = await ssiRepository.selectSSIPair(counterparty, currency, hasBreak, preferredSettlementType);
  }

  if (!pair) {
    console.warn(`[TradeGen] Failed to generate SSI pair for ${product}/${productType} after ${maxAttempts} attempts`);
    return null;
  }

  // Determine underlyer from security
  let underlyer = null;
  if (security) {
    underlyer = security.underlyer || security.companyName || security.isin || null;
  }

  return {
    ...pair,
    currency,
    counterpartyName: counterparty,
    product,
    productType,
    tradeType,
    underlyer,
    entityName: entity ? entity.entityName : null,
    entityRegion: entity ? entity.region : null,
    security: security ? {
      isin: security.isin,
      companyName: security.companyName,
      issuingCountry: security.issuingCountry,
      underlyer: security.underlyer,
      sheetName: security.sheetName
    } : null
  };
}

/**
 * Save generated trades to DB and create automated audit log entries.
 */
async function saveGeneratedTrades(trades) {
  if (trades.length === 0) return [];

  try {
    const savedTrades = await Trade.insertMany(trades, { ordered: false });

    const auditEntries = trades.map(trade => ({
      tradeRef: trade.tradeRef,
      action: "SYSTEM_GENERATED",
      userId: "SYSTEM",
      desk: trade.nextDesk,
      details: `Auto-generated trade. Status: ${trade.currentStatus}. Product: ${trade.product}/${trade.productType}. MO Break: ${trade.truths?.mo?.amount !== trade.booking?.amount || trade.truths?.mo?.currency !== trade.booking?.currency || trade.truths?.mo?.counterparty !== trade.booking?.counterparty ? 'YES' : 'NO'}. Confirmation Break: ${trade.confirmationScenario?.disputeType ? 'YES (' + trade.confirmationScenario.disputeType + ')' : 'NO'}`,
      xmlContent: trade.auditXml,
      isAutomated: true,
      timestamp: new Date()
    }));

    await AuditLog.insertMany(auditEntries, { ordered: false });

    // ── Inject Mock Conversations for Confirmation Pre-populated States ──
    const conversationEngine = require("./conversationEngine");
    
    let proactiveEmailCount = 0;
    
    for (const trade of trades) {
      if (trade.nextDesk === "CONFIRMATION" && trade.currentStatus === "CONFIRMATION_PENDING" && proactiveEmailCount < 3) {
          const confirmationTruth = trade.truths?.confirmation || {};
          const formatDate = (dateStr) => {
              if (!dateStr) return "";
              return new Date(dateStr).toISOString().split('T')[0];
          };

          const tableHtml = `
          <br><br>
          <table style="border-collapse: collapse; width: 100%; max-width: 400px; font-size: 13px; text-align: left;">
            <tr><th style="border: 1px solid #c8c8c8; padding: 6px; background-color: #f3f2f1;">Field</th><th style="border: 1px solid #c8c8c8; padding: 6px; background-color: #f3f2f1;">Value</th></tr>
            <tr><td style="border: 1px solid #c8c8c8; padding: 6px;">Trade Date</td><td style="border: 1px solid #c8c8c8; padding: 6px;">${formatDate(trade.tradeDate)}</td></tr>
            <tr><td style="border: 1px solid #c8c8c8; padding: 6px;">Value Date</td><td style="border: 1px solid #c8c8c8; padding: 6px;">${formatDate(confirmationTruth.valueDate || trade.valueDate)}</td></tr>
            <tr><td style="border: 1px solid #c8c8c8; padding: 6px;">Direction</td><td style="border: 1px solid #c8c8c8; padding: 6px;">${trade.direction}</td></tr>
            <tr><td style="border: 1px solid #c8c8c8; padding: 6px;">Currency</td><td style="border: 1px solid #c8c8c8; padding: 6px;">${confirmationTruth.currency || trade.currency}</td></tr>
            <tr><td style="border: 1px solid #c8c8c8; padding: 6px;">Amount</td><td style="border: 1px solid #c8c8c8; padding: 6px;">${confirmationTruth.amount || trade.amount}</td></tr>
          </table>
          <br>
          `;

          const body = `Hi, below are the details for trade ${trade.tradeRef}. Please confirm this matches your records. Thanks.${tableHtml}`;
          
          await conversationEngine.createMessage(
            trade.tradeRef,
            "COUNTERPARTY",
            body,
            `Confirmation Request from CPTY - ${trade.tradeRef}`,
            "CONFIRMATION"
          );
          proactiveEmailCount++;
      }
    }

    return savedTrades;
  } catch (err) {
    if (err.code !== 11000) {
      console.error("Trade generation DB error:", err.message);
    }
    return trades;
  }
}

module.exports = {
  CPTY_SSIS,
  ENTITY_SSIS,
  PRODUCT_TAXONOMY,
  generateTrades,
  generateSingleTrade,
  generateXmlAudit,
  saveGeneratedTrades,
  generateRealisticAmount
};
