# Enterprise Cash Reconciliation Desk — Technical Design & Implementation Report

**System:** Investment Banking Operations Simulator (`ilabs_v6`)
**Feature:** Enterprise Cash Reconciliation Desk (independent subsystem)
**Status:** Implemented & verified (16/16 automated assertions pass against live MongoDB)
**Author:** Engineering
**Date:** 2026-07-22

---

## 1. Executive Summary

The Reconciliation Desk is an **independent reconciliation subsystem** bolted onto the existing simulator without altering any operational desk, the trade lifecycle, or backward compatibility. It consumes two *deliberately independent* data feeds and stores them side-by-side in a **single new collection** (`reconciliation_items`), differentiated only by a `source` discriminator (`LEDGER` / `STATEMENT`):

- **System 1 — Ledger:** every generated Trade Object produces exactly one `LEDGER` reconciliation item, populated *only* from trade data.
- **System 2 — Statement:** every generated SWIFT message produces exactly one `STATEMENT` reconciliation item, populated *only* from data physically present in the SWIFT message.

The two feeds never enrich each other. The engine performs **no auto-matching**; every item is born `Outstanding`. A learner enters the desk, receives an idempotent allocation of **20 settled trades → 40 mixed rows**, and manually selects one Ledger + one Statement row to match. A **hidden validation service** decides correctness and the UI is told only *success* or *"Items cannot be matched."* — never why.

