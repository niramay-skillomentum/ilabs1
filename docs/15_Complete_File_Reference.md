# 15 · Complete File Reference

[← 14 Graphs](14_Execution_Call_And_Dependency_Graphs.md) | [INDEX](INDEX.md) | Next: [16 Sequence Diagrams →](16_Sequence_Diagrams.md)

---

Every source file with its purpose, key exports, what it imports, who uses it, and when it runs. Grouped by area. (Config/lockfiles/assets omitted from prose but listed at the end.)

## 15.1 Root

| File | Purpose | Key exports / behavior | Used when |
|---|---|---|---|
| [server.js](../server.js) | Backend entry point | mounts routers, registers interval processors, `startServer()`; exports `app` | `npm start`/`dev` |
| [package.json](../package.json) | Backend manifest | scripts: `start`, `dev`, `test:backend` | always |
| [llmService.js](../llmService.js) | ⚠️ Root Gemini wrapper (near-dup of engine copy, 5 retries) | `generateResponse` | **not imported by engines** (dead) |
| [checkDB.js](../checkDB.js) | Dev: dump conversations | — | manual `node checkDB.js` |
| [cleanDB.js](../cleanDB.js) | Dev: wipe all collections | deletes conversations/trades/queues/users/scores/audit | manual |
| [migrateDB.js](../migrateDB.js) | Dev: backfill `Conversation.desks=["MO"]` | — | manual |
| [seedConfig.js](../seedConfig.js) | Dev: seed `SETTLEMENT_INITIAL_STATE` | — | manual |
| [test-route.js](../test-route.js) | ⚠️ Manual smoke test of `/api/chat/tutor`; **hardcoded JWT secret** | — | manual |
| [test-tutor.js](../test-tutor.js) | Manual smoke test of `tutorAI` | — | manual |
| [Dockerfile](../Dockerfile) | Backend image (node:22-alpine) | — | docker build |
| [docker-compose.yml](../docker-compose.yml) | mongodb+backend+frontend stack | — | docker compose |
| [.env / .env.example](../.env.example) | Environment variables | — | boot |
| Directory.txt / project_tree.txt | ⚠️ Stale trees (ignore) | — | — |

## 15.2 Backend core (`src/`)

| File | Purpose | Exports | Imported by |
|---|---|---|---|
| [src/db.js](../src/db.js) | Mongoose connection (memory-fallback) | `connectDB`, `getIsConnected` | server.js, auditEngine, scoringEngine, dev scripts |
| [src/middleware/auth.js](../src/middleware/auth.js) | JWT verify middleware | `authenticateToken`, `JWT_SECRET` | all protected routes, socketEngine, authRoutes |

## 15.3 Models (`src/models/`) — see [11](11_Database_Schema.md) for schemas

| File | Model | Collection |
|---|---|---|
| [Trade.js](../src/models/Trade.js) | Trade | trades |
| [User.js](../src/models/User.js) | User | users |
| [Queue.js](../src/models/Queue.js) | Queue | queues |
| [Conversation.js](../src/models/Conversation.js) | Conversation | conversations |
| [FOCommunication.js](../src/models/FOCommunication.js) | FOCommunication | focommunications |
| [PendingReply.js](../src/models/PendingReply.js) | PendingReply | pendingreplies |
| [SystemJob.js](../src/models/SystemJob.js) | SystemJob | systemjobs |
| [SystemMail.js](../src/models/SystemMail.js) | SystemMail | systemmails |
| [AuditLog.js](../src/models/AuditLog.js) | AuditLog | auditlogs |
| [UserScore.js](../src/models/UserScore.js) | UserScore | userscores |
| [SystemConfig.js](../src/models/SystemConfig.js) | SystemConfig | systemconfigs |

## 15.4 Routes (`src/routes/`) — see [09](09_API_Reference.md)

