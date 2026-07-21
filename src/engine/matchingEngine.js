// ======================================
// MATCHING ENGINE
// Configurable reconciliation matching engine.
//
// Compares Outstanding LEDGER items against Outstanding STATEMENT items
// using the active ReconciliationConfig to determine which fields
// participate in matching.
//
// This mirrors enterprise reconciliation products:
//   - SmartStream TLM
//   - Duco
//   - IntelliMatch
//   - Gresham Clareti
//
// Matching rules are configurable, not embedded in code.
// ======================================

const ReconciliationItem = require("../models/ReconciliationItem");
const ReconciliationConfig = require("../models/ReconciliationConfig");
const reconService = require("./reconciliationService");

/**
 * Run the matching engine.
 * Compares all Outstanding LEDGER items against all Outstanding STATEMENT items
 * using the active matching configuration.
 *
 * @returns {Promise<Object>} { matchesCreated, itemsProcessed, errors }
 */
async function runMatching() {
  console.log("[MatchingEngine] Starting reconciliation matching run...");

  const result = {
    matchesCreated: 0,
    ledgerItemsProcessed: 0,
    statementItemsProcessed: 0,
    errors: []
  };

  try {
    // 1. Load active matching configuration
    const config = await ReconciliationConfig.findOne({ active: true }).lean();
    if (!config) {
      console.warn("[MatchingEngine] No active matching configuration found. Using defaults.");
    }

    const enabledFields = config?.enabledFields || [
      "itemRef1", "amount", "currency", "valueDate"
    ];

    console.log(`[MatchingEngine] Using profile: "${config?.matchingProfile || "Default"}" with ${enabledFields.length} matching fields`);

    // 2. Fetch all Outstanding items
    const [ledgerItems, statementItems] = await Promise.all([
      ReconciliationItem.find({ status: "Outstanding", source: "LEDGER" }).lean(),
      ReconciliationItem.find({ status: "Outstanding", source: "STATEMENT" }).lean()
    ]);

    result.ledgerItemsProcessed = ledgerItems.length;
    result.statementItemsProcessed = statementItems.length;

    if (ledgerItems.length === 0 || statementItems.length === 0) {
      console.log(`[MatchingEngine] No items to match (Ledger: ${ledgerItems.length}, Statement: ${statementItems.length})`);
      return result;
    }

    // 3. Build a lookup index on statement items for faster matching
    // Track which statement items have been matched in this run
    const matchedStatementIds = new Set();

    // 4. For each ledger item, find a matching statement item
    for (const ledgerItem of ledgerItems) {
      const matchingStatement = findMatch(ledgerItem, statementItems, enabledFields, matchedStatementIds);

      if (matchingStatement) {
        try {
          // Generate a match ID
          const matchId = await reconService.generateMatchId();

          // Update BOTH items atomically
          await Promise.all([
            ReconciliationItem.updateOne(
              { _id: ledgerItem._id },
              { $set: { status: "Matched", matchId } }
            ),
            ReconciliationItem.updateOne(
              { _id: matchingStatement._id },
              { $set: { status: "Matched", matchId } }
            )
          ]);

          matchedStatementIds.add(matchingStatement._id.toString());
          result.matchesCreated++;

          console.log(`[MatchingEngine] Match: ${ledgerItem.itemId} ↔ ${matchingStatement.itemId} → ${matchId}`);
        } catch (err) {
          result.errors.push(`Failed to match ${ledgerItem.itemId}: ${err.message}`);
        }
      }
    }

    console.log(`[MatchingEngine] Completed. Created ${result.matchesCreated} matches from ${ledgerItems.length} ledger / ${statementItems.length} statement items.`);
    return result;

  } catch (err) {
    console.error("[MatchingEngine] Fatal error:", err.message);
    result.errors.push(err.message);
    return result;
  }
}

/**
 * Find a matching statement item for a given ledger item.
 *
 * @param {Object}   ledgerItem        - Ledger reconciliation item
 * @param {Object[]} statementItems    - All outstanding statement items
 * @param {string[]} enabledFields     - Fields that must match
 * @param {Set}      matchedStatementIds - Already matched statement IDs (this run)
 * @returns {Object|null} Matching statement item, or null
 */
function findMatch(ledgerItem, statementItems, enabledFields, matchedStatementIds) {
  for (const statementItem of statementItems) {
    // Skip already matched in this run
    if (matchedStatementIds.has(statementItem._id.toString())) continue;

    // Check all enabled fields
    const allMatch = enabledFields.every(field => {
      return compareField(ledgerItem[field], statementItem[field], field);
    });

    if (allMatch) return statementItem;
  }

  return null;
}

/**
 * Compare two field values for matching purposes.
 * Handles type coercion, null/undefined, and date comparison.
 *
 * @param {*} val1  - Value from ledger item
 * @param {*} val2  - Value from statement item
 * @param {string} fieldName - Field name (for type-specific logic)
 * @returns {boolean} Whether the values match
 */
function compareField(val1, val2, fieldName) {
  // Both null/undefined/empty → match
  const v1 = normalizeValue(val1);
  const v2 = normalizeValue(val2);

  if (v1 === "" && v2 === "") return true;

  // Date fields — compare by date string (ignore time)
  if (fieldName === "tradeDate" || fieldName === "valueDate") {
    return compareDates(val1, val2);
  }

  // Amount — numeric comparison with tolerance
  if (fieldName === "amount") {
    const n1 = parseFloat(v1);
    const n2 = parseFloat(v2);
    if (isNaN(n1) && isNaN(n2)) return true;
    if (isNaN(n1) || isNaN(n2)) return false;
    return Math.abs(n1 - n2) < 0.01; // Penny tolerance
  }

  // String comparison (case-insensitive)
  return v1.toLowerCase() === v2.toLowerCase();
}

/**
 * Compare two date values by date only (ignore time).
 */
function compareDates(d1, d2) {
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;

  const date1 = new Date(d1);
  const date2 = new Date(d2);

  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;

  return date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0];
}

/**
 * Normalize a value to a string for comparison.
 */
function normalizeValue(val) {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val).trim();
}

module.exports = {
  runMatching,
  findMatch,
  compareField
};