A key architectural decision (per the brief's "10x" recommendation) is a dedicated **Reconciliation Repository** that isolates every service and the workstation from MongoDB, so future TLM-style features (partial matching, one-to-many, suspense items, auto-match rules) can be added without touching the UI or the business services.

The build was **corrective as well as additive**: the pre-existing partial implementation violated data independence (Statement items were enriched from the Trade Object) and had a latent SWIFT `fieldMap` key bug. Both are fixed.

---

## 2. Architecture Before

A partial reconciliation feature already existed on `Swift_Main`:

```
Trade Object ──▶ ledgerImporter ─────────────▶ ReconciliationItem (LEDGER)
                                                 │  (direct Mongo writes)
SWIFT Message ─▶ statementImporter ───────────▶ ReconciliationItem (STATEMENT)
                 ⚠ ENRICHED FROM Trade Object     ▲ auto-matched in batch
                                                   │
matchingEngine.runMatching() ── auto pairs ledger↔statement
Frontend: "Run Matching" button + read-only grid + detail panel
```

**Defects in the "before" state (all corrected):**
1. `statementImporter.js` copied trade fields (`tradeDate`, `underlyer`, `entity`, `product`, `itemRef1–6`, amount/currency fallbacks) into Statement items — a direct breach of data independence.
2. SWIFT field extractors read `fieldMap[":59:"]`/`fieldMap[":20:"]`, but the SWIFT engine stores tags **without colons** and as `{ value, description }` objects — so extractors silently fell back to trade data or `null`.
3. Matching was fully automatic; the spec requires **manual, user-driven** matching.
4. No allocation concept (20 trades → 40 rows); no lifecycle auto-generation for insufficient settled trades.
5. Services wrote to Mongo directly — no repository abstraction.

---

## 3. Architecture After

```
                 ┌─────────────────────────┐
Trade Created ──▶│ LedgerCreationService   │─┐   (trade-only data)
                 └─────────────────────────┘ │
                                              ▼
                              ┌──────────────────────────────┐
                              │  ReconciliationRepository      │  ← the ONLY
                              │  (reconciliation_items)        │    Mongo gateway
                              │  source: LEDGER | STATEMENT    │
                              └──────────────────────────────┘
                                              ▲
Settlement ▶ SWIFT ▶ ┌─────────────────────────┐ │   (SWIFT-only data)
                     │ StatementCreationService │─┘
                     └─────────────────────────┘

AllocationService ──▶ Repository ──▶ 20 trades × (1 Ledger + 1 Statement) = 40 rows
MatchingService  ──▶ ValidationService (HIDDEN) ──▶ Repository.applyMatch()
Workstation (UI) ──▶ POST /allocate, POST /manual-match   (never touches Mongo)
```

**Layering (clean architecture):**

| Layer | Modules |
|---|---|
| Presentation | `frontend/.../reconciliation-desk/page.js` |
| API | `reconciliationRoutes.js` |
| Domain services | `allocationService`, `matchingEngine`, `ledgerImporter`, `statementImporter`, `reconciliationService`, `reconciliationValidationService` |
| Data access | `reconciliationRepository` |
| Constants/Enums | `reconciliationConstants` |
| Persistence | `ReconciliationItem`, `ReconciliationConfig` (unchanged models) |

**Why the repository layer:** it is the single seam that decouples *what the desk asks for* from *how it is stored*. Every query pattern the UI or a service needs (filtered fetch, outstanding-by-source, reconcilable-trade discovery, match application, stats) lives behind stable method names. When TLM features arrive, only the repository changes.

---

## 4. Data Flow Diagram

```
TRADE FEED (System 1)                         SWIFT FEED (System 2)
─────────────────────                         ─────────────────────
queueComposer.saveGeneratedTrades()           SwiftEngine.generateSwiftMessages()
        │ fire-and-forget                              │ fire-and-forget (ONE per trade)
        ▼                                              ▼
ledgerImporter.importTradesAsLedgerItems()    statementImporter.createStatementItem()
        │ trade-only                                   │ SWIFT-only
        ▼                                              ▼
reconciliationRepository.createItem({source:LEDGER})  reconciliationRepository.createItem({source:STATEMENT})
        └───────────────┬──────────────────────────────┘
                        ▼
              reconciliation_items  (single collection)
                        │
        AllocationService.ensureAllocation(userId)
                        │  (idempotent; auto-generates shortfall)
                        ▼
             40 mixed rows ─▶ Workstation ─▶ user picks 1L + 1S
                        │
        MatchingService.manualMatch() ─▶ ValidationService (hidden)
                        ▼
        Repository.applyMatch()  → both rows Matched + shared MATCH id
```

**Hidden linkage key (critical design point):** once Statement items are stripped of trade fields, the only legitimate link between a Ledger row and its Statement row is the **transaction reference**, which is genuinely present on *both* sides from *independent* origins:
- Ledger carries it in `itemRef1` (trade-sourced: `trade.tradeRef`).
- Statement carries it in `ref5` (SWIFT-sourced: Field 20 / Field 21 of the message).

This single fact drives both allocation grouping and hidden match validation — without ever being displayed as a relationship.

---

## 5. Ledger Creation Flow

**Trigger:** `queueComposer` calls `ledgerImporter.importTradesAsLedgerItems(saved)` fire-and-forget after every trade save (unchanged call site). Also called directly (awaited) by `AllocationService` for auto-generated trades.

**Steps:**
1. Idempotency guard: `repo.ledgerExistsForTrade(tradeRef)` → skip if present.
2. `reconService.generateItemId()` → atomic `REC000001…`.
3. Populate **from Trade Object only**: economics (`amount`, `currency`, `tradeDate`, `valueDate`), `reconDesk = deriveReconDesk(foRegion)`, item refs (`itemRef1=tradeRef`, `itemRef2=underlyer`, `itemRef3=entity`, `itemRef4=country`, `itemRef5=product`, `itemRef6=productType`).
4. **SWIFT refs `ref1–ref8` forced `null`** — enforced and verified.
5. Status `Outstanding`, `matchId=null`. Persist via repository.

---

## 6. Statement Creation Flow

**Trigger:** `SwiftEngine.generateSwiftMessages()` now fires the reconciliation hook **once per trade** (previously once per message), choosing the primary message (MT103 if present, else the first successful message). This guarantees the "exactly one Statement item per settled trade" invariant even for MT103+MT202COV pairs.

**Steps (`statementImporter.createStatementItem`):**
1. Only `status === "GENERATED"` messages proceed.
2. Compute canonical `txnRef = Field21 || Field20`. (The MT202COV leg carries `COV<tradeRef>` in Field 20 but the plain `tradeRef` in Field 21; preferring Field 21 makes `ref5` equal the ledger's `tradeRef`.)
3. Idempotency: `repo.statementExistsForTrade(txnRef)` → skip.
4. Populate **from the SWIFT message only**:
   - `amount`, `currency`, `valueDate` ← top-level SWIFT fields.
   - `itemType` ← `deriveStatementItemType(paymentDirection)` (PAY→Debit, RECEIVE→Credit).
   - `reconDesk` ← `deriveReconDeskFromBIC(senderBIC|receiverBIC)` (BIC country code → region).
   - `ref1` Buyer BIC, `ref2` Seller Account (Field 59), `ref3` Buyer Account (Field 50K), `ref4` Seller BIC, `ref5` Field 20/21, `ref6` Field 56A, `ref7` Field 57A (BIC), `ref8` Field 52A/58A (BIC).
5. **`tradeDate` and `itemRef1–6` forced `null`** — no trade date exists inside a payment message; product/underlyer/entity/country are trade-only.
6. Robust SWIFT parsing: `tagValue()` handles both `{value}` objects and plain strings; `parseAccount()` reads `/`-prefixed lines; `parseBIC()` matches 8/11-char BIC lines. **This fixes the pre-existing colon-key bug.**

---

## 7. Allocation Flow

`AllocationService.ensureAllocation(userId)` — **idempotent, no extra collection**:

1. **Discover reconcilable trades:** a trade is reconcilable when it has *both* a LEDGER item (`itemRef1`) and a STATEMENT item (`ref5`). Computed by aggregating distinct ledger refs (newest-first) ∩ distinct statement refs.
2. **If ≥ 20 reconcilable → return existing** 40 rows (no generation). This *is* the "return existing allocation" behaviour, derived deterministically from the single collection rather than a separate allocation table.
3. **If < 20 → generate the shortfall** as fully settled trades (bounded to 5 rounds):
   - `tradeGenerator.generateTrades(shortfall, 0, "SETTLEMENT", "SETTLED")` — clean, forced `SETTLED`, real SSI/entity data (so SWIFT renders).
   - `saveGeneratedTrades()` → `ledgerImporter` (awaited) → `swift.generateSwiftMessages()` → poll for the fire-and-forget Statement item.
   - Trades are `currentStatus="SETTLED"`, `assignedTo=null` ⇒ **excluded from all operational queues** (queues filter on pending/break statuses only).
4. **Select 20**, gather their 40 rows, **Fisher–Yates shuffle** so Ledger/Statement rows appear mixed with no positional pairing.

`getAllocationStatus()` (GET `/allocation`) reports the same without ever generating.

---

## 8. Matching Flow

**User-driven only.** `MatchingService.manualMatch(itemIdA, itemIdB)` (order-independent):

1. Load both items via repository.
2. `ValidationService.validatePair()` → `{ valid, reason }`. The **reason is logged internally, never returned.**
3. If valid: `reconService.generateMatchId()` → `MATCH000001…`; `repo.applyMatch()` flips **both** rows to `Matched` with the shared id — guarded by `status: Outstanding` so a concurrent match cannot double-apply (returns `<2` modified → treated as failure).
4. Response: `{ success:true, matchId, ledgerItemId, statementItemId }` or `{ success:false, message:"Items cannot be matched." }`.

`unmatch(matchId)` is implemented (returns both rows to Outstanding) for future break workflows; not yet wired to the UI. Legacy `runMatching()` auto-batch is preserved for backward compatibility but removed from the UI.

---

## 9. Database Schema Changes

**No schema migrations.** `ReconciliationItem` already matched the required model (itemId, status, source, itemType, amount, tradeDate, valueDate, currency, reconDesk, matchId, itemRef1–6, ref1–8, timestamps) with indexes on `status+source`, `status+reconDesk`, `itemRef1`.

**Semantic change (data, not schema):** the *meaning* of Statement rows is now strictly SWIFT-sourced — `tradeDate` and `itemRef1–6` are `null` on Statement items. Ledger `ref1–8` remain `null`. No fields added or removed; existing documents remain valid. One new logical collection total: `reconciliation_items` (already present).

---

## 10. Backend Changes (per file)

| File | Action | Why | What | How | Impact |
|---|---|---|---|---|---|
| `reconciliationConstants.js` | **NEW** | Kill magic strings | Enums for source/status/itemType/desk, allocation targets, ID formats, SWIFT tags, region maps | `Object.freeze` maps consumed everywhere | Zero runtime risk; pure additive |
| `reconciliationRepository.js` | **NEW** | Decouple services/UI from Mongo | 20+ methods: `createItem`, `applyMatch`, `clearMatch`, filtered/outstanding/by-ref reads, existence guards, `getStats`, `getMatchPairs` | Thin persistence wrapper over the model | Central seam for future TLM features |
| `reconciliationValidationService.js` | **NEW** | Hide match logic from UI | `validatePair()` → structural + reference (`itemRef1===ref5`) + economic (amount/currency/valueDate) checks | Returns `{valid, reason}`; reason never surfaced | Rules evolve without UI leakage |
| `allocationService.js` | **NEW** | 20-trade / 40-row entry, idempotent, self-healing | `ensureAllocation`, `getAllocationStatus`, `getReconcilableTradeRefs` + settled-trade auto-gen | Reuses trade/SWIFT engines untouched; polls for async statement items; shuffles | Auto-gen trades stay out of operational queues |
| `statementImporter.js` | **MODIFY (critical)** | Fix data-independence breach + colon-key bug | Removed ALL trade enrichment; `tradeDate`/`itemRef1–6`→null; robust SWIFT parsers; per-trade dedupe on `txnRef`; repo-based writes | `tagValue/parseAccount/parseBIC` on real fieldMap format | Statement items now genuinely SWIFT-only |
| `ledgerImporter.js` | **MODIFY** | Repository + idempotency | Writes via repo; skips if ledger already exists; constants for enums | Same trade-only field mapping | Behaviour preserved, now idempotent |
| `reconciliationService.js` | **MODIFY** | Delegate data access; add SWIFT desk derivation | Queries delegate to repo; kept ID gen + derivations; added `deriveReconDeskFromBIC`, `deriveStatementItemType` | BIC country→region table | API-compatible facade |
| `matchingEngine.js` | **MODIFY** | Manual matching + hidden validation | Added `manualMatch`, `unmatch`; kept `runMatching`/`findMatch`/`compareField` | Uses validation service + repo | Legacy auto-match intact, UI-detached |
| `swift/SwiftEngine.js` | **MODIFY (1 hook)** | One Statement item per trade | Moved recon hook out of per-message loop; picks MT103/first success | Fire-and-forget preserved | No change to SWIFT generation logic |

---

## 11. Frontend Changes

**`frontend/src/app/reconciliation-desk/page.js`** (reworked, same visual language):
- **Entry:** on load, `POST /api/reconciliation/allocate` with a "Preparing Reconciliation Desk..." overlay; toasts training-data generation when it occurs.
- **Match tray:** replaces the "Run Matching" button. Shows selected Ledger/Statement chips, a **Match** button (enabled only with exactly one of each), and a Clear button.
- **Selection:** checkbox column; clicking a row toggles selection for its source; matched rows are locked; selected rows highlighted.
- **Matching:** `POST /api/reconciliation/manual-match`; on success both rows update locally to `Matched` with the shared `matchId`; on failure a neutral toast — **no reason shown**.
- **Display:** all 40 rows in one table, mixed, **no visual pairing / no relationship indicator**; full column set (Status, Item ID, Source, Item Type, Amount, Currency, Trade/Value Date, Recon Desk, Match ID, ItemRef1–6, Ref1–8).
- **Filtering** is client-side over the allocated set, so a filter never breaks the 40-row allocation.
- Removed the orphaned detail panel and its state; no dangling references (verified).

---

## 12. APIs Added / Modified

**Added** (all `authenticateToken`, under `/api/reconciliation`):
- `POST /allocate` → `{ items[40], tradeCount, rowCount, settledTradeCount, generated }` (idempotent; generates shortfall).
- `GET /allocation` → `{ allocated, tradeCount, rowCount, items }` (no generation).
- `POST /manual-match` body `{ ledgerItemId, statementItemId }` → `{ success, matchId?, message }` (business rejection returns HTTP 200 + `success:false`).

**Preserved unchanged:** `GET /items`, `GET /stats`, `GET /item/:itemId`, `POST /run-matching` (legacy), `GET /config`, `PUT /config/:id`, `GET /matches`. No other route file touched.

---

## 13. Services Added

`ReconciliationRepository`, `AllocationService`, `MatchingService` (manual mode within `matchingEngine`), `ValidationService`, plus refactored `LedgerCreationService` and `StatementCreationService`. Constants/enums centralized. Repository pattern applied; SOLID boundaries: creation ≠ validation ≠ matching ≠ allocation ≠ persistence.

---

## 14. Validation Rules (hidden, in `ValidationService`)

A `(Ledger, Statement)` pair matches iff **all** hold:
1. Both items exist and are distinct.
2. Exactly one `LEDGER` + one `STATEMENT` (order-independent).
3. Both `Outstanding`.
4. **Reference:** `ledger.itemRef1 === statement.ref5` (trade-sourced ref == SWIFT-sourced ref), both non-empty.
5. **Amount:** equal within `0.01` tolerance.
6. **Currency:** case-insensitive equal.
7. **Value Date:** equal to the day.

Failure returns an internal reason code (`REFERENCE_MISMATCH`, `AMOUNT_MISMATCH`, …) that is logged but **never** sent to the client.

---

## 15. Testing Performed

`scripts/verifyReconciliation.js` (runnable: `node scripts/verifyReconciliation.js`) exercises the real engines with **100 settled trades** and asserts, all **PASS (16/16)** against live MongoDB:

- Every trade has exactly ONE Ledger item.
- No settled trade has more than ONE Statement item; statements created (100).
- Statement items never contain trade-only fields (`tradeDate`, `itemRef1–6` NULL).
- Ledger items never contain SWIFT-only fields (`ref1–8` NULL).
- No duplicate `itemId`; no `matchId` shared by >2 rows.
- Allocation = 20 trades = 40 rows = 20 Ledger + 20 Statement, mixed (not grouped).
- Valid manual match succeeds; both rows flip to `Matched` with the same `matchId`.
- Invalid pair (two Ledgers) and mismatched pair rejected with a **neutral** message that leaks no reason.
- All test artefacts cleaned up (200 recon items, 100 trades, 150 SWIFT messages removed).

The MT103+MT202COV pair case is covered — the run showed pairs collapsing to a single statement item via the Field21 canonical ref.

---

## 16. Backward Compatibility Verification

- **Untouched:** trade generation logic, MO/Confirmation/Settlement desks, Approval Bot, AI Counterparty, Dashboard, email/session/auth engines, all models, `server.js` (routes already registered).
- **SWIFT engine:** only the reconciliation glue hook moved (still fire-and-forget, wrapped in try/catch); generation output identical.
- **`queueComposer` call sites:** unchanged signature; `importTradesAsLedgerItems` still fire-and-forget.
- **Legacy endpoints & `runMatching()`** preserved.
- All backend modules load cleanly (`node -e require(...)` smoke test passed); frontend lints with only the two pre-existing `set-state-in-effect` patterns already used across the codebase.

---

## 17. Performance Considerations

- Reads use existing indexes (`status+source`, `status+reconDesk`, `itemRef1`); allocation discovery uses aggregation on indexed fields.
- Ledger/Statement creation stays **fire-and-forget** — never blocks the trade or SWIFT lifecycle.
- `applyMatch` is a single guarded `updateMany` over two `_id`s (atomic, index-hit).
- Auto-generation is bounded (≤5 rounds) with a capped statement-item poll (4 s, 200 ms interval) so a persistent SWIFT validation failure can never spin.
- Allocation is O(rows) with a shuffle over 40 items — negligible.

---

## 18. Future Scalability

The repository seam enables, without UI or service-contract changes: partial/percentage matching, one-to-many (1 ledger ↔ N statements) and many-to-one, duplicate-statement detection, suspense/unmatched-ageing items, multiple reconciliation profiles (cash/securities/nostro/FX via `ReconciliationConfig`), configurable auto-match rule engines, and TLM-style workflow states. Adding a new query is a repository method; adding a new rule is a `ValidationService` branch.

---

## 19. Potential Future Enhancements

- Persist explicit allocation snapshots per user/session for audit and re-entry determinism.
- Match audit trail (who matched what, when) via the existing `auditEngine`.
- Unmatch/break UI wired to the implemented `unmatch(matchId)`.
- Ageing & SLA dashboards for outstanding items.
- Confidence-scored suggested matches (advisory only) layered above manual matching.
- Bulk auto-match rules gated behind the config profile threshold.

---

### Appendix — Files

**New:** `src/engine/reconciliationConstants.js`, `src/engine/reconciliationRepository.js`, `src/engine/reconciliationValidationService.js`, `src/engine/allocationService.js`, `scripts/verifyReconciliation.js`
**Modified:** `src/engine/statementImporter.js`, `src/engine/ledgerImporter.js`, `src/engine/reconciliationService.js`, `src/engine/matchingEngine.js`, `src/engine/swift/SwiftEngine.js` (1 hook), `src/routes/reconciliationRoutes.js`, `frontend/src/app/reconciliation-desk/page.js`
**Unchanged (guaranteed):** all models, trade/queue/settlement/SWIFT-generation logic, other desks, bots, dashboard, auth/session/email, `server.js`.
