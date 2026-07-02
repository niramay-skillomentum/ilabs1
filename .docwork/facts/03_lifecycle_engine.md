# GROUND TRUTH — Trade Lifecycle & Simulation Engine (src/engine/*)

## Lifecycle state machine (transitions.js:1-50)
Allowed transitions (from → [to]):
- NEW → MO_PENDING
- MO_PENDING → MO_BREAK_OPEN, CONFIRMATION_PENDING
- MO_BREAK_OPEN → MO_PENDING, PENDING_FO_RESPONSE
- PENDING_FO_RESPONSE → MO_BREAK_OPEN, MO_PENDING
- CONFIRMATION_PENDING → SETTLEMENT_PENDING, CONFIRMATION_BREAK, LIASING_WITH_CPTY, LIASING_WITH_FO
- CONFIRMATION_BREAK → LIASING_WITH_CPTY, LIASING_WITH_FO, CONFIRMATION_PENDING
- LIASING_WITH_FO → CONFIRMATION_BREAK, CONFIRMATION_PENDING, LIASING_WITH_CPTY
- LIASING_WITH_CPTY → CONFIRMATION_PENDING, CONFIRMATION_BREAK, SETTLEMENT_PENDING, SETTLEMENT_BREAK, LIASING_WITH_FO, SETTLED
- SETTLEMENT_PENDING → READY_FOR_APPROVAL, SETTLED, SETTLEMENT_BREAK, LIASING_WITH_CPTY
- READY_FOR_APPROVAL → SETTLED, SETTLEMENT_BREAK
- SETTLEMENT_BREAK → SETTLED, LIASING_WITH_CPTY, SETTLEMENT_PENDING
- SETTLED → RECON_PENDING
- RECON_PENDING → RECON_CLEARED, UNMATCHED_BY_USER
- UNMATCHED_BY_USER → RECON_PENDING
- RECON_CLEARED → CLOSED
- CLOSED → (terminal)

`lifecycle.js` (LifecycleEngine.transition) validates transitions against this map; throws on illegal transition.

Phases: **MO desk** (MO_PENDING/MO_BREAK_OPEN/PENDING_FO_RESPONSE) → **Confirmation desk** (CONFIRMATION_PENDING/CONFIRMATION_BREAK/LIASING_WITH_CPTY/LIASING_WITH_FO) → **Settlement desk** (SETTLEMENT_PENDING/READY_FOR_APPROVAL/SETTLEMENT_BREAK/SETTLED) → **Reconciliation/TLM** (RECON_PENDING/RECON_CLEARED/UNMATCHED_BY_USER/CLOSED).

## Trade generation (tradeGenerator.js, 809 lines)
- Unique tradeRef = timestamp + random (`TRD_...`).
- tradeDate today or -1d (MO age ≤1; CONFIRMATION up to 2 days). valueDate = tradeDate + 2 (T+2).
- Random currency (6), product (9), direction BUY/SELL, entity (5 GS entities), region AMER/EMEA/APAC. tradeType (OTC/Exchange/Depository) & settlementType (ELECTRONIC/BILATERAL) derived from product.
- **Scenario distribution 40/30/30** (tradeGenerator.js:446-463): 40% CLEAN (all truths align); 30% FO Error (truths.mo deviates from universal in amount/valueDate/currency + counterparty mismatch; truths.confirmation matches universal); 30% CPTY Error (truths.mo matches universal; truths.confirmation deviates in amount/valueDate/currency).
- ~30% of MO-clean trades get a hidden `confirmationScenario.disputeType` (break invisible at MO, surfaces at Confirmation).
- booking = copy of truths.mo; if isMoBreak, inject one mismatch (amount ±10-50k / valueDate ±1d / currency / counterparty).
- settlementDetails from SSI tables (BUY→CPTY_SSIS, SELL→ENTITY_SSIS); if hasSettlementBreak, corrupt one field.
- MO break types: AMOUNT, VALUE_DATE, CURRENCY, COUNTERPARTY. Confirmation break types: AMOUNT, VALUE_DATE, CURRENCY (no counterparty).
- Generates XML audit trail per trade (auditXml) with events: TRADE_CAPTURED, COMPLIANCE_VALIDATED, RISK_ASSESSED, BOOKING_RECORDED/VALIDATED, ROUTED_TO_MO, BREAK_IDENTIFIED.
- `generateTrades(cleanCount, breakCount, desk, settlementInitialState)` + `saveGeneratedTrades()` (inserts, AuditLog, and for CONFIRMATION creates up to 3 mock CPTY confirmation emails via conversationEngine.createMessage).
- SSI tables `CPTY_SSIS` and `ENTITY_SSIS` are exported from tradeGenerator.js (used by ssiRoutes and cptySettlementAI).

