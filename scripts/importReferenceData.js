// ======================================
// REFERENCE DATA IMPORT SCRIPT
// Imports SSI Reference, Security Data (3 sheets), and Entity Data from Excel into MongoDB.
//
// Usage:  npm run import-reference-data
//
// Security Data.xlsx sheets:
//   - "EQ FI"      → Equity + Fixed Income securities
//   - "FX"         → FX securities (currency pairs)
//   - "Derivative"  → Derivative securities
//
// Entity data.xlsx:
//   - "Sheet1" → Entity master data (entity name, code, currency, address)
//
// SSI Reference.xlsx:
//   - "Final Table" → SSI reference data (55k+ rows) — each row gets a unique SSI ID
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
const Entity = require("../src/models/Entity");

// ============================
// CONFIGURATION
// ============================
const REFERENCE_DATA_DIR = path.join(__dirname, "..", "reference-data", "source");
const SSI_FILE = path.join(REFERENCE_DATA_DIR, "SSI Reference.xlsx");
const SECURITY_FILE = path.join(REFERENCE_DATA_DIR, "Security Data.xlsx");
const ENTITY_FILE = path.join(REFERENCE_DATA_DIR, "Entity data.xlsx");

// Batch size for bulk inserts (prevents memory issues with 55k rows)
const BATCH_SIZE = 1000;

// ============================
// SSI ID GENERATION
// ============================
// Generate a unique, deterministic, human-readable SSI ID for each SSI record.
// Format: SSI-{GroupAbbrev}-{CCY}-{4-digit hash}
// Example: SSI-BNYM-ZAR-3847
function generateSsiId(row, index) {
  if (row["SSI ID"]) {
    return String(row["SSI ID"]).trim();
  }

  // Create abbreviated group name (first 4 chars of group, uppercased)
  const groupName = String(row["Group Counter Party Name"] || "").trim();
  const groupAbbrev = groupName.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || "UNKN";
  const ccy = String(row["CCY"] || "").trim().toUpperCase();

  // Create a deterministic hash from row data for uniqueness
  const rawKey = `${row["ID"] || ""}-${ccy}-${row["Account Number"] || ""}-${index}`;
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = ((hash << 5) - hash + rawKey.charCodeAt(i)) | 0;
  }
  const hashSuffix = String(Math.abs(hash) % 10000).padStart(4, "0");

  return `SSI-${groupAbbrev}-${ccy}-${hashSuffix}`;
}

