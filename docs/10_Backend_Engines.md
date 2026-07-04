# 10 · Backend Engines & Flow

[← 09 API Reference](09_API_Reference.md) | [INDEX](INDEX.md) | Next: [11 Database Schema →](11_Database_Schema.md)

---

The `src/engine/` directory holds the domain logic. This document describes each of the 37 modules: purpose, exports, key behavior, DB touched. Grouped by subsystem. See [14](14_Execution_Call_And_Dependency_Graphs.md) for call graphs.

## 10.1 Lifecycle & state machine

### `transitions.js`
Exports `TRANSITIONS` — an adjacency map `fromStatus → [allowedTo...]`. The authoritative state machine. Full graph in [06 §6.0](06_User_Flows.md) / [17](17_Flowcharts.md). Note `READY_FOR_APPROVAL` appears in queueComposer's pool filter but not here (orphan).

### `lifecycle.js` — `class LifecycleEngine` (static)
- `getAllowedTransitions(status)` → array.
- `canTransition(from,to)` → bool.
- `transition(trade, toStatus)` → **new object** `{...trade, currentStatus:toStatus}` or throws `InvalidTransitionError`. **Pure — does not persist**; caller must `save()`.

### `errors.js`
`InvalidTransitionError(from,to)` — the only custom error class; message `"Invalid lifecycle transition from <from> to <to>"`. Other engines throw plain `Error`.

## 10.2 Trade generation

### `tradeGenerator.js` (839 lines) — the trade factory
Reference constants: `CURRENCIES`, `COUNTERPARTIES` (CITI/HSBC/DB/JPM/BNP/BARC/MS/UBS), `ENTITIES` (GS London/NY/Singapore/Tokyo/Frankfurt), `PRODUCTS`, `TRADE_TYPES`, `SETTLEMENT_TYPES` (ELECTRONIC/BILATERAL), `CPTY_SSIS`/`ENTITY_SSIS` (SSI dicts, enriched with alert/acronym codes), `MO_BREAK_TYPES` (AMOUNT/VALUE_DATE/CURRENCY/COUNTERPARTY), `CONFIRMATION_BREAK_TYPES` (AMOUNT/VALUE_DATE/CURRENCY), `CONFIRMATION_BREAK_RATIO=0.3`.

Key exports:
- `generateSingleTrade(desk, isMoBreak, forcedStatus, hasConfirmationBreak, settlementInitialState, hasSettlementBreak)` → unsaved trade. Sets dates (T+2 value date), random economics, the four `truths.*`, `booking` (with injected MO break), `settlementDetails` (with injected settlement break), status per desk.
- `generateTrades(cleanCount, breakCount, desk, settlementInitialState)` → array with `auditXml` attached; ~30% of MO clean trades get a hidden confirmation break; break trades split ~50/50 MO_PENDING/MO_BREAK_OPEN.
- `saveGeneratedTrades(trades)` → `Trade.insertMany` + `AuditLog.insertMany` (action `SYSTEM_GENERATED`, xmlContent); seeds up to 3 proactive CPTY confirmation emails via `conversationEngine.createMessage`.
- `generateXmlAudit(trade)` → state-aware `<AuditTrail>` XML story (TRADE_CAPTURED → COMPLIANCE_VALIDATED → RISK_ASSESSED → BOOKING_* → ROUTED_TO_MO [→ BREAK_IDENTIFIED]).
- `generateRealisticAmount(currency)`.

### `scenarioEngine.js` (legacy, in-memory)
`generateScenario(difficulty)` → 20 lightweight scenario objects with `status:"CLEAN"|"BREAK"`, breakTypes `REFERENCE_MISMATCH/AMOUNT_MISMATCH/SSI_MISMATCH/PAYMENT_NOT_RECEIVED/VALUE_DATE_MISMATCH/TIMING_DIFFERENCE`. **Not wired into the DB path** — parallel/older code.

### `queue.js` — `class DeskQueue` (legacy in-memory)
FIFO `mainQueue` + `breakQueue`; `addTrade/moveToBreak/getNextTrade/viewQueue`. **Not used by queueComposer** (production path is DB-backed).

