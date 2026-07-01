content: # Architecture

> Last updated: 2026-06-27

---

## System Overview

iLabs1 is a **monorepo** with a Node.js/Express backend and a Next.js frontend. They run as separate processes (ports 3002 and 3000 respectively) and communicate via HTTP (proxied through Next.js rewrites) and WebSocket (Socket.io).

```
┌──────────────────────────────────────────────┐
│        Next.js Frontend  (Port 3000)          │
│        /frontend/src/app/                     │
│                                               │
│  Login → Dashboard → Workstation              │
│                    → Communication            │
│                    → MO Risk                  │
└────────────────────┬─────────────────────────┘
                     │  HTTP /api/* (next.config.mjs rewrites)
                     │  WebSocket /socket.io/*
                     ▼
┌──────────────────────────────────────────────┐
│        Express Backend  (Port 3002)           │
│        server.js + src/                       │
│                                               │
│  Routes → Engines → Models                   │
│  Background Intervals (3s CPTY, 3s FO,       │
│    3s FO-internal, 2s cache refresh)          │
└────────┬────────────────────────┬────────────┘
         │                        │
         ▼                        ▼
┌────────────────┐    ┌──────────────────────┐
│  MongoDB Atlas │    │  Socket.io Server    │
│  (7 collections│    │  (room-based events) │
│   via Mongoose)│    └──────────────────────┘
└────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  LLM Providers (async, fire-and-forget)    │
│  Gemini → Cerebras → offline fallback      │
└────────────────────────────────────────────┘
```

---

## Backend Architecture

### Entry Point: `server.js`

`server.js` is the single startup file. On boot it:

1. Validates `JWT_SECRET` is set — exits with `FATAL` if missing
2. Calls `connectDB()` (MongoDB Atlas via `src/db.js`)
3. Calls `startAgenda()` for scheduled jobs
4. Creates an `http.Server` wrapping the Express `app`
5. Calls `initSocket(server)` to mount Socket.io
6. Starts listening on `PORT` (default: 3002)
7. Launches 4 background loops:

| Loop | Interval | Purpose |
|------|----------|---------|
| CPTY reply processor | 3s | Delivers pending CPTY simulated replies to conversations |
| FO reply processor | 3s | Delivers pending FO simulated replies to conversations |
| FO internal channel processor | 3s | Delivers FO internal channel replies, updates `foEscalation` |
| Trade cache refresh | 2s | Rebuilds `_cachedTrades` from all assigned trades in DB |

The trade cache (`communicationEngine._cachedTrades`) is a plain object keyed by `tradeRef` that holds all currently-assigned trades. Reply processors use this cache for fast lookups instead of hitting MongoDB on every 3s tick.

### Database: `src/db.js`

- Connects to MongoDB Atlas using `MONGO_URI` env var
- On connection failure: logs error and continues in **memory-only mode** (Mongoose operations will fail gracefully at the collection level, but the server stays up)
- Exports `connectDB()` and `getIsConnected()`

### Engine Layer: `src/engine/`

All business logic lives here. Routes call engines — never the other way around. Key engines:

