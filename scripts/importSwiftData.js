// ======================================
// SWIFT DATA IMPORT SCRIPT
// Imports Our SSI data from Our_SSI.xlsx and updates existing
// SSI Reference records with new columns from Counterparty_SSI.xlsx
// (bankAddress, agentBankAddress, swift71A)
//
// Usage:  node scripts/importSwiftData.js
// ======================================

require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const { connectDB } = require("../src/db");

const OurSSI = require("../src/models/OurSSI");
const SSIReference = require("../src/models/SSIReference");

const OUR_SSI_FILE = path.join(__dirname, "..", "Our_SSI.xlsx");
const COUNTERPARTY_SSI_FILE = path.join(__dirname, "..", "Counterparty_SSI.xlsx");
const BATCH_SIZE = 1000;

// ============================
// IMPORT OUR SSI
// ============================
async function importOurSSI(importBatch) {
  console.log("\n" + "=".repeat(60));
  console.log("  IMPORTING OUR SSI DATA");
  console.log("=".repeat(60));
  console.log(`  Source: ${OUR_SSI_FILE}`);

  const fs = require("fs");
  if (!fs.existsSync(OUR_SSI_FILE)) {
    console.log("  ❌ Our_SSI.xlsx not found — aborting.");
    return;
  }

  const workbook = XLSX.readFile(OUR_SSI_FILE);
  const sheetName = workbook.SheetNames[0] || "Sheet1";
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  const dataRows = rows.slice(1).filter(r => r && r.length > 0 && r[0]);

  console.log(`  Found ${dataRows.length} data rows`);
  console.log(`  Clearing existing Our SSI data...`);
  await OurSSI.deleteMany({});

  const documents = [];
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const currency = String(row[0] || "").trim().toUpperCase();
    const entityName = String(row[1] || "").trim();
    const entityCode = String(row[2] || "").trim();
    const address = String(row[3] || "").trim();
    const bicSwiftCode = String(row[4] || "").trim();
    const accountName = String(row[5] || "").trim();
    const accountNumber = row[6] != null ? String(row[6]).trim() : "";
    const field72 = row[7] ? String(row[7]).trim() : null;

    if (!currency || !entityName) {
      skipped++;
      continue;
    }

    documents.push({
      currency, entityName, entityCode, address,
      bicSwiftCode, accountName, accountNumber, field72,
      importBatch, importedAt: new Date()
    });
  }

  if (documents.length > 0) {
    try {
      const result = await OurSSI.insertMany(documents, { ordered: false });
      console.log(`  ✅ Inserted ${result.length} Our SSI records`);
    } catch (err) {
      console.error(`  ⚠️ Insert error:`, err.message);
      if (err.insertedDocs) console.log(`  Partial insert: ${err.insertedDocs.length} records`);
    }
  }

  const uniqueEntities = [...new Set(documents.map(d => d.entityCode))];
  const uniqueCurrencies = [...new Set(documents.map(d => d.currency))];
  console.log(`  Entities: ${uniqueEntities.join(", ")}`);
  console.log(`  Currencies: ${uniqueCurrencies.sort().join(", ")}`);
  console.log(`  Skipped: ${skipped}`);
}

// ============================
// UPDATE SSI REFERENCE WITH NEW COLUMNS
// ============================
async function updateSSIWithNewColumns() {
  console.log("\n" + "=".repeat(60));
  console.log("  UPDATING SSI REFERENCE WITH NEW COLUMNS");
  console.log("=".repeat(60));
  console.log(`  Source: ${COUNTERPARTY_SSI_FILE}`);

  const fs = require("fs");
  if (!fs.existsSync(COUNTERPARTY_SSI_FILE)) {
    console.log("  ❌ Counterparty_SSI.xlsx not found — skipping SSI update.");
    return;
  }

  const workbook = XLSX.readFile(COUNTERPARTY_SSI_FILE);
  const sheetName = "Final Table";

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`  ❌ Sheet "${sheetName}" not found.`);
    return;
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`  Found ${rows.length} rows in "${sheetName}"`);

  // Check if SSI records already exist
  const existingCount = await SSIReference.countDocuments();
  console.log(`  Existing SSI records in DB: ${existingCount}`);

  if (existingCount === 0) {
    // No existing data — do a full import
    console.log("  No existing SSI data — performing FULL IMPORT...");
    await performFullSSIImport(rows);
  } else {
    // Existing data — update with new columns using bulk operations
    console.log("  Updating existing records with bankAddress, agentBankAddress, swift71A...");
    await updateExistingSSIRecords(rows);
  }
}