// ============================
// LOGGING
// ============================
const stats = {
  ssi: { total: 0, inserted: 0, skipped: 0, errors: [] },
  securities: { total: 0, inserted: 0, skipped: 0, errors: [] },
  counterparties: { total: 0, inserted: 0, skipped: 0, errors: [] },
  entities: { total: 0, inserted: 0, skipped: 0, errors: [] }
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
// ENTITY DATA IMPORT
// ============================

// Derive region from entity name / address
function deriveRegion(entityName, address) {
  const text = `${entityName} ${address}`.toLowerCase();
  if (text.includes("new york") || text.includes("chicago") || text.includes("toronto") || text.includes("americas") || text.includes("usa") || text.includes("united states")) return "AMER";
  if (text.includes("london") || text.includes("frankfurt") || text.includes("paris") || text.includes("zurich") || text.includes("dublin") || text.includes("united kingdom") || text.includes("germany") || text.includes("france") || text.includes("switzerland") || text.includes("europe") || text.includes("south africa") || text.includes("johannesburg")) return "EMEA";
  if (text.includes("singapore") || text.includes("tokyo") || text.includes("hong kong") || text.includes("sydney") || text.includes("mumbai") || text.includes("shanghai") || text.includes("australia") || text.includes("japan") || text.includes("india") || text.includes("asia")) return "APAC";
  return "EMEA"; // Default
}

async function importEntityData(importBatch) {
  logSection("IMPORTING ENTITY DATA");
  console.log(`  Source: ${ENTITY_FILE}`);

  const workbook = XLSX.readFile(ENTITY_FILE);
  const sheetName = "Sheet1";

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`  ❌ Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`);
    return;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip header row
  const dataRows = rows.slice(1).filter(r => r && r.length > 0 && r[1]);
  stats.entities.total = dataRows.length;

  console.log(`  Found ${dataRows.length} data rows in "${sheetName}"`);
  console.log(`  Clearing existing entity data...`);
  await Entity.deleteMany({});

  // Headers: Entity Code (currency) | Entity Name | Entity Code (short code) | Address
  const documents = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const currency = String(row[0] || "").trim().toUpperCase();
    const entityName = String(row[1] || "").trim();
    const entityCode = String(row[2] || "").trim();
    const address = String(row[3] || "").trim();

    if (!entityName || !currency) {
      stats.entities.skipped++;
      continue;
    }

    documents.push({
      entityName,
      entityCode,
      currency,
      address,
      region: deriveRegion(entityName, address),
      importBatch,
      importedAt: new Date()
    });
  }

  if (documents.length > 0) {
    try {
      const result = await Entity.insertMany(documents, { ordered: false });
      stats.entities.inserted = result.length;
    } catch (err) {
      if (err.insertedDocs) stats.entities.inserted = err.insertedDocs.length;
      stats.entities.errors.push(`Insert error: ${err.message}`);
    }
  }

  // Log unique entities
  const uniqueEntities = [...new Set(documents.map(d => d.entityName))];
  console.log(`  Unique entity names: ${uniqueEntities.join(", ")}`);
  console.log(`  Unique currencies: ${[...new Set(documents.map(d => d.currency))].sort().join(", ")}`);

  logStat("entities");
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

    // Generate unique SSI ID for this record
    const ssiId = generateSsiId(row, i);

    documents.push({
      sourceId: generateSourceId(row, i),
      ssiId,
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

/**
 * Import securities from all 3 sheets in Security Data.xlsx.
 *
 * Sheet "EQ FI" (Equity + Fixed Income):
 *   Headers: Company Name | ISIN | CCY | Security Description | Issuing Country | Product | Product Type | Trade Type
 *
 * Sheet "FX":
 *   Headers: Underlyer | Currency | Product | Product Type | Trade Type
 *
 * Sheet "Derivative":
 *   Headers: Company Name | Underlyer | CCY | Security Description | Issuing Country | Product | Product Type | Trade Type
 */
async function importSecurities(importBatch) {
  logSection("IMPORTING SECURITY DATA (3 SHEETS)");
  console.log(`  Source: ${SECURITY_FILE}`);

  const workbook = XLSX.readFile(SECURITY_FILE);
  console.log(`  Available sheets: ${workbook.SheetNames.join(", ")}`);

  console.log(`  Clearing existing security data...`);
  await Security.deleteMany({});

  const allDocuments = [];

  // ── Sheet 1: EQ FI (Equity + Fixed Income) ──
  if (workbook.SheetNames.includes("EQ FI")) {
    const sheet = workbook.Sheets["EQ FI"];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`\n  Sheet "EQ FI": ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const product = String(row["Product"] || "").trim();
      const productType = String(row["Product Type"] || "").trim();
      const tradeType = String(row["Trade Type"] || "").trim();
      const companyName = String(row["Company Name"] || "").trim();
      const isin = String(row["ISIN"] || "").trim();
      const ccy = String(row["CCY"] || "").trim().toUpperCase();

      if (!ccy || !product || !productType) {
        stats.securities.skipped++;
        continue;
      }

      allDocuments.push({
        companyName,
        isin,
        currency: ccy,
        issuingCountry: String(row["Issuing Country"] || "").trim(),
        securityDescription: String(row["Security Description"] || "").trim(),
        underlyer: String(row["Underlyer"] || "").trim() || isin || companyName,
        product,
        productType,
        tradeType,
        sheetName: "EQ FI",
        importBatch,
        importedAt: new Date()
      });
    }
  } else {
    console.warn(`  ⚠️ Sheet "EQ FI" not found`);
  }

  // ── Sheet 2: FX ──
  if (workbook.SheetNames.includes("FX")) {
    const sheet = workbook.Sheets["FX"];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`  Sheet "FX": ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const underlyer = String(row["Underlyer"] || "").trim();
      const currencyPair = String(row["Currency"] || "").trim().toUpperCase();
      const product = String(row["Product"] || "").trim();
      const productType = String(row["Product Type"] || "").trim();
      const tradeType = String(row["Trade Type"] || "").trim();

      if (!currencyPair || !product || !productType) {
        stats.securities.skipped++;
        continue;
      }

      // For FX, the currency is the base currency (first 3 chars of pair like AUD/SEK → AUD)
      const baseCcy = currencyPair.split("/")[0] || currencyPair.substring(0, 3);

      allDocuments.push({
        companyName: null,
        isin: null,
        currency: baseCcy,
        issuingCountry: null,
        securityDescription: `FX ${currencyPair}`,
        underlyer: underlyer || `FX ${currencyPair}`,
        product,
        productType,
        tradeType,
        sheetName: "FX",
        // Store the full currency pair for display
        currencyPair,
        importBatch,
        importedAt: new Date()
      });
    }
  } else {
    console.warn(`  ⚠️ Sheet "FX" not found`);
  }

  // ── Sheet 3: Derivative ──
  if (workbook.SheetNames.includes("Derivative")) {
    const sheet = workbook.Sheets["Derivative"];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`  Sheet "Derivative": ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const companyName = String(row["Company Name"] || "").trim();
      const underlyer = String(row["Underlyer"] || "").trim();
      const ccy = String(row["CCY"] || "").trim().toUpperCase();
      const product = String(row["Product"] || "").trim();
      const productType = String(row["Product Type"] || "").trim();
      const tradeType = String(row["Trade Type"] || "").trim();

      if (!ccy || !product || !productType) {
        stats.securities.skipped++;
        continue;
      }

      allDocuments.push({
        companyName: companyName || null,
        isin: underlyer || null, // Underlyer column in Derivative sheet holds ISIN-like values
        currency: ccy,
        issuingCountry: String(row["Issuing Country"] || "").trim(),
        securityDescription: String(row["Security Description"] || "").trim(),
        underlyer: underlyer || companyName || "N/A",
        product,
        productType,
        tradeType,
        sheetName: "Derivative",
        importBatch,
        importedAt: new Date()
      });
    }
  } else {
    console.warn(`  ⚠️ Sheet "Derivative" not found`);
  }

  stats.securities.total = allDocuments.length + stats.securities.skipped;

  // Bulk insert all securities
  if (allDocuments.length > 0) {
    try {
      const result = await Security.insertMany(allDocuments, { ordered: false });
      stats.securities.inserted = result.length;
    } catch (err) {
      if (err.insertedDocs) stats.securities.inserted = err.insertedDocs.length;
      stats.securities.errors.push(`Insert error: ${err.message}`);
    }
  }

  // Log per-product distribution
  const productDist = {};
  allDocuments.forEach(d => {
    const key = `${d.product} → ${d.productType} → ${d.tradeType}`;
    productDist[key] = (productDist[key] || 0) + 1;
  });
  console.log(`\n  Product taxonomy distribution:`);
  Object.entries(productDist).sort().forEach(([key, count]) => {
    console.log(`    ${key}: ${count} securities`);
  });

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

  // 1. Import Entity Data
  await importEntityData(importBatch);

  // 2. Import SSI Reference Data
  await importSSIReference(importBatch);

  // 3. Import Security Data (3 sheets)
  await importSecurities(importBatch);

  // 4. Extract Counterparties from SSI Data
  await extractCounterparties(importBatch);

  // ============================
  // SUMMARY
  // ============================
  logSection("IMPORT COMPLETE — SUMMARY");
  console.log(`  Entities:        ${stats.entities.inserted} records`);
  console.log(`  SSI References:  ${stats.ssi.inserted} records`);
  console.log(`  Securities:      ${stats.securities.inserted} records`);
  console.log(`  Counterparties:  ${stats.counterparties.inserted} records`);
  
  const totalErrors = stats.ssi.errors.length + stats.securities.errors.length + stats.counterparties.errors.length + stats.entities.errors.length;
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

  // Log security product distribution
  const productDist = await Security.aggregate([
    { $group: { _id: { product: "$product", productType: "$productType" }, count: { $sum: 1 } } },
    { $sort: { "_id.product": 1, "_id.productType": 1 } }
  ]);
  console.log(`\n  Security products:`);
  productDist.forEach(p => console.log(`    ${p._id.product} → ${p._id.productType}: ${p.count}`));

  // Log entity summary
  const entityNames = await Entity.distinct("entityName");
  console.log(`\n  Entities: ${entityNames.join(", ")}`);

  // Log sample SSI IDs
  const sampleSSIs = await SSIReference.find({}).limit(5).select("ssiId groupCounterPartyName currency").lean();
  console.log(`\n  Sample SSI IDs:`);
  sampleSSIs.forEach(s => console.log(`    ${s.ssiId} — ${s.groupCounterPartyName} (${s.currency})`));

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Fatal import error:", err);
  process.exit(1);
});