## 10.3 Queue & session — `queueComposer.js` (singleton)
Builds the 20-trade queue (12 clean + 8 break) with graduated DB-vs-generated allocation; manages 3-hour sessions.
- Config: `TOTAL_TRADES=20`, `CLEAN_TARGET=12`, `BREAK_TARGET=8`, `FULL_POOL_SIZE=1000`, `MIN_DB_POOL=50`, `SESSION_DURATION_MS=3h`.
- `buildQueue(desk,userId)` — guards existing session, counts pool, `calculateDbAllocation` (exponential decay), pulls DB trades (age-filtered `<=1`), generates remainder, assembles/trims to 20, assigns `assignedTo=userId`, upserts `Queue`.
- `getActiveQueue(userId)` (auto-expires past 3h), `expireSession` (unassigns), `endSession` (does NOT unassign), `cleanupExpiredSessions` (Agenda), `touchSession`, `isBreakTrade`.

## 10.4 Clock & scheduling

### `clock.js` — `SimulationClock` (singleton)
Compresses 09:00→18:00 into ~3 real hours. Ticks every 1s (`realTickMs`), advancing 3 sim-seconds (`simulatedMsPerTick`). Emits `clock_tick {simTime, timeLeftMinutes}`. Auto-stops at 18:00. `start/stop/reset/getTime/getFormattedTime/getOperationalTimeET`. Starts only on queue generation.

### `cutoff.js` — currency cut-offs
`CURRENCY_CUTOFF` table (USD 18:00, EUR/GBP/CHF/SEK/NOK 16:00, JPY 14:00, CAD 15:30, AUD 14:30, NZD 13:30). `getCutoffMinutes`, `isCutOffBreached(currency)` (compares sim time vs cutoff). ⚠️ Timezone inconsistency: reads UTC hours from a local-formatted string.

### `ageCalculator.js`
Desk-specific calendar-day aging: MO = days since tradeDate; CONFIRMATION = days since tradeDate+1 (T+1 grace); default = MO-style. `calculateAge(tradeDate, now, desk)`.

### `dailyScheduler.js` — `DailyScheduler` (singleton)
`runDailyCycle()` — re-ages all trades (`Trade.age`) via `ageCalculator`. Invoked by Agenda `daily-age-update` (⚠️ every minute).

### `agendaJobs.js`
`startAgenda()` — MongoDB-backed Agenda (`agendaJobs` collection). Defines & schedules two jobs **every 1 minute**: `session-cleanup` (→ `cleanupExpiredSessions`) and `daily-age-update` (→ `runDailyCycle`). `SIGTERM/SIGINT` → `agenda.stop()` + exit.

## 10.5 Communication (email)

### `communicationEngine.js` — CPTY/FO reply orchestrator
Schedules delayed replies into `PendingReply`; processors drain them, call AI, mutate trade, persist via `conversationEngine`, emit `new_email`. Latches `isProcessingCPTY`/`isProcessingFO` prevent overlap.
- `scheduleReply(tradeRef, subject, body, desk)` → `PendingReply{CPTY_EMAIL, sendAt:+4..12s}`.
- `processReplies(convEngine, getTradeByRef, saveTrade)` — random ready CPTY reply → `aiParser.parseEmail` → `cptyAI`/`cptySettlementAI` → handle `HOLDING_MESSAGE` (two-part) / amendments / `CPTY_ADMITS_MISTAKE` (copies universal truth into confirmation) → `createMessage(sender=COUNTERPARTY)` → emit.
- `scheduleFOReply` (delay from `foResponseProfiles`), `processFOReplies` — `foAI.generateFOResponse` → category-based status transitions + amendment attach → `createMessage(sender=FO)`.

### `conversationEngine.js` — email thread store (`Conversation`)
- `createMessage(tradeRef, sender, body, subject, desk, skipEmit)` — **sanitizes body with `sanitize-html`** (KI-017 XSS fix) → upsert `Conversation` (push message, `$addToSet desks`) → refresh in-memory `cache` → emit `new_email` unless `skipEmit`.
- `getConversation`, `getAllConversations`, `resolveConversation` (status→RESOLVED).

### `foInternalChannel.js` — FO escalation channel (`FOCommunication`)
- `openChannel/sendMessage/getChannel/closeChannel`, `scheduleFOInternalReply` (`PendingReply{FO_INTERNAL, +3..8s}`).
- `processFOInternalReplies(saveTrade)` — round-based truth (`fo`/`universal`); FO position `FO_SUPPORTS_US`/`FO_ADMITS_MISTAKE`; if admits mistake, auto-creates & applies amendments and transitions `→ CONFIRMATION_PENDING`. `sendMessage(sender=FO_DESK)`.

