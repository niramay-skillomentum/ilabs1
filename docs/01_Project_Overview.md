# 01 · Project Overview

[← INDEX](INDEX.md) | Next: [02 Architecture →](02_Architecture.md)

---

## 1.1 Purpose

**iLabs1 (the "SGB Operations Simulator")** is a **serious-game / e-learning platform** that trains new investment-bank **post-trade operations analysts**. It reproduces the day-to-day workflow of three operations desks and forces the trainee to make the same decisions a real analyst makes: validate booked trades against a "source of truth", detect discrepancies ("breaks"), communicate with counterparties and the front-office to investigate, raise amendments, obtain approvals, settle, and reconcile.

The product name shown in the browser is **"SGB Operations Simulator | Niramay Skillomentum"** (see [frontend/src/app/layout.js](../frontend/src/app/layout.js)).

## 1.2 The problem it solves

Training a new operations analyst on a live production trade-processing system is risky (real money, real counterparties) and slow (real trades take days to settle). This simulator solves that by providing:

- A **safe sandbox** with synthetic trades that behave like real ones.
- **Compressed time** — a 9-hour trading day plays out in ~3 real hours (see the simulation clock, [src/engine/clock.js](../src/engine/clock.js)).
- **AI-simulated counterparties & front-office** that reply to the trainee's emails realistically, so the trainee practices the full investigate-and-resolve loop.
- **Automatic grading** of actions (scoring) and a complete **audit trail** of everything the trainee did.
- An embedded **AI tutor** that coaches via Socratic questioning without giving away answers.

## 1.3 Target users

| User | Role in the system |
|---|---|
| **Trainee analyst** | The primary user. Logs in, picks a desk, works a queue of ~20 trades per session. |
| **Counterparty (CPTY)** | *Simulated by AI.* Replies to confirmation/settlement emails; may "stay firm" or "admit a mistake" depending on the truth. |
| **Front Office (FO)** | *Simulated by AI.* The trading desk that booked the trade; the trainee escalates to FO to resolve MO/confirmation breaks. |
| **System Verification Bot** | *Automated backend workflow* that amends settlement SSIs and approves/rejects settlement trades (see [src/engine/systemWorkflowEngine.js](../src/engine/systemWorkflowEngine.js)). |
| **Trainer / L&D** (implied) | Would consume scoring/audit data; no dedicated admin UI exists yet. |

There is **no role-based access control** in the code — every authenticated user is a trainee. "Desk" is a per-session choice, not an identity attribute (see [05](05_Authentication_And_Login_Flow.md) and [20](20_Security_Analysis.md)).

## 1.4 Business logic (domain model in brief)

The heart of the domain is a **trade** that moves through a **lifecycle state machine** ([src/engine/transitions.js](../src/engine/transitions.js)). Each trade carries several **desk-specific "truths"** — the correct economics as known by different parties:

- `truths.universal` — the absolute truth.
- `truths.mo` — what the front office / MO source shows.
- `truths.confirmation` — what the counterparty expects (no counterparty field at this level).
- `truths.settlement` — full settlement instructions (SSI) truth.

What the trainee **sees** is the `booking` (and `settlementDetails`). A **break** is any mismatch between what the trainee sees and the relevant desk truth. The trainee's job at each desk:

| Desk | Compares | Break =' | Resolution tools |
|---|---|---|---|
| **MO** | `booking` vs `truths.mo` | amount / value date / currency / counterparty mismatch | escalate to FO, raise amendment, resolve |
| **Confirmation** | trade economics vs `truths.confirmation` | amount / value date / currency mismatch | email counterparty, escalate to FO, request evidence, reject claim, amend |
| **Settlement** | `settlementDetails` vs `truths.settlement` | SSI field mismatch | look up SSI codes, mail counterparty, raise break → system amendment → approval → settle |

A trade that is clean simply advances; a trade with a break must be worked. See [06 User Flows](06_User_Flows.md) for the full step-by-step of each desk.

