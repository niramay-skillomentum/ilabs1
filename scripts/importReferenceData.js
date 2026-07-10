// ======================================
// REFERENCE DATA IMPORT SCRIPT
// Imports SSI Reference and Security Data from Excel into MongoDB.
//
// Usage:  npm run import-reference-data
//
// This is an offline, manually-executed import.
// It is NOT a new engine — it is a utility script.
// ======================================

require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const { connectDB } = require("../src/db");

// Models
const SSIReference = require("../src/models/SSIReference");
const Security = require("../src/models/Security");
const Counterparty = require("../src/models/Counterparty");

// ============================
// CONFIGURATION
// ============================
const REFERENCE_DATA_DIR = path.join(__dirname, "..", "reference data", "source");
const SSI_FILE = path.join(REFERENCE_DATA_DIR, "SSI Reference.xlsx");
const SECURITY_FILE = path.join(REFERENCE_DATA_DIR, "Security Data.xlsx");

// Batch size for bulk inserts (prevents memory issues with 55k rows)
const BATCH_SIZE = 1000;

// ============================
// LOGGING
// ============================
const stats = {
  ssi: { total: 0, inserted: 0, skipped: 0, errors: [] },
  securities: { total: 0, inserted: 0, skipped: 0, errors: [] },
  counterparties: { total: 0, inserted: 0, skipped: 0, errors: [] }
};

function logSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

function logStat(category) {
  const s = stats[category];
  console.log(`\n  📊 ${category.toUpperCase()} Import Statistics:`);
  console.log(`     Total rows:   ${s.total}`);
  console.log(`     Inserted:     ${s.inserted}`);
  console.log(`     Skipped:      ${s.skipped}`);
  if (s.errors.length > 0) {
    console.log(`     Errors:       ${s.errors.length}`);
    s.errors.slice(0, 5).forEach(e => console.log(`       - ${e}`));
    if (s.errors.length > 5) console.log(`       ... and ${s.errors.length - 5} more`);
  }
}

// ============================
// SSI REFERENCE IMPORT
// ============================

/**
 * Derive settlement type from SSI record.
 * If agentBank exists → CORRESPONDENT, else → DIRECT.
 */
function deriveSettlementType(row) {
  const agentBank = row["Agent Bank"];
  if (agentBank && String(agentBank).trim().length > 0) {
    return "CORRESPONDENT";
  }
  return "DIRECT";
}

/**
 * Generate a stable source ID from row data for deduplication.
 */
function generateSourceId(row, index) {
  const id = row["ID"] || "";
  const ccy = row["CCY"] || "";
  const acct = row["Account Number"] || "";
  return `${id}-${ccy}-${acct}-${index}`;
}

/**
 * Validate that a row has the minimum required fields.
 * @returns {string|null} Error message or null if valid
 */
function validateSSIRow(row, rowIndex) {
  if (!row["ID"]) return `Row ${rowIndex}: Missing ID`;
  if (!row["Group Counter Party Name"]) return `Row ${rowIndex}: Missing Group Counter Party Name`;
  if (!row["CCY"]) return `Row ${rowIndex}: Missing CCY (currency)`;
  if (!row["Account with Institution"] && !row["Final Beneficiary"]) {
    return `Row ${rowIndex}: Missing both Account with Institution and Final Beneficiary`;
  }
  return null;
}