### `aiParser.js` — deterministic intent parser
`parseEmail(body)` → `{ intent, reference, currency, amounts[], dates[], rawText }`. Intent ladder: `DISCREPANCY_QUERY / VALUE_DATE_QUERY / PAYMENT_STATUS_QUERY / SSI_QUERY / REFERENCE_QUERY / CONFIRMATION_REQUEST / GENERAL_QUERY`.

## 10.6 AI personas (CPTY / FO)

| File | Persona | Provider | Fallback |
|---|---|---|---|
| `cptyAI.js` | Counterparty (Confirmation/MO) | Gemini (`llmService`) | `offlineResponseEngine.generateCPTYResponseOffline` |
| `cptySettlementAI.js` | Counterparty (Settlement — opaque, gives only Alert/Acronym codes) | Gemini | inline hard-coded body |
| `foAI.js` | Front Office | Gemini | `offlineResponseEngine.generateFOResponseOffline` |

- All build a system prompt from `truthEngine` mismatches + round count, request strict JSON, and fall back to deterministic templates on failure.
- `foAI` returns a `category` that `processFOReplies` switches on (clean vs break categories).

### `offlineResponseEngine.js` — deterministic fallback "brain"
Multi-layer classifier (`classifyQuery`), `analyzeTradeContext` (mismatch detection), template selection with per-trade anti-repeat memory, signature injection. Exports `generateFOResponseOffline`, `generateCPTYResponseOffline`, `classifyQuery`, `analyzeTradeContext`.

### `cptyOfflineResponses.js` / `foOfflineResponses.js`
Static template banks (category → tone/personality → strings with `{{placeholders}}`). FO adds a `BUREAUCRATIC` personality.

### `foResponseProfiles.js`
Per-counterparty speed/personality: CITI/JPM FAST, HSBC/BNP MEDIUM, DB SLOW (45–90s). `getProfile`, `getDelay`.

## 10.7 AI tutor & LLM service

### `tutorAI.js` — Socratic coach (online-only)
`generateTutorResponse(message, desk, tradeContext, history)` — requires `OPENROUTER_API_KEY`, injects `docs/skb/*.md`, `fetch` OpenRouter `nvidia/nemotron-3-ultra-550b-a55b:free` (temp 0.5, max 2000). **Never gives the direct answer.** Throws on failure (no offline fallback).

### `llmService.js` (engine copy — used by personas)
`generateResponse(systemInstruction, prompt)` → Gemini `gemini-2.5-flash`, JSON mode, temp 0.7. 4s client throttle (`MIN_DELAY_MS`), 3-retry exponential backoff on 429/503/quota. Returns parsed JSON or `null` (→ persona falls back offline).
> A near-duplicate exists at root `llmService.js` (5 retries, smarter backoff) — **not imported by engines**. See [18](18_Unused_And_Dead_Code.md).

## 10.8 Settlement subsystem

### `systemWorkflowEngine.js` — System Verification Bot
Automated amend/verify workflow via `SystemJob` + `SystemMail`. `scheduleAmendment` / `scheduleVerification` (8s delay), `validateTrade` (rulebook: economics present, counterparty match, `MANDATORY_FIELDS`, `SSI_FIELDS` match truth), `processAmendment` (auto-corrects SSI to truth, source `SYSTEM`), `processVerification` (pass→SETTLED, fail→SETTLEMENT_PENDING + verificationErrors), `processJobs()` (poller, at-most-once via `findByIdAndDelete`). Audit actions: `SETTLEMENT_AMENDMENT_REQUESTED/AMENDED/SENT_FOR_APPROVAL/VERIFICATION_PASSED/VERIFICATION_FAILED/UNASSIGNED`. Emits `trade_update`, `new_system_mail`.

### `settlement.js` — `approveSettlement(prisma, trade, userId)`
Cut-off + value-date logic; rolls value date +1 day if cut-off breached; transitions `SETTLED → RECON_PENDING`. ⚠️ **Uses Prisma** (`prisma.trade.update`) — a persistence-layer remnant inconsistent with the Mongoose codebase; appears **unused** by any live route.

### `settlementBreakEngine.js`
`investigateBreak(trade)` (requires `cptyStatus==="DISCREPANCY"`), `resolveBreak(trade, selectedCause)` — grades `selectedCause` vs `actualDiscrepancyReason`; transitions `→ SETTLED`.

