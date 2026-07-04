# 18 · Unused Code, Dead Code & Duplicate Logic

[← 17 Flowcharts](17_Flowcharts.md) | [INDEX](INDEX.md) | Next: [19 Performance →](19_Performance_Analysis.md)

---

Findings from full source analysis. Severity: 🔴 bug (affects behavior) · 🟠 dead/unused (no behavior, cleanup) · 🟡 duplicate/inconsistency.

## 18.1 Unused / declared-but-not-used dependencies

| Item | Where | Note |
|---|---|---|
| 🟠 `@cerebras/cerebras_cloud_sdk` | root `package.json` | Declared; **no `require`/import anywhere** |
| 🟠 `groq-sdk` | root `package.json` + `GROQ_API_KEY` in .env | Declared; unused |
| 🟠 `js-cookie` | frontend `package.json` | Installed; **never imported** (auth uses `sessionStorage`) |

## 18.2 Unused / orphaned modules & data

| Item | File | Note |
|---|---|---|
| 🟠 Root `llmService.js` | [llmService.js](../llmService.js) | Near-duplicate of `src/engine/llmService.js` (5 retries vs 3, smarter backoff). **Engines import the `src/engine` copy**; the root file is not required by any live code. |
| 🟠 `scenarioEngine.js` | [src/engine/scenarioEngine.js](../src/engine/scenarioEngine.js) | Legacy 20-scenario generator with its own `CLEAN`/`BREAK` statuses. **Not wired into the DB queue path** (`queueComposer`/`tradeGenerator` are the live path). |
| 🟠 `queue.js` `DeskQueue` | [src/engine/queue.js](../src/engine/queue.js) | In-memory FIFO queue class; not used by `queueComposer`. |
| 🟠 `settlement.js` (Prisma) | [src/engine/settlement.js](../src/engine/settlement.js) | `approveSettlement(prisma, ...)` uses a **Prisma** client; no route calls it and there is no Prisma setup in the repo (only a stale `Directory.txt` mentions Prisma). Settlement approval actually runs through `systemWorkflowEngine`. |
| 🟠 `settlementBreakEngine.js`, `settlementInteraction.js` | engine | Implement a CPTY-settlement-response model (`cptyStatus`, `DISCREPANCY_DISTRIBUTION`) that no live route invokes; the live settlement break path uses `SETTLEMENT_RAISE_BREAK` + system bot. |
| 🟠 `reconciliation.js`, `reconBreakEngine.js` | engine | Full recon engine (ledger/statement/match), **no Express route exposes it**. Lifecycle statuses `RECON_PENDING/RECON_CLEARED/UNMATCHED_BY_USER/CLOSED` exist but are unreachable in practice. |
| 🟠 `scoringEngine.js` | engine | `evaluateAction`/`applyPenalty` are **never called** by any live route (tradeRoutes only audits). `UserScore` therefore stays empty. |
| 🟠 `confirmationBreakEngine.js` | engine | Detection helpers exist; the live confirmation flow uses `truthEngine.getConfirmationMismatches` directly. Thin/duplicate wrapper. |
| 🟠 `generateFOInvestigatingResponse` | foInternalChannel.js | Defined but never referenced (`FO_INVESTIGATING` position never set). |
| 🟠 `GET /api/ssi/search` (legacy) | ssiRoutes.js | Superseded by `/search-codes`; frontend only calls `/search-codes`. |
| 🟠 `getOperationalTimeET()` | clock.js | Just proxies `getFormattedTime()`; ET conversion is a TODO. |

## 18.3 Dead / broken frontend wiring