| Engine | Responsibility |
|--------|---------------|
| `tradeGenerator.js` | Generates trade objects with desk-specific truths, booking, XML audit |
| `queueComposer.js` | Builds 20-trade queues; graduated DB/generated allocation; session management |
| `lifecycle.js` | `LifecycleEngine` class: validates and applies status transitions via `transitions.js` |
| `transitions.js` | Pure object: maps each status to its allowed next statuses |
| `truthEngine.js` | Compares truths vs booking/economics; detects MO and Confirmation mismatches |
| `amendmentEngine.js` | Extracts, attaches, and applies trade amendments |
| `auditEngine.js` | Writes `AuditLog` entries (fire-and-forget) |
| `communicationEngine.js` | Schedules and processes CPTY/FO reply queues; holds `_cachedTrades` |
| `conversationEngine.js` | DB CRUD for `Conversation` documents (email threads) |
| `foInternalChannel.js` | Opens/writes/processes FO internal channel (`FOCommunication` docs) |
| `cptyAI.js` | Builds LLM prompt for CPTY response; calls `llmService.js` |
| `foAI.js` | Builds LLM prompt for FO internal response; calls `llmService.js` |
| `llmService.js` | Provider abstraction: Gemini → Cerebras; returns text or throws |
| `offlineResponseEngine.js` | Static fallback response selector when LLM is unavailable |
| `cptyOfflineResponses.js` | Library of static CPTY response strings |
| `foOfflineResponses.js` | Library of static FO response strings |
| `foResponseProfiles.js` | FO personality profiles driving AI context |
| `scoringEngine.js` | Awards/deducts points per action |
| `clock.js` | Simulation clock: maps real session time to 9 AM–6 PM trading day |
| `ageCalculator.js` | Calculates desk-specific trade age in days |
| `scenarioEngine.js` | Scenario generation helpers |
| `reconBreakEngine.js` | Reconciliation break logic |
| `settlementBreakEngine.js` | Settlement break logic |
| `settlementInteraction.js` | Settlement interaction handler |
| `confirmationBreakEngine.js` | Confirmation break logic |
| `reconciliation.js` | Reconciliation engine |
| `settlement.js` | Settlement logic |
| `cutoff.js` | Market cutoff logic |
| `agendaJobs.js` | Agenda job definitions for scheduled/periodic tasks |
| `dailyScheduler.js` | Daily reset/cleanup scheduler |
| `queue.js` | In-memory queue helpers (legacy; most logic now in queueComposer) |
| `queueComposer.js` | DB-backed queue builder (primary) |
| `aiParser.js` | Parses incoming user email content with AI for intent extraction |
| `errors.js` | Custom error types (`InvalidTransitionError`, etc.) |
| `socketEngine.js` | Socket.io server initialization and room management |

### Model Layer: `src/models/`

Seven Mongoose schemas — see `DATABASE.md` for full field reference.

| Model | Collection | Notes |
|-------|-----------|-------|
| `Trade.js` | `trades` | Primary entity; complex nested sub-documents |
| `User.js` | `users` | Trainee accounts |
| `Queue.js` | `queues` | Active session per user |
| `Conversation.js` | `conversations` | CPTY/FO email threads |
| `FOCommunication.js` | `focommunications` | FO internal escalation channels |
| `AuditLog.js` | `auditlogs` | Per-trade, per-action audit entries |
| `UserScore.js` | `userscores` | Points and penalties ledger |

### Route Layer: `src/routes/`

Routes are thin orchestrators: validate input → call engine → return JSON response.

| File | Mount Point | Auth | Description |
|------|------------|------|-------------|
| `authRoutes.js` | `/api/auth` | No | Register + login (rate-limited: 15 req/15min) |
| `sessionRoutes.js` | `/api/session` | Yes | Session info + logout |
| `clockRoutes.js` | `/api/clock` | No | Simulation time |
| `queueRoutes.js` | `/api/queue` | Yes | Generate queue + fetch active queue |
| `tradeRoutes.js` | `/api/trade` | Yes | Trade list (admin) + action submission |
| `conversationRoutes.js` | `/api/conversation` + `/api/conversations` | Yes | Send/resolve/fetch email threads |
| `foChannelRoutes.js` | `/api/fo-channel` | Yes | FO internal channel operations |
| `auditRoutes.js` | `/api/audit` | Yes | Fetch audit trail per trade |

### Auth Middleware: `src/middleware/auth.js`

- Reads token from `Authorization: Bearer <token>` header first, then `auth_token` cookie
- Verifies with `jsonwebtoken.verify(token, JWT_SECRET)`
- Returns 401 (no token) or 403 (invalid/expired)
- Attaches `{ userId, fullName }` to `req.user`

---

## Frontend Architecture

### Technology
- **Next.js 16.2.9** with **App Router** (`frontend/src/app/`)
- **React 19.2.4** — all pages use `"use client"` directive
- **TailwindCSS v4** for login page; inline `<style dangerouslySetInnerHTML>` for complex pages
- **socket.io-client v4.8.3** for real-time updates
- **react-hot-toast** for non-blocking notifications (replaced `alert()`)
- **js-cookie** for cookie read access (write is server-side only now)
- **Webpack mode forced** (`next dev --webpack`) — Turbopack disabled for Windows compatibility

### Proxy: `next.config.mjs`

```js
rewrites() → [
  { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
  { source: '/socket.io/:path*', destination: `${BACKEND_URL}/socket.io/:path*` }
]
```

