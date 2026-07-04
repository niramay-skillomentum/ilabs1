// ======================================
// TRADE GENERATOR (V2 — DESK-SPECIFIC TRUTHS)
// Generates realistic trades with:
// - truths.mo (FO truth for MO validation)
// - truths.confirmation (counterparty expected economics)
// - State-aware XML audit trails
// ======================================

const Trade = require("../models/Trade");
const AuditLog = require("../models/AuditLog");
const ageCalculator = require("./ageCalculator");

// ============================
// REFERENCE DATA
// ============================
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD"];
const COUNTERPARTIES = ["CITI", "HSBC", "DB", "JPM", "BNP", "BARC", "MS", "UBS"];
const ENTITIES = ["GS London", "GS New York", "GS Singapore", "GS Tokyo", "GS Frankfurt"];
const REGIONS = ["AMER", "EMEA", "APAC"];
const PRODUCTS = [
  "FX Spot", "FX Forward", "Interest Rate Swap", "Credit Default Swap",
  "Equity", "Corporate Bond", "Government Bond", "Listed Futures", "Listed Options"
];
const TRADE_TYPES = ["OTC", "Listed", "Exchange", "Depository"];
const SETTLEMENT_TYPES = ["ELECTRONIC", "BILATERAL"];
const DIRECTIONS = ["BUY", "SELL"];
const SSI_BICS = ["CITIUS33", "HSBCGB2L", "DEUTDEFF", "CHASUS33", "BNPADEFF", "BARCGB2L", "MSUS33", "UBSWCHZH"];

// Generate deterministic alertCode (6-char alphanumeric) and acronymCode (6-digit numeric) from ssiId
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