async function importSSIReference(importBatch) {
  logSection("IMPORTING SSI REFERENCE DATA");
  console.log(`  Source: ${SSI_FILE}`);

  const workbook = XLSX.readFile(SSI_FILE);
  const sheetName = "Final Table";
  
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`  ❌ Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`);
    return;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  stats.ssi.total = rows.length;

  console.log(`  Found ${rows.length} rows in "${sheetName}"`);
  console.log(`  Clearing existing SSI reference data...`);
  await SSIReference.deleteMany({});

  const documents = [];
  const skippedReasons = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const error = validateSSIRow(row, i + 2); // +2 for 1-indexed + header
    if (error) {
      stats.ssi.skipped++;
      const reason = error.split(": ")[1] || error;
      skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
      continue;
    }

    documents.push({
      sourceId: generateSourceId(row, i),
      cptyId: row["ID"] ? String(row["ID"]).trim() : null,
      groupCounterPartyName: String(row["Group Counter Party Name"]).trim(),
      counterPartyName: String(row["Counter Party Name"] || row["Group Counter Party Name"]).trim(),
      counterpartyType: row["Counterparty Type"] ? String(row["Counterparty Type"]).trim() : null,
      typeCode: row["TypeCode"] ? String(row["TypeCode"]).trim() : null,
      registeredCountry: row["Registered Country "] ? String(row["Registered Country "]).trim() : null,
      ssiOnAlert: row["SSI on Alert"] ? String(row["SSI on Alert"]).trim() : null,
      alertAcronym: row["Alert Acronym"] ? String(row["Alert Acronym"]).trim() : null,
      alertCode: row["Alert Code"] ? String(row["Alert Code"]).trim() : null,
      currency: String(row["CCY"]).trim().toUpperCase(),
      defaultSwift: row["Default SWIFT"] ? String(row["Default SWIFT"]).trim() : null,
      accountWithInstitution: row["Account with Institution"] ? String(row["Account with Institution"]).trim() : null,
      swiftBicCode: row["SWIFT / BIC Code"] ? String(row["SWIFT / BIC Code"]).trim() : null,
      abaRoutingNumber: row["ABA Routing Number"] != null ? String(row["ABA Routing Number"]).trim() : null,
      country: row["Country"] ? String(row["Country"]).trim() : null,
      accountNumber: row["Account Number"] != null ? String(row["Account Number"]).trim() : null,
      field72: row["Field 72"] ? String(row["Field 72"]).trim() : null,
      finalBeneficiary: row["Final Beneficiary"] ? String(row["Final Beneficiary"]).trim() : null,
      refA: row["A"] != null ? row["A"] : null,
      refB: row["B"] != null ? row["B"] : null,
      refC: row["C"] != null ? row["C"] : null,
      agentBank: row["Agent Bank"] ? String(row["Agent Bank"]).trim() : null,
      agentSwiftCode: row["Agent Swift Code"] ? String(row["Agent Swift Code"]).trim() : null,
      accountAtAgent: row["Account at Agent"] != null ? String(row["Account at Agent"]).trim() : null,
      settlementType: deriveSettlementType(row),
      active: true,
      importBatch,
      importedAt: new Date()
    });

    // Bulk insert in batches
    if (documents.length >= BATCH_SIZE) {
      try {
        const result = await SSIReference.insertMany(documents, { ordered: false });
        stats.ssi.inserted += result.length;
      } catch (err) {
        // Handle partial inserts
        if (err.insertedDocs) stats.ssi.inserted += err.insertedDocs.length;
        stats.ssi.errors.push(`Batch insert error: ${err.message}`);
      }
      documents.length = 0;
      process.stdout.write(`  Progress: ${stats.ssi.inserted + stats.ssi.skipped}/${rows.length}\r`);
    }
  }

  // Insert remaining
  if (documents.length > 0) {
    try {
      const result = await SSIReference.insertMany(documents, { ordered: false });
      stats.ssi.inserted += result.length;
    } catch (err) {
      if (err.insertedDocs) stats.ssi.inserted += err.insertedDocs.length;
      stats.ssi.errors.push(`Final batch error: ${err.message}`);
    }
  }

  console.log();
  if (Object.keys(skippedReasons).length > 0) {
    console.log("  Skipped row reasons:");
    Object.entries(skippedReasons).forEach(([reason, count]) => {
      console.log(`    - ${reason}: ${count} rows`);
    });
  }

  logStat("ssi");
}

// ============================
// SECURITY DATA IMPORT
// ============================