## 1.5 Modules (functional decomposition)

| Module | Where | Responsibility |
|---|---|---|
| **Auth & Session** | [authRoutes](../src/routes/authRoutes.js), [sessionRoutes](../src/routes/sessionRoutes.js), [middleware/auth](../src/middleware/auth.js) | Register/login, JWT issuance, session info/logout |
| **Queue & Session composition** | [queueComposer](../src/engine/queueComposer.js), [queueRoutes](../src/routes/queueRoutes.js) | Build a 20-trade queue per user, 3-hour session lifecycle |
| **Trade generation** | [tradeGenerator](../src/engine/tradeGenerator.js), [scenarioEngine](../src/engine/scenarioEngine.js) | Manufacture synthetic trades + injected breaks + XML audit |
| **Lifecycle state machine** | [transitions](../src/engine/transitions.js), [lifecycle](../src/engine/lifecycle.js) | Legal status transitions & enforcement |
| **Trade actions** | [tradeRoutes](../src/routes/tradeRoutes.js) | The core state-machine endpoint driving all desk actions |
| **Communication (email)** | [communicationEngine](../src/engine/communicationEngine.js), [conversationEngine](../src/engine/conversationEngine.js), [conversationRoutes](../src/routes/conversationRoutes.js) | CPTY/FO email queues, threads, delayed AI replies |
| **FO internal channel** | [foInternalChannel](../src/engine/foInternalChannel.js), [foChannelRoutes](../src/routes/foChannelRoutes.js) | Internal FO escalation chat |
| **AI personas** | [cptyAI](../src/engine/cptyAI.js), [cptySettlementAI](../src/engine/cptySettlementAI.js), [foAI](../src/engine/foAI.js), [offlineResponseEngine](../src/engine/offlineResponseEngine.js), [llmService](../src/engine/llmService.js) | Generate counterparty/FO replies (Gemini + offline) |
| **AI Tutor** | [tutorAI](../src/engine/tutorAI.js), [chatRoutes](../src/routes/chatRoutes.js) | Socratic coaching via OpenRouter/Nemotron |
| **Settlement workflow** | [systemWorkflowEngine](../src/engine/systemWorkflowEngine.js), [settlementRoutes](../src/routes/settlementRoutes.js), [settlement](../src/engine/settlement.js), [cutoff](../src/engine/cutoff.js) | Automated amendment/verification bot, cut-off logic |
| **Reconciliation** | [reconciliation](../src/engine/reconciliation.js), [reconBreakEngine](../src/engine/reconBreakEngine.js) | Ledger vs statement matching (post-settlement) |
| **Amendments** | [amendmentEngine](../src/engine/amendmentEngine.js) | Extract/create/apply amendments with history |
| **Truth oracle** | [truthEngine](../src/engine/truthEngine.js) | Compute mismatches vs desk truths (grading basis) |
| **Audit & Scoring** | [auditEngine](../src/engine/auditEngine.js), [scoringEngine](../src/engine/scoringEngine.js), [auditRoutes](../src/routes/auditRoutes.js) | Event log + points/penalties |
| **SSI reference data** | [ssiRoutes](../src/routes/ssiRoutes.js) (data from tradeGenerator) | Settlement instruction lookup by code |
| **Real-time transport** | [socketEngine](../src/engine/socketEngine.js) | Socket.io server, rooms, JWT auth |
| **Scheduling** | [agendaJobs](../src/engine/agendaJobs.js), [dailyScheduler](../src/engine/dailyScheduler.js), [clock](../src/engine/clock.js) | Cron jobs, aging, sim clock |

## 1.6 Tech stack