| File | Prefix | Endpoints | Key engines called |
|---|---|---|---|
| [authRoutes.js](../src/routes/authRoutes.js) | /api/auth | register, login | bcrypt, jwt |
| [sessionRoutes.js](../src/routes/sessionRoutes.js) | /api/session | info, logout | queueComposer |
| [clockRoutes.js](../src/routes/clockRoutes.js) | /api/clock | GET / | simulationClock |
| [queueRoutes.js](../src/routes/queueRoutes.js) | /api/queue | generate, my | queueComposer, clock |
| [tradeRoutes.js](../src/routes/tradeRoutes.js) | /api/trade | all, action | lifecycle, amendment, conversation, communication, foInternal, systemWorkflow, truth, audit |
| [conversationRoutes.js](../src/routes/conversationRoutes.js) | /api/conversation(s) | send, resolve, shared, personal, :ref | conversationEngine, communicationEngine, aiParser, lifecycle, audit, truth |
| [foChannelRoutes.js](../src/routes/foChannelRoutes.js) | /api/fo-channel | list, :ref, send | foInternalChannel |
| [auditRoutes.js](../src/routes/auditRoutes.js) | /api/audit | :ref | auditEngine |
| [settlementRoutes.js](../src/routes/settlementRoutes.js) | /api/settlement | amend, send-for-approval, settle | systemWorkflowEngine, lifecycle, audit |
| [systemMailboxRoutes.js](../src/routes/systemMailboxRoutes.js) | /api/system-mailbox | list, read | SystemMail |
| [ssiRoutes.js](../src/routes/ssiRoutes.js) | /api/ssi | search, search-codes | tradeGenerator (SSI dicts) |
| [chatRoutes.js](../src/routes/chatRoutes.js) | /api/chat | tutor | tutorAI |

## 15.5 Engines (`src/engine/`) — see [10](10_Backend_Engines.md)