async function performFullSSIImport(rows) {
  const importBatch = `SWIFT_IMPORT_${Date.now()}`;
  let inserted = 0;
  let skipped = 0;
  const documents = [];

  function generateSsiId(row, index) {
    if (row["SSI ID"]) return String(row["SSI ID"]).trim();
    const groupName = String(row["Group Counter Party Name"] || "").trim();
    const groupAbbrev = groupName.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || "UNKN";
    const ccy = String(row["CCY"] || "").trim().toUpperCase();
    const rawKey = `${row["ID"] || ""}-${ccy}-${row["Account Number"] || ""}-${index}`;
    let hash = 0;
    for (let i = 0; i < rawKey.length; i++) {
      hash = ((hash << 5) - hash + rawKey.charCodeAt(i)) | 0;
    }
    return `SSI-${groupAbbrev}-${ccy}-${String(Math.abs(hash) % 10000).padStart(4, "0")}`;
  }

  function deriveSettlementType(row) {
    const agentBank = row["Agent Bank"];
    return (agentBank && String(agentBank).trim().length > 0) ? "CORRESPONDENT" : "DIRECT";
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row["ID"] || !row["Group Counter Party Name"] || !row["CCY"]) {
      skipped++;
      continue;
    }

    documents.push({
      sourceId: `${row["ID"] || ""}-${row["CCY"] || ""}-${row["Account Number"] || ""}-${i}`,
      ssiId: generateSsiId(row, i),
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
      bankAddress: row["Bank Address"] ? String(row["Bank Address"]).trim() : null,
      agentBankAddress: row["Agent Bank Address"] ? String(row["Agent Bank Address"]).trim() : null,
      swift71A: row["SWIFT 71A"] ? String(row["SWIFT 71A"]).trim() : null,
      settlementType: deriveSettlementType(row),
      active: true,
      importBatch,
      importedAt: new Date()
    });

    if (documents.length >= BATCH_SIZE) {
      try {
        const result = await SSIReference.insertMany(documents, { ordered: false });
        inserted += result.length;
      } catch (err) {
        if (err.insertedDocs) inserted += err.insertedDocs.length;
      }
      documents.length = 0;
      process.stdout.write(`  Progress: ${inserted + skipped}/${rows.length}\r`);
    }
  }

  if (documents.length > 0) {
    try {
      const result = await SSIReference.insertMany(documents, { ordered: false });
      inserted += result.length;
    } catch (err) {
      if (err.insertedDocs) inserted += err.insertedDocs.length;
    }
  }

  console.log(`\n  ✅ Full import: ${inserted} inserted, ${skipped} skipped`);
}

async function updateExistingSSIRecords(rows) {
  // Build a lookup map: sourceId -> { bankAddress, agentBankAddress, swift71A }
  let updated = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row["ID"] || !row["CCY"]) continue;

    const bankAddress = row["Bank Address"] ? String(row["Bank Address"]).trim() : null;
    const agentBankAddress = row["Agent Bank Address"] ? String(row["Agent Bank Address"]).trim() : null;
    const swift71A = row["SWIFT 71A"] ? String(row["SWIFT 71A"]).trim() : null;

    // Only update if at least one new field has a value
    if (!bankAddress && !agentBankAddress && !swift71A) continue;

    const updateFields = {};
    if (bankAddress) updateFields.bankAddress = bankAddress;
    if (agentBankAddress) updateFields.agentBankAddress = agentBankAddress;
    if (swift71A) updateFields.swift71A = swift71A;

    // Match by cptyId + currency + accountNumber for precise matching
    const accountNumber = row["Account Number"] != null ? String(row["Account Number"]).trim() : null;
    const filter = {
      cptyId: String(row["ID"]).trim(),
      currency: String(row["CCY"]).trim().toUpperCase()
    };
    if (accountNumber) filter.accountNumber = accountNumber;

    const result = await SSIReference.updateMany(filter, { $set: updateFields });
    if (result.modifiedCount > 0) {
      updated += result.modifiedCount;
    } else {
      notFound++;
    }

    if (i % 1000 === 0) {
      process.stdout.write(`  Progress: ${i}/${rows.length} (updated: ${updated})\r`);
    }
  }

  console.log(`\n  ✅ Updated ${updated} records. Not matched: ${notFound}`);
}

// ============================
// MAIN
// ============================
async function main() {
  console.log("\n🚀 SWIFT Data Import — Starting...\n");
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  await connectDB();

  const importBatch = `SWIFT_${Date.now()}`;

  // 1. Import Our SSI
  await importOurSSI(importBatch);

  // 2. Update SSI Reference with new columns
  await updateSSIWithNewColumns();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  SWIFT DATA IMPORT COMPLETE");
  console.log("=".repeat(60));
  const ourSSICount = await OurSSI.countDocuments();
  const ourSSIEntities = await OurSSI.distinct("entityCode");
  console.log(`  Our SSI: ${ourSSICount} records across ${ourSSIEntities.length} entities`);
  console.log(`  Entities: ${ourSSIEntities.join(", ")}`);

  const ssiCount = await SSIReference.countDocuments();
  const ssiWithBankAddr = await SSIReference.countDocuments({ bankAddress: { $ne: null } });
  const ssiWith71A = await SSIReference.countDocuments({ swift71A: { $ne: null } });
  console.log(`  SSI Records: ${ssiCount} total, ${ssiWithBankAddr} with bankAddress, ${ssiWith71A} with swift71A`);

  const swiftDist = await SSIReference.aggregate([
    { $group: { _id: "$defaultSwift", count: { $sum: 1 } } }
  ]);
  console.log(`  Default SWIFT: ${swiftDist.map(t => `${t._id || 'null'}: ${t.count}`).join(", ")}`);

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