### Backend (`/`)
| Layer | Technology |
|---|---|
| Language / module system | Node.js, CommonJS (`"type": "commonjs"`) |
| Web framework | **Express 5** (`express@^5.2.1`) |
| Database | **MongoDB Atlas** via **Mongoose 9** (`mongoose@^9.7.0`) |
| Real-time | **Socket.io 4** (`socket.io@^4.8.3`) |
| Job scheduler | **Agenda 5** (`agenda@^5.0.0`, MongoDB-backed) |
| Auth | **jsonwebtoken 9**, **bcryptjs 3**, **cookie**, **express-rate-limit** |
| AI | **@google/genai 2.8** (Gemini). Declared-but-unused: `@cerebras/cerebras_cloud_sdk`, `groq-sdk`. Tutor uses raw `fetch` to OpenRouter. |
| Security utils | **sanitize-html 2.17** (XSS scrubbing of email bodies), **cors** |
| Misc | **uuid**, **dotenv** |
| Test | **jest 30**, **supertest 7** |

### Frontend (`/frontend`)
| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.9** (App Router, `next dev --webpack`) |
| UI | **React 19.2.4**, **react-dom 19.2.4** |
| Styling | **Tailwind CSS 4**, `@tailwindcss/typography` (plus lots of inline CSS) |
| Real-time | **socket.io-client 4** |
| Notifications | **react-hot-toast** |
| Markdown | **react-markdown** (renders tutor replies) |
| Cookies | **js-cookie** — *declared but unused* (auth uses `sessionStorage`) |
| Test | **jest**, **@testing-library/react**, **jest-environment-jsdom** |

### Infrastructure
| Concern | Technology |
|---|---|
| Containerization | **Docker** (`Dockerfile` backend, `frontend/Dockerfile`), **docker-compose.yml** (mongodb + backend + frontend) |
| CI | **GitHub Actions** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) — runs backend + frontend Jest suites on push/PR to `main` |

## 1.7 Dependency summary (root `package.json`)

```json
"dependencies": {
  "@cerebras/cerebras_cloud_sdk": "^1.64.1",   // declared, UNUSED in code
  "@google/genai": "^2.8.0",                    // Gemini (CPTY/FO AI)
  "agenda": "^5.0.0",                           // cron jobs
  "bcryptjs": "^3.0.3",                         // password hashing
  "cookie": "^1.1.1",                           // socket cookie parse
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "express-rate-limit": "^8.5.2",               // auth brute-force guard
  "groq-sdk": "^1.2.1",                         // declared, UNUSED in code
  "jsonwebtoken": "^9.0.3",
  "mongoose": "^9.7.0",
  "sanitize-html": "^2.17.5",                   // email XSS scrubbing
  "socket.io": "^4.8.3",
  "uuid": "^13.0.0"                             // reconciliation ids
}
```

See [14 Dependency Graph](14_Execution_Call_And_Dependency_Graphs.md) for internal module dependencies and [18 Unused Code](18_Unused_And_Dead_Code.md) for the declared-but-unused packages.

## 1.8 Key domain concepts (read before anything else)

| Term | Meaning (full definition in [Glossary](22_Glossary.md)) |
|---|---|
| **Desk** | One of `MO`, `CONFIRMATION`, `SETTLEMENT` (plus stub `TLM`, `REPORTING`). The trainee works one desk per session. |
| **Break** | A discrepancy between the trainee's view (`booking`/`settlementDetails`) and the desk truth. |
| **Truth** | The correct economics, stored per-desk on the trade under `truths.*`. |
| **Queue** | The 20-trade worklist assigned to a user for a 3-hour session. |
| **SSI** | Standard Settlement Instructions — beneficiary/bank/account details for settlement. |
| **T+2** | Value date = trade date + 2 business days. |
| **Cut-off** | Latest sim-time a currency can still settle same-day. |
| **Amendment** | A correction applied to a trade field, tracked in `amendmentHistory`. |
| **LIASING** | (sic — the exact status literal) "liaising with" a party, e.g. `LIASING_WITH_CPTY`. |

---
[← INDEX](INDEX.md) | Next: [02 Architecture →](02_Architecture.md)