## Simulated clock (clock.js)
- Starts today 09:00 local. Real 1s tick advances sim 3s (compresses 09:00→18:00 into ~3h real time). Broadcasts `clock_tick` with formatted time + minutes to 18:00. Stops at 18:00.
- getTime(), getFormattedTime().

## Cutoff (cutoff.js)
- Hard-coded per-currency cutoff times (USD 18:00, EUR 16:00, GBP 16:00, JPY 14:00, CHF 16:00, AUD 14:30, ...).
- isCutOffBreached(currency): sim time (UTC HH:MM) vs cutoff.
- settlement.js shifts valueDate +1 business day if cutoff breached on value date.

## Age (ageCalculator.js) & daily scheduler (dailyScheduler.js)
- MO age = calendar-day diff from tradeDate (today=0). Confirmation age = diff from tradeDate+1 (grace for T+0/T+1). calendarDayDiff strips time.
- runDailyCycle() recalculates all trades' age per desk rules, updates DB when changed.

## Agenda jobs (agendaJobs.js)
- Agenda on Mongo collection `agendaJobs`. Two repeating jobs every 1 min: `session-cleanup` (queueComposer.cleanupExpiredSessions) and `daily-age-update` (dailyScheduler.runDailyCycle).

## Break engines
- **confirmationBreakEngine.js**: detectConfirmationBreaks(trade) → truthEngine.getConfirmationMismatches() → [{field, tradeValue, cptyExpected}] over amount/valueDate/currency. hasConfirmationBreak(). describeConfirmationBreaks() human text.
- **settlementBreakEngine.js**: break when trade.cptyStatus === "DISCREPANCY". investigateBreak() requires DISCREPANCY. resolveBreak(trade, selectedCause) compares vs trade.actualDiscrepancyReason; correct→transition to SETTLED.
- **reconBreakEngine.js** (190 lines): investigateBreak() → reconciliation.getUnmatched(). manualMatch (matchedBy USER), forceMatch (USER_FORCE), markUnmatched, closeBreak (only if all matched).

## Settlement (settlement.js, settlementInteraction.js)
- approveSettlement(trade,userId): cutoff check → maybe shift valueDate → LifecycleEngine.transition to SETTLED→RECON_PENDING; sets settlementApprovedAt/By, actualSettlementDate.
- settlementInteraction: response types MATCHED/DISCREPANCY/NO_RESPONSE. Discrepancy causes weighted: AMOUNT_MISMATCH 35%, SSI_MISMATCH 25%, REFERENCE_MISMATCH 15%, OTHER 25%. Reply delay scales with time-to-cutoff. refreshStatus updates cptyStatus. sendEmail/sendChaser counters. excludeTrade().

## Reconciliation (reconciliation.js)
- Scenarios weighted: PERFECT_MATCH 40%, REFERENCE_MISMATCH 20%, AMOUNT_MISMATCH 15%, MISSING_STATEMENT 10%, DUPLICATE_LEDGER 10%, TIMING_DIFFERENCE 5%.
- Ledger entry per settled trade; statement only for SETTLED trades (null if MISSING_STATEMENT). Applies discrepancy per scenario. Auto-match on amount+currency+reference (matchedBy AUTO). getUnmatched() splits ledger/statement.

## Amendments (amendmentEngine.js)
- Auto-extract from AI message text: amount (5+ digits), valueDate (YYYY-MM-DD), currency (USD/EUR/GBP/JPY/CHF/AUD); only if differs from current; source AI, status PENDING.
- createAmendment(trade, field, value, desk, source): sequential amendmentNumber; compares trade.booking[field]. createAmendmentFromInput() legacy (vs truths.mo).
- applyAmendment: updates booking[field] + top-level trade[field]; records history status ACCEPTED, appliedAt, appliedBy. applyAllAccepted() applies all ACCEPTED pending then clears.

## Truth engine (truthEngine.js) & scenario engine (scenarioEngine.js)
- "Truth" = correct answer the sim validates against. Each trade carries truths.universal/mo/confirmation/settlement.
- getMismatchFields(trade, desk="mo"): compares truths[desk] vs booking → mismatched field list (MO checks counterparty too; CONFIRMATION does not).
- getConfirmationMismatches(trade): trade current top-level fields (post-MO amendments) vs truths.confirmation over amount/valueDate/currency.
- getSettlementMismatches(trade): trade.settlementDetails vs truths.settlement over 9 fields.
- scenarioEngine: break types REFERENCE_MISMATCH, AMOUNT_MISMATCH, SSI_MISMATCH, PAYMENT_NOT_RECEIVED, VALUE_DATE_MISMATCH, TIMING_DIFFERENCE. Difficulty: BEGINNER 10-12 clean/8-10 break; ADVANCED 7-9 clean/11-13 break (total 20).
