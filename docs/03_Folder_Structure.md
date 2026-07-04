# 03 · Complete Folder Structure

[← 02 Architecture](02_Architecture.md) | [INDEX](INDEX.md) | Next: [04 Entry Point →](04_Entry_Point_And_Startup.md)

---

## 3.1 Top-level tree

```
ilabs1/
├── server.js                 # ★ Backend entry point (Express + Socket.io + intervals)
├── package.json              # Backend deps & scripts (start/dev/test:backend)
├── package-lock.json
├── .env / .env.example       # Environment variables (secrets, DB URI, API keys)
├── Dockerfile                # Backend container image (node:22-alpine)
├── docker-compose.yml        # mongodb + backend + frontend stack
├── .dockerignore / .gitignore
├── .github/workflows/ci.yml  # GitHub Actions CI (backend + frontend Jest)
│
├── llmService.js             # ⚠ Root-level Gemini wrapper (near-duplicate of engine copy; not imported by engines)
├── checkDB.js                # Dev script: dump all conversations
├── cleanDB.js                # Dev script: wipe all collections
├── migrateDB.js              # Dev script: backfill Conversation.desks
├── seedConfig.js             # Dev script: seed SystemConfig SETTLEMENT_INITIAL_STATE
├── test-route.js             # ⚠ Manual smoke test of /api/chat/tutor (hardcoded JWT secret)
├── test-tutor.js             # Manual smoke test of tutorAI.generateTutorResponse
├── Directory.txt             # Stale hand-written tree (out of date; do not trust)
├── project_tree.txt          # Stale flat file listing (out of date; references deleted ai/ docs)
│
├── src/                      # ★ Backend source
│   ├── db.js                 # Mongoose connection (connectDB / getIsConnected)
│   ├── middleware/
│   │   └── auth.js           # authenticateToken (JWT) + JWT_SECRET export
│   ├── models/               # 11 Mongoose schemas (see §3.3)
│   ├── routes/               # 12 Express routers = "controllers" (see §3.4)
│   └── engine/               # 37 business-logic engine modules (see §3.5)
│
├── tests/
│   └── backend/
│       ├── auth.test.js          # Supertest: /api/auth/register + /login
│       └── tradeActions.test.js  # Supertest: /api/trade/action
│
├── docs/                     # ★ THIS knowledge base (generated)
│
└── frontend/                 # ★ Next.js 16 app (separate package)
    ├── package.json          # Frontend deps & scripts (dev/build/start/test)
    ├── next.config.mjs       # rewrites /api/* and /socket.io/* -> backend
    ├── jsconfig.json         # @/* -> ./src/*
    ├── jest.config.js / jest.setup.js
    ├── eslint.config.mjs / postcss.config.mjs
    ├── Dockerfile            # Frontend container image
    ├── README.md / AGENTS.md / CLAUDE.md  # Dev notes
    ├── public/               # Static SVGs (next/vercel/globe/window/file)
    ├── __tests__/            # Jest: page.test.js, Workstation.test.js
    └── src/
        ├── app/              # App Router pages (folder = route)
        ├── components/       # Shared React components + instruction data
        └── lib/
            └── auth.js       # sessionStorage session helpers
```

## 3.2 Why each top-level folder exists