`BACKEND_URL` defaults to `http://localhost:3002`. This means all `/api/*` calls from the frontend are relative paths — no hardcoded backend URLs in page code.

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.js` | Login + Register |
| `/dashboard` | `dashboard/page.js` | Desk selector (MO / CONFIRMATION / SETTLEMENT) |
| `/workstation` | `workstation/page.js` | Trade queue table, action panel, audit popup, truth viewer, CSV export |
| `/communication` | `communication/page.js` | Email mailbox — CPTY inbox, FO channel, compose, reply |
| `/mo-risk` | `mo-risk/page.js` | MO Termsheet / risk reference document |

Each page follows the **Suspense wrapper pattern** to comply with App Router's `useSearchParams()` requirement:

```jsx
"use client";
function XxxComponent() { /* all logic, useSearchParams(), state */ }
export default function XxxPage() {
  return <Suspense fallback={<div>Loading...</div>}><XxxComponent /></Suspense>;
}
```

### Auth Module: `frontend/src/lib/auth.js`

Centralised session helpers — all pages import from here:
- `saveSession(token, userId, fullName)` — writes `auth_token` to sessionStorage + cookie
- `loadUserId()` / `loadFullName()` / `getToken()` — reads from sessionStorage
- `authHeaders()` — returns `{ "Content-Type": "application/json", "Authorization": "Bearer <token>" }`
- `clearSession()` — removes sessionStorage keys and cookie

---

## Real-Time Architecture

Socket.io connects via `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:3002`). Each client:
1. Connects on workstation/communication mount with `auth: { token: getToken() }`
2. Emits `join_desk` with the desk name (joins `desk_<desk>` room)
3. Listens for `trade_update` → triggers silent queue refresh
4. Listens for `new_email` → triggers silent queue/inbox refresh
5. Disconnects on component unmount

Backend emits:
- `trade_update` with `{ tradeRef, currentStatus }` after every successful trade action
- `new_email` with `{ tradeRef, sender, subject, timestamp }` when a new email message arrives

---

## LLM Integration Flow

```
User action (e.g., CONFIRM_SEND_TO_CPTY)
    ↓
communicationEngine.scheduleCptyReply(trade, tradeRef, delay=4000–12000ms)
    → push to pendingReplies[]
    ↓
setInterval every 3s: communicationEngine.processReplies()
    → picks a pending reply that has passed its delay
    → calls cptyAI.generateCptyResponse(trade, conversationHistory)
        → llmService.generateText(prompt)
            → tries Gemini (google/genai)
            → on failure: tries Cerebras
            → on failure: offlineResponseEngine.getOfflineResponse()
    → saves reply to Conversation via conversationEngine.createMessage()
    → emits socket new_email event
    → updates Trade in DB (cptyResponseReceived, pendingAmendments)
```

FO AI follows the same flow via `processFOReplies()` and `foAI.generateFOResponse()`.

FO internal channel replies go through `foInternalChannel.processFOInternalReplies()` and update `foEscalation` on the trade document.

---

## Background Process Architecture

`server.js` runs 4 persistent `setInterval` loops after startup:

```
Every 2000ms: Trade Cache Refresh
  Trade.find({ assignedTo: { $ne: null } }).lean()
  → rebuilds communicationEngine._cachedTrades as { [tradeRef]: trade }

Every 3000ms: CPTY Reply Processor
  communicationEngine.processReplies(conversationEngine, cacheLookup, tradeUpdater)

Every 3000ms: FO Reply Processor
  communicationEngine.processFOReplies(conversationEngine, cacheLookup, tradeUpdater)

Every 3000ms: FO Internal Channel Processor
  foInternalChannel.processFOInternalReplies(tradeUpdater)
```

**Important**: `pendingReplies` arrays are **in-memory only** — they are lost on server restart. Any reply scheduled within a 4–12s window will be dropped if the process restarts. See `KNOWN_ISSUES.md` KI-007.

---

## Deployment Architecture

```
docker-compose.yml
├── backend service  (Dockerfile at root)
│   └── port 3002 exposed
└── frontend service  (frontend/Dockerfile)
    └── port 3000 exposed
```

For local development, backend and frontend run independently with `npm run dev`. See `DEPLOYMENT.md` for full setup instructions.
 file_path: /workspace/ilabs1/ai/ARCHITECTURE.md