| Item | File | Note |
|---|---|---|
| 🔴 `SETTLEMENT_SEND_BACK_TO_MO` button | workstation/page.js | Calls `handleOpenAction('SETTLEMENT_SEND_BACK_TO_MO')`, but the key is **absent from the `allowed` map** → always "Invalid action for current state". Also absent from backend `allowedActions` → unreachable server-side. |
| 🔴 `startSettlementCptyFlow()` | workstation/page.js | Guards on `allowed['SETTLEMENT_FOLLOW_UP_CPTY']` (undefined) → always errors; **not bound to any button**. |
| 🟠 `popupState.type === "email"` modal | workstation/page.js | The email modal + `sendEmail()` remain, but no current button sets `type:"email"` (email flow moved to `/communication`). |
| 🟠 `CONFIRM_SEND_BACK_TO_MO`, `SETTLEMENT_SEND_BACK_TO_MO`, `default` | tradeRoutes.js switch | Unreachable — `allowedActions` guard rejects them before the switch. |
| 🟠 Sent/Drafts/Deleted folders | communication FolderNav | UI-only; always empty. |
| 🟠 FO group inbox | communication | Intentionally empty. |

## 18.4 Bugs (behavioral) 🔴

| Bug | File | Effect |
|---|---|---|
| 🔴 Login stuck spinner | page.js `handleSubmit` | Empty email/password sets error & returns **without** `setIsLoading(false)` → button stuck "Processing…". |
| 🔴 Null-trade crash | conversationRoutes `/send` | No try/catch; if `Trade.findOne` returns null the CPTY branch dereferences `trade.foEscalation`/`trade.save()` → unhandled 500. |
| 🟠 TutorialPanel missing context | workstation → TutorialPanel | Workstation passes only `desk`, so `tradeContext` sent to `/api/chat/tutor` is `undefined`. |
| 🟠 Cut-off timezone mismatch | cutoff.js | `clock.getFormattedTime()` emits local-component string, but `isCutOffBreached` re-reads it with `getUTCHours/Minutes` → possible misalignment by server TZ. |
| 🟠 `daily-age-update` misnamed | agendaJobs.js | Runs **every minute**, not daily. |
| 🟠 Socket base URL divergence | workstation vs communication | Without `NEXT_PUBLIC_BACKEND_URL`, Workstation sockets target `localhost:3002` while Communication targets app origin. |

## 18.5 Duplicate / inconsistent logic 🟡

| Item | Note |
|---|---|
| 🟡 `allowedActions` duplicated | Same action→status map exists in both `tradeRoutes.js` (backend) and `workstation/page.js` (`allowed`). Must be kept in sync manually. |
| 🟡 Two LLM wrappers | root `llmService.js` vs `src/engine/llmService.js`. |
| 🟡 Two truth mechanisms | `truthEngine` Layer A (legacy scenario) vs Layer B (desk-aware). Only Layer B is on the live path. |
| 🟡 Two trade generators | `tradeGenerator` (live) vs `scenarioEngine` (legacy). |
| 🟡 Response `success` inconsistency | `GET /api/audit/:ref` omits `success`; `POST /api/queue/generate` returns 200 with `success:false`. |
| 🟡 Mixed persistence | Mongoose everywhere except `settlement.js` (Prisma remnant). |
| 🟡 Stale trees | `Directory.txt` / `project_tree.txt` describe a different (older) structure. |

## 18.6 Missing referenced files

| Referenced | By | Status |
|---|---|---|
| `docs/skb/simulator_workflow_guide.md` etc. | tutorAI.js (readFileSync) | **Deleted** in this checkout (git status shows `D docs/skb/*`). Tutor best-effort skips them (logs warning). |
| `docs/ai/*.md`, `docs/0X_*.md` | project_tree.txt | Deleted (prior doc set); replaced by this KB. |

## 18.7 Recommended cleanup priorities

1. **Fix 🔴 bugs** first: login spinner, conversationRoutes null-trade crash, dead settlement buttons.
2. Restore `docs/skb/*.md` (or remove the tutor's dependency) so the tutor has its knowledge base.
3. Decide the fate of the recon/scoring/scenario/Prisma modules — either wire them up or remove them.
4. De-duplicate `allowedActions` and `llmService`.
5. Remove unused deps (`cerebras`, `groq`, `js-cookie`).

> These are **observations**, not applied changes — this documentation task did not modify the codebase.

---
[← 17 Flowcharts](17_Flowcharts.md) | [INDEX](INDEX.md) | Next: [19 Performance →](19_Performance_Analysis.md)