| Folder / file | Why it exists | What it stores | Connected to |
|---|---|---|---|
| `server.js` | Single backend entry point | Express app config, route mounts, background intervals, `startServer()` | Imports everything under `src/`; started by `npm start`/`npm run dev` |
| `src/` | All backend business logic | Models, routes, engines, middleware, db connector | Mounted by `server.js` |
| `src/models/` | Mongoose ODM layer | One file per MongoDB collection schema | Required by routes & engines |
| `src/routes/` | HTTP surface ("controllers") | One router per API domain; handler logic is inline | Mounted in `server.js`; call engines & models |
| `src/engine/` | Domain logic & simulation | Lifecycle, AI, settlement, recon, comms, scheduling | Called by routes and background processors |
| `src/middleware/` | Cross-cutting request handling | `authenticateToken` JWT guard | Applied per-route |
| `tests/backend/` | Backend integration tests | Supertest specs for auth & trade actions | Run by `npm run test:backend` and CI |
| `docs/` | Documentation (this KB) | Markdown knowledge base | Also read at runtime by `tutorAI` (`docs/skb/*.md`, currently missing) |
| `frontend/` | The web client | Next.js app, its own `package.json`/lockfile/node_modules | Talks to backend via proxy + sockets |
| `frontend/src/app/` | App Router routes | Each subfolder with `page.js` = a route | Client pages calling `/api/*` |
| `frontend/src/components/` | Reusable UI | `InstructionPanel`, `TutorialPanel`, `instructionsData` | Imported by pages |
| `frontend/src/lib/` | Frontend utilities | `auth.js` session helpers | Imported by all pages |
| `frontend/public/` | Static assets | Default Next SVGs | Served statically |
| `.github/workflows/` | CI configuration | `ci.yml` | GitHub Actions |
| Root dev scripts | One-off DB/ops utilities | `checkDB/cleanDB/migrateDB/seedConfig`, `test-*` | Run manually with `node <file>` |

## 3.3 `src/models/` — 11 collections

| File | Model | Collection | Purpose |
|---|---|---|---|
| [Trade.js](../src/models/Trade.js) | `Trade` | `trades` | Central trade entity + truths + booking + settlement + amendments |
| [User.js](../src/models/User.js) | `User` | `users` | Registered users |
| [Queue.js](../src/models/Queue.js) | `Queue` | `queues` | Per-user 3h session & assigned trades |
| [Conversation.js](../src/models/Conversation.js) | `Conversation` | `conversations` | CPTY/FO email threads |
| [FOCommunication.js](../src/models/FOCommunication.js) | `FOCommunication` | `focommunications` | FO internal-channel threads |
| [PendingReply.js](../src/models/PendingReply.js) | `PendingReply` | `pendingreplies` | Delayed AI replies queue |
| [SystemJob.js](../src/models/SystemJob.js) | `SystemJob` | `systemjobs` | Settlement amend/verify delayed jobs |
| [SystemMail.js](../src/models/SystemMail.js) | `SystemMail` | `systemmails` | System-notification mailbox |
| [AuditLog.js](../src/models/AuditLog.js) | `AuditLog` | `auditlogs` | Event audit trail |
| [UserScore.js](../src/models/UserScore.js) | `UserScore` | `userscores` | Points/penalties/history |
| [SystemConfig.js](../src/models/SystemConfig.js) | `SystemConfig` | `systemconfigs` | Key/value config |

Full schemas in [11 Database Schema](11_Database_Schema.md).

## 3.4 `src/routes/` — 12 routers (mount prefixes)

| File | Mount prefix (in `server.js`) | Domain |
|---|---|---|
| [authRoutes.js](../src/routes/authRoutes.js) | `/api/auth` | register / login |
| [sessionRoutes.js](../src/routes/sessionRoutes.js) | `/api/session` | session info / logout |
| [clockRoutes.js](../src/routes/clockRoutes.js) | `/api/clock` | simulated clock (public) |
| [queueRoutes.js](../src/routes/queueRoutes.js) | `/api/queue` | generate / fetch queue |
| [tradeRoutes.js](../src/routes/tradeRoutes.js) | `/api/trade` | all trades + the core `action` endpoint |
| [conversationRoutes.js](../src/routes/conversationRoutes.js) | `/api/conversation` **and** `/api/conversations` | email threads |
| [foChannelRoutes.js](../src/routes/foChannelRoutes.js) | `/api/fo-channel` | FO internal channel |
| [auditRoutes.js](../src/routes/auditRoutes.js) | `/api/audit` | audit trail |
| [settlementRoutes.js](../src/routes/settlementRoutes.js) | `/api/settlement` | amend / approve / settle |
| [systemMailboxRoutes.js](../src/routes/systemMailboxRoutes.js) | `/api/system-mailbox` | system mailbox |
| [ssiRoutes.js](../src/routes/ssiRoutes.js) | `/api/ssi` | SSI lookup |
| [chatRoutes.js](../src/routes/chatRoutes.js) | `/api/chat` | AI tutor |