async function importSecurities(importBatch) {
  logSection("IMPORTING SECURITY DATA");
  console.log(`  Source: ${SECURITY_FILE}`);

  const workbook = XLSX.readFile(SECURITY_FILE);
  const sheetName = "Sheet1";

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`  ❌ Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`);
    return;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  stats.securities.total = rows.length;

  console.log(`  Found ${rows.length} rows in "${sheetName}"`);
  console.log(`  Clearing existing security data...`);
  await Security.deleteMany({});

  const documents = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row["ISIN"] || !row["CCY"]) {
      stats.securities.skipped++;
      stats.securities.errors.push(`Row ${i + 2}: Missing ISIN or CCY`);
      continue;
    }

    documents.push({
      companyName: String(row["Company Name"] || "").trim(),
      isin: String(row["ISIN"]).trim(),
      currency: String(row["CCY"]).trim().toUpperCase(),
      issuingCountry: String(row["Issuing Country"] || "").trim(),
      importBatch,
      importedAt: new Date()
    });
  }

  if (documents.length > 0) {
    try {
      const result = await Security.insertMany(documents, { ordered: false });
      stats.securities.inserted = result.length;
    } catch (err) {
      if (err.insertedDocs) stats.securities.inserted = err.insertedDocs.length;
      stats.securities.errors.push(`Insert error: ${err.message}`);
    }
  }

  logStat("securities");
}

// ============================
// COUNTERPARTY EXTRACTION
// ============================

async function extractCounterparties(importBatch) {
  logSection("EXTRACTING COUNTERPARTIES FROM SSI DATA");

  console.log("  Clearing existing counterparty data...");
  await Counterparty.deleteMany({});

  // Aggregate unique counterparties from the SSI collection
  const uniqueCptys = await SSIReference.aggregate([
    {
      $group: {
        _id: "$groupCounterPartyName",
        counterpartyName: { $first: "$counterPartyName" },
        country: { $first: "$registeredCountry" },
        type: { $first: "$counterpartyType" },
        typeCode: { $first: "$typeCode" },
        sourceId: { $first: "$sourceId" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  stats.counterparties.total = uniqueCptys.length;
  console.log(`  Found ${uniqueCptys.length} unique counterparties`);

  const documents = uniqueCptys.map(cpty => ({
    counterpartyId: cpty.sourceId ? cpty.sourceId.split("-")[0] : cpty._id,
    counterpartyName: cpty._id,
    group: cpty._id,
    country: cpty.country,
    type: cpty.type,
    typeCode: cpty.typeCode,
    importBatch,
    importedAt: new Date()
  }));

  if (documents.length > 0) {
    try {
      const result = await Counterparty.insertMany(documents, { ordered: false });
      stats.counterparties.inserted = result.length;
    } catch (err) {
      if (err.insertedDocs) stats.counterparties.inserted = err.insertedDocs.length;
      stats.counterparties.errors.push(`Insert error: ${err.message}`);
    }
  }

  logStat("counterparties");
}

// ============================
// MAIN
// ============================

async function main() {
  console.log("\n🚀 Reference Data Import — Starting...\n");
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  await connectDB();

  const importBatch = `IMPORT_${Date.now()}`;
  console.log(`  Import Batch: ${importBatch}`);

  // 1. Import SSI Reference Data
  await importSSIReference(importBatch);

  // 2. Import Security Data
  await importSecurities(importBatch);

  // 3. Extract Counterparties from SSI Data
  await extractCounterparties(importBatch);

  // ============================
  // SUMMARY
  // ============================
  logSection("IMPORT COMPLETE — SUMMARY");
  console.log(`  SSI References:  ${stats.ssi.inserted} records`);
  console.log(`  Securities:      ${stats.securities.inserted} records`);
  console.log(`  Counterparties:  ${stats.counterparties.inserted} records`);
  
  const totalErrors = stats.ssi.errors.length + stats.securities.errors.length + stats.counterparties.errors.length;
  if (totalErrors > 0) {
    console.log(`\n  ⚠️ ${totalErrors} error(s) encountered during import. Review logs above.`);
  } else {
    console.log(`\n  ✅ All imports completed successfully.`);
  }

  // Log available currencies for SSI lookup
  const currencies = await SSIReference.distinct("currency");
  console.log(`\n  Available SSI currencies: ${currencies.sort().join(", ")}`);

  // Log counterparty count with SSI coverage
  const cptysWithSSI = await SSIReference.distinct("groupCounterPartyName");
  console.log(`  Counterparties with SSI data: ${cptysWithSSI.length}`);

  // Log settlement type distribution
  const typeDistribution = await SSIReference.aggregate([
    { $group: { _id: "$settlementType", count: { $sum: 1 } } }
  ]);
  console.log(`  Settlement types: ${typeDistribution.map(t => `${t._id}: ${t.count}`).join(", ")}`);

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Fatal import error:", err);
  process.exit(1);
});