### `settlementInteraction.js` — CPTY settlement response sim
`RESPONSE_TYPES` (MATCHED/DISCREPANCY/NO_RESPONSE), `DISCREPANCY_DISTRIBUTION` (AMOUNT_MISMATCH/SSI_MISMATCH/REFERENCE_MISMATCH/OTHER). `refreshStatus`, `sendEmail`, `sendChaser`, `excludeTrade`. Delay scales with minutes-to-cutoff.

## 10.9 Reconciliation subsystem (engine-only, not routed)

### `reconciliation.js`
In-memory `ledger[]/statements[]/matches[]`. Weighted scenarios (`PERFECT_MATCH 40 / REFERENCE_MISMATCH 20 / AMOUNT_MISMATCH 15 / MISSING_STATEMENT 10 / DUPLICATE_LEDGER 10 / TIMING_DIFFERENCE 5`). `generateLedgerEntry`, `generateStatement` (only for SETTLED), `attemptAutoMatch`, `getUnmatched`.

### `reconBreakEngine.js`
`investigateBreak`, `manualMatch`, `forceMatch` (override), `markUnmatched`, `closeBreak`. Match sources `AUTO/USER/USER_FORCE`.

## 10.10 Confirmation, amendments, truth, audit, scoring

### `confirmationBreakEngine.js`
`detectConfirmationBreaks` / `hasConfirmationBreak` / `describeConfirmationBreaks` — delegates to `truthEngine.getConfirmationMismatches` (fields amount/valueDate/currency).

### `amendmentEngine.js` — multi-amendment with history
`extractAmendments` (regex-parse AI replies), `attachAmendments`, `createAmendment` (desk/source aware), `createAmendmentFromInput` (legacy — only when value equals truth), `applyAmendment`, `applyAllAccepted`. Amendment fields: number/desk/field/oldValue/newValue/source(USER|AI|FO|CPTY|SYSTEM)/status(PENDING|ACCEPTED|APPLIED).

### `truthEngine.js` — the grading oracle
- Layer A (legacy scenario): `loadScenarios/getScenario/verifyReference/checkPaymentReceived/verifySSI/getTruth` (canonical values: reference `REF99881`, BIC `CITIUS33XXX`).
- Layer B (desk-aware): `getDeskTruth`, `getMismatchFields(trade,desk)`, `getConfirmationMismatches`, `getSettlementMismatches`. Compares trainee-visible data vs `trade.truths.<desk>`.

### `auditEngine.js`
`recordEvent(tradeRef, actor, action, details, isAutomated)` → `AuditLog.create` (guarded by `getIsConnected`, best-effort). `getAuditTrail(tradeRef)`.

### `scoringEngine.js`
`evaluateAction(trade, action, issueType, userId)` — +5 VALIDATE, +3 RAISE_BREAK, +2 issueType; persists to `UserScore` (`$inc points`, push history). `applyPenalty(userId, tradeRef, points, reason)`.
> ⚠️ `scoringEngine.evaluateAction` is defined but **not called** by any live route (tradeRoutes uses `auditEngine` only) — see [18](18_Unused_And_Dead_Code.md).

## 10.11 Transport — `socketEngine.js`
`initSocket(server)` — Socket.io with CORS allowlist + JWT handshake auth; joins `user_<userId>`; handles `join_desk`/`leave_desk`. `getIo()` accessor (throws if uninitialized). Details in [13](13_Event_And_Socket_Flow.md).

## 10.12 Error handling patterns

| Pattern | Where |
|---|---|
| Fail-fast | `JWT_SECRET` missing → `process.exit(1)` (server.js) |
| Graceful DB degradation | `connectDB` never throws; `getIsConnected` guards writes |
| Try/catch per handler | Most routes wrap in try/catch → `500 {error: err.message}` |
| No try/catch (bug risk) | `conversationRoutes /send`, `GET /:tradeRef`, `GET /api/clock` |
| Fire-and-forget | Audit writes (`.catch(console.warn)`), socket emits (swallowed) |
| Special status | `queue/generate` returns 200 with `success:false`; `settlement/*` catches → 400 |
| Custom error | `InvalidTransitionError` (lifecycle) |

---
[← 09 API Reference](09_API_Reference.md) | [INDEX](INDEX.md) | Next: [11 Database Schema →](11_Database_Schema.md)