// Attach alertCode + acronymCode to each SSI entry
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
    { ssiId: "CPTY-CITI-01", beneficiaryName: "Citigroup Global Markets Inc", beneficiaryBank: "Citibank N.A. New York", beneficiaryBIC: "CITIUS33", accountNumber: "10293847", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. New York"  },
    { ssiId: "CPTY-CITI-02", beneficiaryName: "Citigroup Global Markets Ltd", beneficiaryBank: "Citibank N.A. London", beneficiaryBIC: "CITIGB2L", accountNumber: "39481920", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. London"  },
    { ssiId: "CPTY-CITI-03", beneficiaryName: "Citibank Singapore", beneficiaryBank: "Citibank N.A. Singapore", beneficiaryBIC: "CITISGSG", accountNumber: "83749210", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. New York"  },
    { ssiId: "CPTY-CITI-04", beneficiaryName: "Citigroup Global Markets Europe", beneficiaryBank: "Citibank Europe PLC", beneficiaryBIC: "CITIIE2D", accountNumber: "55667788", accountType: "Vostro", settlementMethod: "CHAPS", correspondentBank: "Citibank N.A. London"  }
  ],
  "HSBC": [
    { ssiId: "CPTY-HSBC-01", beneficiaryName: "HSBC Bank PLC", beneficiaryBank: "HSBC London", beneficiaryBIC: "HSBCGB2L", accountNumber: "88992211", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "HSBC London"  },
    { ssiId: "CPTY-HSBC-02", beneficiaryName: "HSBC USA Inc", beneficiaryBank: "HSBC Bank USA N.A.", beneficiaryBIC: "HSBCUS33", accountNumber: "77665544", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "HSBC Bank USA N.A."  },
    { ssiId: "CPTY-HSBC-03", beneficiaryName: "HSBC France", beneficiaryBank: "HSBC Continental Europe", beneficiaryBIC: "HSBCFRPP", accountNumber: "11223344", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "HSBC Continental Europe"  },
    { ssiId: "CPTY-HSBC-04", beneficiaryName: "HSBC Hong Kong", beneficiaryBank: "The Hongkong and Shanghai Banking Corp", beneficiaryBIC: "HSBCHKHH", accountNumber: "99887766", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "HSBC Bank USA N.A."  }
  ],
  "DB": [
    { ssiId: "CPTY-DB-01", beneficiaryName: "Deutsche Bank AG Frankfurt", beneficiaryBank: "Deutsche Bank AG", beneficiaryBIC: "DEUTDEFF", accountNumber: "10203040", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Deutsche Bank AG"  },
    { ssiId: "CPTY-DB-02", beneficiaryName: "Deutsche Bank Securities Inc", beneficiaryBank: "Deutsche Bank Trust Company Americas", beneficiaryBIC: "BKTRUS33", accountNumber: "50607080", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Deutsche Bank Trust Company Americas"  },
    { ssiId: "CPTY-DB-03", beneficiaryName: "Deutsche Bank AG London", beneficiaryBank: "Deutsche Bank AG London Branch", beneficiaryBIC: "DEUTGB2L", accountNumber: "11221122", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "Deutsche Bank AG London Branch"  },
    { ssiId: "CPTY-DB-04", beneficiaryName: "Deutsche Bank AG Singapore", beneficiaryBank: "Deutsche Bank AG Singapore Branch", beneficiaryBIC: "DEUTSGSG", accountNumber: "33443344", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Deutsche Bank Trust Company Americas"  }
  ],
  "JPM": [
    { ssiId: "CPTY-JPM-01", beneficiaryName: "J.P. Morgan Securities LLC", beneficiaryBank: "JPMorgan Chase Bank N.A.", beneficiaryBIC: "CHASUS33", accountNumber: "90807060", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "JPMorgan Chase Bank N.A."  },
    { ssiId: "CPTY-JPM-02", beneficiaryName: "J.P. Morgan Securities PLC", beneficiaryBank: "JPMorgan Chase Bank N.A. London", beneficiaryBIC: "CHASGB2L", accountNumber: "10901090", accountType: "Vostro", settlementMethod: "CHAPS", correspondentBank: "JPMorgan Chase Bank N.A. London"  },
    { ssiId: "CPTY-JPM-03", beneficiaryName: "J.P. Morgan SE", beneficiaryBank: "J.P. Morgan SE Frankfurt", beneficiaryBIC: "CHASDEFF", accountNumber: "50403020", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "J.P. Morgan SE Frankfurt"  },
    { ssiId: "CPTY-JPM-04", beneficiaryName: "JPMorgan Chase Bank N.A. Sydney", beneficiaryBank: "JPMorgan Chase Bank N.A. Sydney Branch", beneficiaryBIC: "CHASAU2S", accountNumber: "12121212", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "JPMorgan Chase Bank N.A."  }
  ],
  "BNP": [
    { ssiId: "CPTY-BNP-01", beneficiaryName: "BNP Paribas SA", beneficiaryBank: "BNP Paribas Paris", beneficiaryBIC: "BNPADEFF", accountNumber: "11112222", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "BNP Paribas Paris"  },
    { ssiId: "CPTY-BNP-02", beneficiaryName: "BNP Paribas Securities Corp", beneficiaryBank: "BNP Paribas New York Branch", beneficiaryBIC: "BNPAUS33", accountNumber: "33334444", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "BNP Paribas New York Branch"  },
    { ssiId: "CPTY-BNP-03", beneficiaryName: "BNP Paribas London Branch", beneficiaryBank: "BNP Paribas London", beneficiaryBIC: "BNPAGB2L", accountNumber: "55556666", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "BNP Paribas London"  },
    { ssiId: "CPTY-BNP-04", beneficiaryName: "BNP Paribas Singapore", beneficiaryBank: "BNP Paribas Singapore Branch", beneficiaryBIC: "BNPASGSG", accountNumber: "77778888", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "BNP Paribas New York Branch"  }
  ],
  "BARC": [
    { ssiId: "CPTY-BARC-01", beneficiaryName: "Barclays Bank PLC", beneficiaryBank: "Barclays Bank PLC London", beneficiaryBIC: "BARCGB2L", accountNumber: "12344321", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "Barclays Bank PLC London"  },
    { ssiId: "CPTY-BARC-02", beneficiaryName: "Barclays Capital Inc", beneficiaryBank: "Barclays Bank PLC New York", beneficiaryBIC: "BARCUS33", accountNumber: "56788765", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Barclays Bank PLC New York"  },
    { ssiId: "CPTY-BARC-03", beneficiaryName: "Barclays Bank Ireland PLC", beneficiaryBank: "Barclays Bank Ireland PLC", beneficiaryBIC: "BARCIE2D", accountNumber: "90122109", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "Barclays Bank Ireland PLC"  },
    { ssiId: "CPTY-BARC-04", beneficiaryName: "Barclays Bank PLC Singapore", beneficiaryBank: "Barclays Bank PLC Singapore Branch", beneficiaryBIC: "BARCSGSG", accountNumber: "34566543", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Barclays Bank PLC New York"  }
  ],
  "MS": [
    { ssiId: "CPTY-MS-01", beneficiaryName: "Morgan Stanley & Co. LLC", beneficiaryBank: "Morgan Stanley Bank N.A.", beneficiaryBIC: "MSUS33", accountNumber: "10101010", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Morgan Stanley Bank N.A."  },
    { ssiId: "CPTY-MS-02", beneficiaryName: "Morgan Stanley & Co. International", beneficiaryBank: "Morgan Stanley Bank International Ltd", beneficiaryBIC: "MSGB2L", accountNumber: "20202020", accountType: "Vostro", settlementMethod: "CHAPS", correspondentBank: "Morgan Stanley Bank International Ltd"  },
    { ssiId: "CPTY-MS-03", beneficiaryName: "Morgan Stanley Europe SE", beneficiaryBank: "Morgan Stanley Europe SE", beneficiaryBIC: "MSDEFF", accountNumber: "30303030", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "Morgan Stanley Europe SE"  },
    { ssiId: "CPTY-MS-04", beneficiaryName: "Morgan Stanley MUFG Securities Co", beneficiaryBank: "Morgan Stanley MUFG Securities Co Ltd", beneficiaryBIC: "MSJPJT", accountNumber: "40404040", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Morgan Stanley Bank N.A."  }
  ],
  "UBS": [
    { ssiId: "CPTY-UBS-01", beneficiaryName: "UBS AG", beneficiaryBank: "UBS AG Zurich", beneficiaryBIC: "UBSWCHZH", accountNumber: "99009900", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "UBS AG Zurich"  },
    { ssiId: "CPTY-UBS-02", beneficiaryName: "UBS Securities LLC", beneficiaryBank: "UBS AG Stamford Branch", beneficiaryBIC: "UBSWUS33", accountNumber: "88008800", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "UBS AG Stamford Branch"  },
    { ssiId: "CPTY-UBS-03", beneficiaryName: "UBS AG London Branch", beneficiaryBank: "UBS AG London Branch", beneficiaryBIC: "UBSWGB2L", accountNumber: "77007700", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "UBS AG London Branch"  },
    { ssiId: "CPTY-UBS-04", beneficiaryName: "UBS Europe SE", beneficiaryBank: "UBS Europe SE Frankfurt", beneficiaryBIC: "UBSWDEFF", accountNumber: "66006600", accountType: "Vostro", settlementMethod: "TARGET2", correspondentBank: "UBS Europe SE Frankfurt"  }
  ]
});


const ENTITY_SSIS = enrichSSIs({
  "GS London": [
    { ssiId: "ENT-GSLONDON-01", beneficiaryName: "Goldman Sachs International", beneficiaryBank: "GS Bank PLC London", beneficiaryBIC: "GSGB2L", accountNumber: "12312312", accountType: "Nostro", settlementMethod: "CHAPS", correspondentBank: "GS Bank PLC London"  },
    { ssiId: "ENT-GSLONDON-02", beneficiaryName: "Goldman Sachs International", beneficiaryBank: "HSBC Bank PLC", beneficiaryBIC: "HSBCGB2L", accountNumber: "45645645", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "HSBC Bank PLC"  },
    { ssiId: "ENT-GSLONDON-03", beneficiaryName: "Goldman Sachs International", beneficiaryBank: "Barclays Bank PLC", beneficiaryBIC: "BARCGB2L", accountNumber: "78978978", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Barclays Bank PLC"  },
    { ssiId: "ENT-GSLONDON-04", beneficiaryName: "Goldman Sachs International", beneficiaryBank: "Lloyds Bank PLC", beneficiaryBIC: "LLOYGB2L", accountNumber: "32132132", accountType: "Vostro", settlementMethod: "CHAPS", correspondentBank: "Lloyds Bank PLC"  }
  ],
  "GS New York": [
    { ssiId: "ENT-GSNEWYORK-01", beneficiaryName: "Goldman Sachs & Co. LLC", beneficiaryBank: "GS Bank USA New York", beneficiaryBIC: "GSUS33", accountNumber: "98798798", accountType: "Nostro", settlementMethod: "FEDWIRE", correspondentBank: "GS Bank USA New York"  },
    { ssiId: "ENT-GSNEWYORK-02", beneficiaryName: "Goldman Sachs & Co. LLC", beneficiaryBank: "JPMorgan Chase Bank N.A.", beneficiaryBIC: "CHASUS33", accountNumber: "65465465", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "JPMorgan Chase Bank N.A."  },
    { ssiId: "ENT-GSNEWYORK-03", beneficiaryName: "Goldman Sachs & Co. LLC", beneficiaryBank: "Citibank N.A. New York", beneficiaryBIC: "CITIUS33", accountNumber: "32132132", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Citibank N.A. New York"  },
    { ssiId: "ENT-GSNEWYORK-04", beneficiaryName: "Goldman Sachs & Co. LLC", beneficiaryBank: "Bank of America N.A.", beneficiaryBIC: "BOFAUS3N", accountNumber: "85285285", accountType: "Vostro", settlementMethod: "FEDWIRE", correspondentBank: "Bank of America N.A."  }
  ],
  "GS Singapore": [
    { ssiId: "ENT-GSSINGAPORE-01", beneficiaryName: "Goldman Sachs Singapore PTE", beneficiaryBank: "GS Bank Singapore", beneficiaryBIC: "GSSGSG", accountNumber: "11122233", accountType: "Nostro", settlementMethod: "MEPS", correspondentBank: "GS Bank Singapore"  },
    { ssiId: "ENT-GSSINGAPORE-02", beneficiaryName: "Goldman Sachs Singapore PTE", beneficiaryBank: "DBS Bank Ltd", beneficiaryBIC: "DBSSSGSG", accountNumber: "44455566", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "DBS Bank Ltd"  },
    { ssiId: "ENT-GSSINGAPORE-03", beneficiaryName: "Goldman Sachs Singapore PTE", beneficiaryBank: "Standard Chartered Bank", beneficiaryBIC: "SCBLSGSG", accountNumber: "77788899", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Standard Chartered Bank"  },
    { ssiId: "ENT-GSSINGAPORE-04", beneficiaryName: "Goldman Sachs Singapore PTE", beneficiaryBank: "Citibank N.A. Singapore", beneficiaryBIC: "CITISGSG", accountNumber: "22233344", accountType: "Vostro", settlementMethod: "MEPS", correspondentBank: "Citibank N.A. Singapore"  }
  ],
  "GS Tokyo": [
    { ssiId: "ENT-GSTOKYO-01", beneficiaryName: "Goldman Sachs Japan Co Ltd", beneficiaryBank: "GS Bank Tokyo", beneficiaryBIC: "GSJPJT", accountNumber: "99988877", accountType: "Nostro", settlementMethod: "BOJ-NET", correspondentBank: "GS Bank Tokyo"  },
    { ssiId: "ENT-GSTOKYO-02", beneficiaryName: "Goldman Sachs Japan Co Ltd", beneficiaryBank: "MUFG Bank Ltd", beneficiaryBIC: "BOTKJPJT", accountNumber: "66655544", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "MUFG Bank Ltd"  },
    { ssiId: "ENT-GSTOKYO-03", beneficiaryName: "Goldman Sachs Japan Co Ltd", beneficiaryBank: "Sumitomo Mitsui Banking Corp", beneficiaryBIC: "SMBCJPJT", accountNumber: "33322211", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Sumitomo Mitsui Banking Corp"  },
    { ssiId: "ENT-GSTOKYO-04", beneficiaryName: "Goldman Sachs Japan Co Ltd", beneficiaryBank: "Mizuho Bank Ltd", beneficiaryBIC: "MHCBJPJT", accountNumber: "88877766", accountType: "Vostro", settlementMethod: "BOJ-NET", correspondentBank: "Mizuho Bank Ltd"  }
  ],
  "GS Frankfurt": [
    { ssiId: "ENT-GSFRANKFURT-01", beneficiaryName: "Goldman Sachs Bank Europe SE", beneficiaryBank: "GS Bank Europe Frankfurt", beneficiaryBIC: "GSDEFF", accountNumber: "10102020", accountType: "Nostro", settlementMethod: "TARGET2", correspondentBank: "GS Bank Europe Frankfurt"  },
    { ssiId: "ENT-GSFRANKFURT-02", beneficiaryName: "Goldman Sachs Bank Europe SE", beneficiaryBank: "Deutsche Bank AG", beneficiaryBIC: "DEUTDEFF", accountNumber: "30304040", accountType: "Vostro", settlementMethod: "SWIFT", correspondentBank: "Deutsche Bank AG"  },
    { ssiId: "ENT-GSFRANKFURT-03", beneficiaryName: "Goldman Sachs Bank Europe SE", beneficiaryBank: "Commerzbank AG", beneficiaryBIC: "COBADEFF", accountNumber: "50506060", accountType: "Nostro", settlementMethod: "SWIFT", correspondentBank: "Commerzbank AG"  },
    { ssiId: "ENT-GSFRANKFURT-04", beneficiaryName: "Goldman Sachs Bank Europe SE", beneficiaryBank: "DZ Bank AG", beneficiaryBIC: "GENODEF1", accountNumber: "70708080", accountType: "Vostro", settlementMethod: "TARGET2", correspondentBank: "DZ Bank AG"  }
  ]
});

const MO_BREAK_TYPES = ["AMOUNT", "VALUE_DATE", "CURRENCY", "COUNTERPARTY"];
// Confirmation breaks: no counterparty mismatch per user feedback
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
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TRD_${timestamp}_${random}`;
}

function formatDateForXml(date) {
  return new Date(date).toISOString();
}

// ============================
// BREAK DESCRIPTION HELPERS
// ============================

/**
 * Describes the discrepancy between MO truth and booking for a trade.
 */
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
    // ── Event 1: Trade Captured ──
  const captureTime = new Date(tradeDate);
  captureTime.setMinutes(captureTime.getMinutes() + Math.floor(Math.random() * 30));
  events.push({
    eventId: `EVT_${trade.tradeRef}_${String(evtCounter++).padStart(3, "0")}`,
    timestamp: captureTime,
    actor: "TRADE_CAPTURE_SYSTEM",
    action: "TRADE_CAPTURED",
    details: `Trade ${trade.tradeRef} captured. Product: ${trade.product}, Direction: ${trade.direction}, Amount: ${trade.currency} ${trade.amount}, Counterparty: ${trade.counterparty}`,
    status: "NEW"
  });

  // ── Event 2: Compliance Check ──
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

  // ── Event 3: Risk Assessment ──
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

  // ── Event 4: Booking recorded ──
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

  // ── Event 5: Routed to MO ──
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

  // ══════════════════════════════════════════
  // STATE-SPECIFIC CONTINUATION
  // ══════════════════════════════════════════

  if (trade.currentStatus === "MO_BREAK_OPEN") {

    // ── Event 6: Break Identified ──
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
  } // Close the else block for Normal Audit Generation

  // ══════════════════════════════════════════
  // BUILD XML DOCUMENT
  // ══════════════════════════════════════════
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<AuditTrail tradeRef="${trade.tradeRef}" generatedAt="${formatDateForXml(new Date())}">\n`;
  xml += `  <TradeInfo>\n`;
  xml += `    <TradeRef>${trade.tradeRef}</TradeRef>\n`;
  xml += `    <Product>${trade.product}</Product>\n`;
  xml += `    <Direction>${trade.direction}</Direction>\n`;
  xml += `    <Currency>${trade.currency}</Currency>\n`;
  xml += `    <Amount>${trade.amount}</Amount>\n`;
  xml += `    <Counterparty>${trade.counterparty}</Counterparty>\n`;
  xml += `    <Entity>${trade.entity}</Entity>\n`;
  xml += `    <TradeDate>${formatDateForXml(trade.tradeDate)}</TradeDate>\n`;
  xml += `    <ValueDate>${formatDateForXml(trade.valueDate)}</ValueDate>\n`;
  xml += `    <CurrentStatus>${trade.currentStatus}</CurrentStatus>\n`;
  xml += `  </TradeInfo>\n`;

  // Include MO truth vs booking if break exists
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
 * @returns {Object} Trade object (not yet saved to DB)
 */
function generateSingleTrade(desk, isMoBreak, forcedStatus = null, hasConfirmationBreak = false, settlementInitialState = "SETTLEMENT_PENDING", hasSettlementBreak = false) {
  const now = new Date();
  const tradeDate = new Date(now);

  // Constrain tradeDate so that the desk-specific age is at most 1:
  //   MO Desk:           age = days(now - tradeDate),          so tradeDate = today or yesterday (0-1 days ago)
  //   Confirmation Desk:  age = days(now - (tradeDate + 1)),   so tradeDate up to 2 days ago still yields age ≤ 1
  //   Other desks:        default to MO-style (0-1 days ago)
  const maxDaysAgo = desk === "CONFIRMATION" ? 2 : 1;
  tradeDate.setDate(tradeDate.getDate() - Math.floor(Math.random() * (maxDaysAgo + 1)));

  const currency = pick(CURRENCIES);
  const product = pick(PRODUCTS);
  const direction = pick(DIRECTIONS);
  const entity = pick(ENTITIES);
  const foRegion = pick(REGIONS);

  let derivedTradeType = "";
  let derivedSettlementType = "";

  if (["FX Spot", "FX Forward", "Interest Rate Swap", "Credit Default Swap"].includes(product)) {
    derivedTradeType = "OTC";
    derivedSettlementType = "BILATERAL";
  } else if (["Equity", "Listed Futures", "Listed Options"].includes(product)) {
    derivedTradeType = "Exchange";
    derivedSettlementType = "ELECTRONIC";
  } else if (product === "Corporate Bond") {
    derivedTradeType = pick(["Exchange", "Depository"]);
    derivedSettlementType = "ELECTRONIC";
  } else if (product === "Government Bond") {
    derivedTradeType = "Depository";
    derivedSettlementType = "ELECTRONIC";
  }

  // T+2 enforcement
  let valueDate = new Date(tradeDate);
  valueDate.setDate(tradeDate.getDate() + 2);

  const baseAmount = generateRealisticAmount(currency);
  const initialCounterparty = pick(COUNTERPARTIES);

  // 1. UNIVERSAL TRUTH (The Absolute Correct Economics)
  const universalTruth = {
    amount: baseAmount,
    valueDate: new Date(valueDate),
    currency: currency,
    counterparty: initialCounterparty
  };

  // 2. TRUTH SCENARIOS (40/30/30 Distribution)
  let moTruthAmount = universalTruth.amount;
  let moTruthValueDate = new Date(universalTruth.valueDate);
  let moTruthCurrency = universalTruth.currency;
  let moTruthCounterparty = universalTruth.counterparty;

  let confirmTruthAmount = universalTruth.amount;
  let confirmTruthValueDate = new Date(universalTruth.valueDate);
  let confirmTruthCurrency = universalTruth.currency;
  let confirmDisputeType = null;

  let rand = Math.random();
  // Force a truth discrepancy if a confirmation break was explicitly requested
  if (hasConfirmationBreak) {
    rand = 0.4 + (Math.random() * 0.6); 
  }

  if (rand < 0.4) {
    // Scenario 1 (40%): Clean Universally - FO and CPTY truths match Universal
  } else if (rand < 0.7) {
    // Scenario 2 (30%): FO Error - FO Truth != Universal, CPTY Truth == Universal
    const errorField = pick(CONFIRMATION_BREAK_TYPES);
    if (errorField === "AMOUNT") moTruthAmount += (Math.floor(Math.random() * 5) + 1) * 10000;
    else if (errorField === "VALUE_DATE") moTruthValueDate.setDate(moTruthValueDate.getDate() + 1);
    else if (errorField === "CURRENCY") moTruthCurrency = pick(CURRENCIES.filter(c => c !== universalTruth.currency));
    
    // To trigger confirmation logic downstream, flag this as a dispute
    confirmDisputeType = errorField;
  } else {
    // Scenario 3 (30%): CPTY Error - FO Truth == Universal, CPTY Truth != Universal
    confirmDisputeType = pick(CONFIRMATION_BREAK_TYPES);
    if (confirmDisputeType === "AMOUNT") confirmTruthAmount += (Math.floor(Math.random() * 5) + 1) * 10000;
    else if (confirmDisputeType === "VALUE_DATE") confirmTruthValueDate.setDate(confirmTruthValueDate.getDate() + 1);
    else if (confirmDisputeType === "CURRENCY") confirmTruthCurrency = pick(CURRENCIES.filter(c => c !== universalTruth.currency));
  }

  // 3. BOOKING GENERATION
  // MO checks Booking vs FO Truth (moTruth)
  let bookingAmount = moTruthAmount;
  let bookingValueDate = new Date(moTruthValueDate);
  let bookingCurrency = moTruthCurrency;
  let bookingCounterparty = moTruthCounterparty;

  // Inject MO-level break (discrepancy between MO truth and booking)
  if (isMoBreak) {
    const moBreakType = pick(MO_BREAK_TYPES);
    if (moBreakType === "AMOUNT") {
      bookingAmount = moTruthAmount - (Math.floor(Math.random() * 5) + 1) * 10000;
    } else if (moBreakType === "VALUE_DATE") {
      bookingValueDate.setDate(bookingValueDate.getDate() - 1);
    } else if (moBreakType === "CURRENCY") {
      bookingCurrency = pick(CURRENCIES.filter(c => c !== moTruthCurrency));
    } else if (moBreakType === "COUNTERPARTY") {
      bookingCounterparty = pick(COUNTERPARTIES.filter(c => c !== moTruthCounterparty));
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
  const ssiList = direction === "BUY" ? CPTY_SSIS[initialCounterparty] : ENTITY_SSIS[entity];
  const selectedSSI = pick(ssiList);
  
  const sBeneficiaryName = selectedSSI.beneficiaryName;
  const sBeneficiaryBank = selectedSSI.beneficiaryBank;
  const sBeneficiaryBIC = selectedSSI.beneficiaryBIC;
  const sAccountNumber = selectedSSI.accountNumber;
  const sAccountType = selectedSSI.accountType;
  const sSettlementMethod = selectedSSI.settlementMethod;
  const sCorrespondentBank = selectedSSI.correspondentBank;
  const sPaymentReference = "TRD" + Math.floor(Math.random() * 900000) + 100000;
  const sSettlementDate = universalTruth.valueDate;
  const sSettlementType = derivedSettlementType;

  let bookingBeneficiaryName = sBeneficiaryName;
  let bookingBeneficiaryBank = sBeneficiaryBank;
  let bookingBeneficiaryBIC = sBeneficiaryBIC;
  let bookingAccountNumber = sAccountNumber;
  let bookingAccountType = sAccountType;
  let bookingSettlementCurrency = universalTruth.currency;
  let bookingSettlementMethod = sSettlementMethod;
  let bookingCorrespondentBank = sCorrespondentBank;
  let bookingPaymentReference = sPaymentReference;
  let bookingSettlementDate = bookingValueDate;

  if (hasSettlementBreak) {
    const breakFields = ["beneficiaryName", "beneficiaryBank", "beneficiaryBIC", "accountNumber", "accountType", "currency", "settlementMethod", "correspondentBank", "paymentReference", "settlementDate"];
    const field = pick(breakFields);
    if (field === "beneficiaryName") bookingBeneficiaryName = "WRONG NAME";
    else if (field === "beneficiaryBank") bookingBeneficiaryBank = "WRONG BANK";
    else if (field === "beneficiaryBIC") bookingBeneficiaryBIC = "WRONGBIC";
    else if (field === "accountNumber") bookingAccountNumber = "99999999";
    else if (field === "accountType") bookingAccountType = "Vostro";
    else if (field === "currency") bookingSettlementCurrency = pick(CURRENCIES.filter(c => c !== universalTruth.currency));
    else if (field === "settlementMethod") bookingSettlementMethod = "CHAPS";
    else if (field === "correspondentBank") bookingCorrespondentBank = "WRONG CORRESPONDENT";
    else if (field === "paymentReference") bookingPaymentReference = "WRONG_REF";
    else if (field === "settlementDate") {
      const d = new Date(bookingSettlementDate);
      d.setDate(d.getDate() + 1);
      bookingSettlementDate = d;
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
    counterparty: bookingCounterparty,

    truths: {
      universal: {
        amount: universalTruth.amount,
        valueDate: universalTruth.valueDate,
        currency: universalTruth.currency,
        counterparty: universalTruth.counterparty
      },
      mo: {
        amount: moTruthAmount,
        valueDate: moTruthValueDate,
        currency: moTruthCurrency,
        counterparty: moTruthCounterparty
      },
      confirmation: {
        amount: confirmTruthAmount,
        valueDate: confirmTruthValueDate,
        currency: confirmTruthCurrency
      },
      settlement: {
        ssiId: selectedSSI.ssiId,
        amount: universalTruth.amount,
        valueDate: universalTruth.valueDate,
        currency: universalTruth.currency,
        counterparty: universalTruth.counterparty,
        beneficiaryName: sBeneficiaryName,
        beneficiaryBank: sBeneficiaryBank,
        beneficiaryBIC: sBeneficiaryBIC,
        accountNumber: sAccountNumber,
        accountType: sAccountType,
        settlementMethod: sSettlementMethod,
        correspondentBank: sCorrespondentBank,
        paymentReference: sPaymentReference,
        settlementDate: sSettlementDate,
        settlementType: sSettlementType
      }
    },

    settlementDetails: {
      beneficiaryName: bookingBeneficiaryName,
      beneficiaryBank: bookingBeneficiaryBank,
      beneficiaryBIC: bookingBeneficiaryBIC,
      accountNumber: bookingAccountNumber,
      accountType: bookingAccountType,
      currency: bookingSettlementCurrency,
      settlementMethod: bookingSettlementMethod,
      correspondentBank: bookingCorrespondentBank,
      paymentReference: bookingPaymentReference,
      settlementDate: bookingSettlementDate,
      settlementType: sSettlementType
    },

    booking: {
      amount: bookingAmount,
      valueDate: bookingValueDate,
      currency: bookingCurrency,
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
    tradeType: derivedTradeType,
    settlementType: derivedSettlementType,

    age: ageCalculator.calculateAge(tradeDate, now, desk),
    assignedTo: null,
    auditXml: null
  };

  return trade;
}

/**
 * Generate trades with proper MO state distribution.
 *
 * State distribution for MO desk (8 break trades):
 *   - 4 trades: MO_PENDING (break exists but user must discover it)
 *   - 4 trades: MO_BREAK_OPEN (break already identified by system)
 *
 * ~30% of clean trades will also have a confirmation-level break
 * (invisible to MO, only discovered when trade reaches Confirmation desk).
 *
 * @param {number} cleanCount - Number of clean trades
 * @param {number} breakCount - Number of break trades
 * @param {string} desk - Target desk
 * @param {string} settlementInitialState - Configured initial state for settlement
 * @returns {Array} Array of trade objects with XML audits attached
 */
function generateTrades(cleanCount, breakCount, desk, settlementInitialState = "SETTLEMENT_PENDING") {
  const trades = [];

  let defaultCleanStatus = "MO_PENDING";
  if (desk === "CONFIRMATION") defaultCleanStatus = "CONFIRMATION_PENDING";
  if (desk === "SETTLEMENT") defaultCleanStatus = settlementInitialState;

  // ── Generate CLEAN trades ──
  // For MO desk, some clean trades might have a hidden confirmation break
  for (let i = 0; i < cleanCount; i++) {
    let hasConfirmationBreak = false;
    if (desk === "MO") {
      hasConfirmationBreak = Math.random() < CONFIRMATION_BREAK_RATIO;
    }
    const trade = generateSingleTrade(desk, false, defaultCleanStatus, hasConfirmationBreak, settlementInitialState);

    // Generate XML audit (story: captured → validated → routed)
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
      // Distribution: ~50% MO_PENDING, ~50% MO_BREAK_OPEN
      status = i < Math.ceil(breakCount * 0.5) ? "MO_PENDING" : "MO_BREAK_OPEN";
      hasConfirmationBreak = Math.random() < CONFIRMATION_BREAK_RATIO;
    } else if (desk === "CONFIRMATION") {
      // Force confirmation break explicitly
      isMoBreak = false;
      hasConfirmationBreak = true;
      status = "CONFIRMATION_BREAK";
    } else if (desk === "SETTLEMENT") {
      isMoBreak = false;
      hasSettlementBreak = true;
      status = settlementInitialState;
    }

    const trade = generateSingleTrade(desk, isMoBreak, status, hasConfirmationBreak, settlementInitialState, hasSettlementBreak);

    // Generate XML audit
    const { xml } = generateXmlAudit(trade);
    trade.auditXml = xml;

    trades.push(trade);
  }

  return trades;
}

/**
 * Save generated trades to DB and create automated audit log entries.
 * @param {Array} trades - Array of trade objects to persist
 * @returns {Array} Saved trade documents
 */
async function saveGeneratedTrades(trades) {
  if (trades.length === 0) return [];

  try {
    // Insert trades into DB
    const savedTrades = await Trade.insertMany(trades, { ordered: false });

    // Create automated audit log entries with XML content
    const auditEntries = trades.map(trade => ({
      tradeRef: trade.tradeRef,
      action: "SYSTEM_GENERATED",
      userId: "SYSTEM",
      desk: trade.nextDesk,
      details: `Auto-generated trade. Status: ${trade.currentStatus}. MO Break: ${trade.truths?.mo?.amount !== trade.booking?.amount || trade.truths?.mo?.currency !== trade.booking?.currency || trade.truths?.mo?.counterparty !== trade.booking?.counterparty ? 'YES' : 'NO'}. Confirmation Break: ${trade.confirmationScenario?.disputeType ? 'YES (' + trade.confirmationScenario.disputeType + ')' : 'NO'}`,
      xmlContent: trade.auditXml,
      isAutomated: true,
      timestamp: new Date()
    }));

    await AuditLog.insertMany(auditEntries, { ordered: false });

    // ── Inject Mock Conversations for Confirmation Pre-populated States ──
    const conversationEngine = require("./conversationEngine");
    const offlineResponseEngine = require("./offlineResponseEngine");
    
    // Counter for how many proactive emails we've generated
    let proactiveEmailCount = 0;
    
    for (const trade of trades) {
      if (trade.nextDesk === "CONFIRMATION" && trade.currentStatus === "CONFIRMATION_PENDING" && proactiveEmailCount < 3) {
          // Generate a proactive email from CPTY to USER for CONFIRMATION_PENDING
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
    // Ignore duplicate key errors from race conditions
    if (err.code !== 11000) {
      console.error("Trade generation DB error:", err.message);
    }
    return trades; // Return in-memory trades as fallback
  }
}

module.exports = {
  CPTY_SSIS,
  ENTITY_SSIS,
  generateTrades,
  generateSingleTrade,
  generateXmlAudit,
  saveGeneratedTrades,
  generateRealisticAmount
};