| File | Purpose | Key exports | DB touched |
|---|---|---|---|
| [transitions.js](../src/engine/transitions.js) | State machine map | `TRANSITIONS` | — |
| [lifecycle.js](../src/engine/lifecycle.js) | Transition enforcement | `LifecycleEngine` | — |
| [errors.js](../src/engine/errors.js) | Custom errors | `InvalidTransitionError` | — |
| [tradeGenerator.js](../src/engine/tradeGenerator.js) | Trade factory + SSI data | `generateTrades`, `saveGeneratedTrades`, `generateSingleTrade`, `generateXmlAudit`, `CPTY_SSIS`, `ENTITY_SSIS` | Trade, AuditLog, Conversation |
| [scenarioEngine.js](../src/engine/scenarioEngine.js) | Legacy scenario gen | `generateScenario` | — (in-mem) |
| [queue.js](../src/engine/queue.js) | Legacy in-mem queue | `DeskQueue` | — |
| [queueComposer.js](../src/engine/queueComposer.js) | Build queue + sessions | singleton (`buildQueue`, `getActiveQueue`, ...) | Trade, Queue, SystemConfig |
| [clock.js](../src/engine/clock.js) | Simulation clock | `SimulationClock` singleton | — |
| [cutoff.js](../src/engine/cutoff.js) | Currency cut-offs | `isCutOffBreached`, `getCutoffMinutes`, `CURRENCY_CUTOFF` | — |
| [ageCalculator.js](../src/engine/ageCalculator.js) | Desk-specific aging | `calculateAge`, ... | — |
| [dailyScheduler.js](../src/engine/dailyScheduler.js) | Re-age all trades | `runDailyCycle` singleton | Trade |
| [agendaJobs.js](../src/engine/agendaJobs.js) | Cron bootstrap | `startAgenda` | agendaJobs, Queue, Trade |
| [communicationEngine.js](../src/engine/communicationEngine.js) | CPTY/FO reply orchestrator | `scheduleReply`, `processReplies`, `scheduleFOReply`, `processFOReplies` | PendingReply, Trade, Conversation |
| [conversationEngine.js](../src/engine/conversationEngine.js) | Email thread store | `createMessage`, `getConversation`, `resolveConversation` | Conversation, Trade |
| [foInternalChannel.js](../src/engine/foInternalChannel.js) | FO escalation channel | `openChannel`, `sendMessage`, `scheduleFOInternalReply`, `processFOInternalReplies` | FOCommunication, PendingReply, Trade |
| [aiParser.js](../src/engine/aiParser.js) | Email intent parser | `parseEmail` | — |
| [cptyAI.js](../src/engine/cptyAI.js) | CPTY persona (confirmation) | `generateResponse` | Trade (read) |
| [cptySettlementAI.js](../src/engine/cptySettlementAI.js) | CPTY persona (settlement/opaque) | `generateResponse` | Trade (read) |
| [foAI.js](../src/engine/foAI.js) | FO persona | `generateFOResponse` | — |
| [offlineResponseEngine.js](../src/engine/offlineResponseEngine.js) | Deterministic fallback brain | `generateFOResponseOffline`, `generateCPTYResponseOffline`, `classifyQuery`, `analyzeTradeContext` | Trade (read) |
| [cptyOfflineResponses.js](../src/engine/cptyOfflineResponses.js) | CPTY template bank | object | — |
| [foOfflineResponses.js](../src/engine/foOfflineResponses.js) | FO template bank | object | — |
| [foResponseProfiles.js](../src/engine/foResponseProfiles.js) | CP speed/personality | `getProfile`, `getDelay`, `PROFILES` | — |
| [tutorAI.js](../src/engine/tutorAI.js) | Socratic tutor (OpenRouter) | `generateTutorResponse` | reads docs/skb/*.md |
| [llmService.js](../src/engine/llmService.js) | Gemini wrapper (used) | `generateResponse` | — |
| [settlement.js](../src/engine/settlement.js) | ⚠️ Prisma settlement approve | `approveSettlement` | Prisma (remnant) |
| [settlementBreakEngine.js](../src/engine/settlementBreakEngine.js) | Settlement break resolve | `investigateBreak`, `resolveBreak` | — |
| [settlementInteraction.js](../src/engine/settlementInteraction.js) | CPTY settlement sim | `refreshStatus`, `sendEmail`, `sendChaser`, `excludeTrade` | — |
| [systemWorkflowEngine.js](../src/engine/systemWorkflowEngine.js) | Verification/amend bot | `scheduleAmendment`, `scheduleVerification`, `validateTrade`, `processJobs`, `SSI_FIELDS`, `MANDATORY_FIELDS` | SystemJob, SystemMail, Trade, AuditLog, Queue |
| [reconciliation.js](../src/engine/reconciliation.js) | Ledger/statement recon | `generateLedgerEntry`, `generateStatement`, `attemptAutoMatch`, `getUnmatched` | — (in-mem) |
| [reconBreakEngine.js](../src/engine/reconBreakEngine.js) | Recon break ops | `investigateBreak`, `manualMatch`, `forceMatch`, `markUnmatched`, `closeBreak` | — |
| [confirmationBreakEngine.js](../src/engine/confirmationBreakEngine.js) | Confirmation break detect | `detectConfirmationBreaks`, `describeConfirmationBreaks` | — |
| [amendmentEngine.js](../src/engine/amendmentEngine.js) | Amendment lifecycle | `extractAmendments`, `createAmendment`, `applyAllAccepted`, ... | — |
| [truthEngine.js](../src/engine/truthEngine.js) | Grading oracle | `getMismatchFields`, `getConfirmationMismatches`, `getSettlementMismatches`, legacy verifiers | — |
| [auditEngine.js](../src/engine/auditEngine.js) | Audit log | `recordEvent`, `getAuditTrail` | AuditLog |
| [scoringEngine.js](../src/engine/scoringEngine.js) | ⚠️ Scoring (uninvoked) | `evaluateAction`, `applyPenalty` | UserScore |
| [socketEngine.js](../src/engine/socketEngine.js) | Socket.io server | `initSocket`, `getIo` | server.js + emitters |

## 15.6 Frontend (`frontend/src/`) — see [08](08_Frontend_Components.md)

| File | Route/Role | Type | Key APIs / sockets |
|---|---|---|---|
| [app/layout.js](../frontend/src/app/layout.js) | Root layout | server | — |
| [app/page.js](../frontend/src/app/page.js) | `/` login | client | auth/login, auth/register |
| [app/dashboard/page.js](../frontend/src/app/dashboard/page.js) | `/dashboard` | client | — |
| [app/workstation/page.js](../frontend/src/app/workstation/page.js) | `/workstation` | client | queue/*, trade/action, settlement/amend, audit/:ref, conversation/send, session/logout + socket |
| [app/mo-risk/page.js](../frontend/src/app/mo-risk/page.js) | `/mo-risk` | client | trade/all, session/info |
| [app/ssi-database/page.js](../frontend/src/app/ssi-database/page.js) | `/ssi-database` | client | ssi/search-codes, session/info |
| [app/communication/page.js](../frontend/src/app/communication/page.js) | `/communication` | client | conversation(s)/*, fo-channel/*, system-mailbox/*, queue/my, trade/action + socket |
| [app/communication/components/*](../frontend/src/app/communication/components/) | Mailbox parts | fn comps | — |
| [components/InstructionPanel.js](../frontend/src/components/InstructionPanel.js) | SOP panel | client | — |
| [components/TutorialPanel.js](../frontend/src/components/TutorialPanel.js) | AI tutor chat | client | chat/tutor (direct URL) |
| [components/instructionsData.js](../frontend/src/components/instructionsData.js) | Desk SOP data | module | — |
| [lib/auth.js](../frontend/src/lib/auth.js) | sessionStorage helpers | module | — |
| [next.config.mjs](../frontend/next.config.mjs) | Proxy config | — | rewrites |

## 15.7 Tests

| File | Type | Covers |
|---|---|---|
| [tests/backend/auth.test.js](../tests/backend/auth.test.js) | Supertest + mocked User | register (success/dup), login (success/wrong-pw) |
| [tests/backend/tradeActions.test.js](../tests/backend/tradeActions.test.js) | Supertest | `POST /api/trade/action` |
| [frontend/__tests__/page.test.js](../frontend/__tests__/page.test.js) | RTL | Login page renders heading + inputs |
| [frontend/__tests__/Workstation.test.js](../frontend/__tests__/Workstation.test.js) | RTL | Workstation component |

## 15.8 Config / infra / assets (non-code)

`.github/workflows/ci.yml` (CI), `.dockerignore`, `.gitignore`, `frontend/{eslint.config.mjs, postcss.config.mjs, jest.config.js, jest.setup.js, jsconfig.json}`, `frontend/public/*.svg`, `frontend/{README.md, AGENTS.md, CLAUDE.md}`, `frontend/src/app/{globals.css, favicon.ico}`, `frontend/src/app/communication/page.css`.

## 15.9 Execution-order column (quick map)

| Order | Files that run first for a fresh user |
|---|---|
| 1 | `server.js` (boot) |
| 2 | `page.js` (login) → `authRoutes.js` |
| 3 | `dashboard/page.js` |
| 4 | `workstation/page.js` → `queueRoutes.js` → `queueComposer.js` → `tradeGenerator.js` |
| 5 | user actions → `tradeRoutes.js` → `lifecycle.js` |
| 6 | comms → `conversationRoutes.js` → `communicationEngine.js` → (timer) AI engines |
| 7 | settlement → `settlementRoutes.js` → `systemWorkflowEngine.js` |

---
[← 14 Graphs](14_Execution_Call_And_Dependency_Graphs.md) | [INDEX](INDEX.md) | Next: [16 Sequence Diagrams →](16_Sequence_Diagrams.md)