Full endpoint docs in [09 API Reference](09_API_Reference.md).

## 3.5 `src/engine/` — 37 engine modules (grouped)

| Group | Files |
|---|---|
| **Lifecycle & state** | `transitions.js`, `lifecycle.js`, `errors.js` |
| **Trade generation** | `tradeGenerator.js`, `scenarioEngine.js`, `queue.js` (legacy in-mem) |
| **Queue & session** | `queueComposer.js` |
| **Clock & scheduling** | `clock.js`, `cutoff.js`, `ageCalculator.js`, `dailyScheduler.js`, `agendaJobs.js` |
| **Communication (email)** | `communicationEngine.js`, `conversationEngine.js`, `foInternalChannel.js`, `aiParser.js` |
| **AI personas (CPTY/FO)** | `cptyAI.js`, `cptySettlementAI.js`, `foAI.js`, `offlineResponseEngine.js`, `cptyOfflineResponses.js`, `foOfflineResponses.js`, `foResponseProfiles.js`, `foOfflineResponses.js` |
| **AI tutor & LLM** | `tutorAI.js`, `llmService.js` |
| **Settlement** | `settlement.js`, `settlementBreakEngine.js`, `settlementInteraction.js`, `systemWorkflowEngine.js` |
| **Reconciliation** | `reconciliation.js`, `reconBreakEngine.js` |
| **Confirmation** | `confirmationBreakEngine.js` |
| **Amendments** | `amendmentEngine.js` |
| **Truth / grading** | `truthEngine.js`, `scoringEngine.js` |
| **Audit** | `auditEngine.js` |
| **Transport** | `socketEngine.js` |

Full per-file documentation in [10 Backend Engines](10_Backend_Engines.md) and [15 File Reference](15_Complete_File_Reference.md).

## 3.6 `frontend/src/app/` — route folders

```
app/
├── layout.js              # Root layout (fonts + <Toaster/>)  [server component]
├── globals.css            # Tailwind 4 theme
├── favicon.ico
├── page.js                # Route "/"           → Login / Register
├── dashboard/page.js      # Route "/dashboard"  → Desk selector
├── workstation/page.js    # Route "/workstation" → Trade blotter (core screen, 728 lines)
├── mo-risk/page.js        # Route "/mo-risk"    → Termsheet viewer
├── ssi-database/page.js   # Route "/ssi-database" → SSI code lookup
└── communication/
    ├── page.js            # Route "/communication" → Mailbox (647 lines)
    ├── page.css
    └── components/        # Mailbox sub-components
        ├── ComposeModal.js
        ├── FolderNav.js
        ├── InboxList.js
        ├── MessageThread.js
        ├── ReplyModal.js
        └── utils.js       # pure helpers (formatDate, buildSubject, getStatusBadge...)
```

`frontend/src/components/` (shared, not route-specific): `InstructionPanel.js`, `TutorialPanel.js`, `instructionsData.js`.

Full component docs in [08 Frontend Components](08_Frontend_Components.md).

## 3.7 Stale / misleading artifacts (do not trust)

| File | Problem |
|---|---|
| `Directory.txt` | Hand-written tree describing an **old Prisma-based structure** (`prisma/`, `Public/*.html`, `uiRoutes.js`) that no longer exists. |
| `project_tree.txt` | Flat listing referencing an `ai/*.md` docs folder and `docs/skb/*` that are **deleted** in this checkout (see git status). |

These are historical and should be ignored in favor of the live tree above (and [15 File Reference](15_Complete_File_Reference.md)).

---
[← 02 Architecture](02_Architecture.md) | [INDEX](INDEX.md) | Next: [04 Entry Point →](04_Entry_Point_And_Startup.md)
