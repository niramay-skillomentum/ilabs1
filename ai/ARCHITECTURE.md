# Architecture

## System Overview

iLabs1 is a **full-stack monorepo** consisting of:

- `server.js` + `src/` — Node.js/Express backend
- `frontend/` — Next.js 16 frontend (App Router)
- MongoDB Atlas — Cloud-hosted database
- Socket.io — Real-time bidirectional events

```
┌─────────────────────────────────┐
│   Next.js Frontend (Port 3000)  │
│   /frontend/src/app/            │
└───────────────┬─────────────────┘
                │  HTTP (rewrites via next.config.mjs)
                │  WebSocket (socket.io-client)
                ▼
┌─────────────────────────────────┐
│   Express Backend (Port 3002)   │
│   server.js + src/routes/       │
└──────┬──────────────────────────┘
       │                  │
       ▼                  ▼
┌──────────────┐  ┌──────────────────────┐
│  MongoDB     │  │  Socket.io Server    │
│  Atlas       │  │  (real-time events)  │
└──────────────┘  └──────────────────────┘
```

---

## Backend Architecture

### Entry Point: `server.js`
- Initializes Express app on port `3002` (configurable via `PORT` env var)
- Connects to MongoDB via `src/db.js`
- Starts Agenda job scheduler
- Initializes Socket.io via `socketEngine`
- Registers all API route groups
- Runs 3 background `setInterval` loops (every 3s) for:
  - CPTY reply processing
  - FO reply processing
  - FO internal channel reply processing
- Runs a 2s cache refresh loop for `_cachedTrades` (assigned trades)

### Database Connection: `src/db.js`
- Connects to MongoDB Atlas using `MONGO_URI` env var
- Gracefully degrades to memory-only mode if connection fails
- Exports `connectDB()` and `getIsConnected()`

### Folder Structure

```
src/
├── db.js                    # MongoDB connection
├── engine/                  # Core business logic engines
│   ├── ageCalculator.js     # Trade age computation
│   ├── agendaJobs.js        # Scheduled jobs (Agenda)
│   ├── aiParser.js          # Parse email content with AI
│   ├── amendmentEngine.js   # Apply/extract trade amendments
│   ├── auditEngine.js       # Record and fetch audit events
│   ├── clock.js             # Simulation clock
│   ├── communicationEngine.js # CPTY/FO reply scheduling & processing
│   ├── confirmationBreakEngine.js  # Confirmation break logic
│   ├── conversationEngine.js  # Conversation DB operations
│   ├── cptyAI.js            # AI-powered counterparty response generator
│   ├── cptyOfflineResponses.js  # Static CPTY response library
│   ├── cutoff.js            # Market cutoff logic
│   ├── dailyScheduler.js    # Daily job scheduler
│   ├── errors.js            # Custom error types
│   ├── foAI.js              # AI-powered FO response generator
│   ├── foInternalChannel.js # FO internal escalation channel
│   ├── foOfflineResponses.js # Static FO response library
│   ├── foResponseProfiles.js # FO personality/response profiles
│   ├── lifecycle.js         # Trade status transition engine
│   ├── llmService.js        # LLM provider abstraction
│   ├── offlineResponseEngine.js # Fallback offline response engine
│   ├── queue.js             # In-memory queue helpers
│   ├── queueComposer.js     # DB-backed queue builder (20 trades)
│   ├── reconBreakEngine.js  # Reconciliation break logic
│   ├── reconciliation.js    # Reconciliation engine
│   ├── scenarioEngine.js    # Scenario generation
│   ├── scoringEngine.js     # User scoring/penalties
│   ├── settlement.js        # Settlement logic
│   ├── settlementBreakEngine.js  # Settlement break logic
│   ├── settlementInteraction.js  # Settlement interaction handler
│   ├── socketEngine.js      # Socket.io server initialization
│   ├── tradeGenerator.js    # Trade/break generation with truths
│   ├── transitions.js       # State machine transitions
│   └── truthEngine.js       # Truth comparison & mismatch detection
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── AuditLog.js          # Audit log schema
│   ├── Conversation.js      # Email conversation thread schema
│   ├── FOCommunication.js   # FO internal channel schema
│   ├── Queue.js             # User session queue schema
│   ├── Trade.js             # Trade schema (main entity)
│   ├── User.js              # User account schema
│   └── UserScore.js         # User scoring schema
└── routes/
    ├── auditRoutes.js       # GET /api/audit/:tradeRef
    ├── authRoutes.js        # POST /api/auth/register, /login
    ├── clockRoutes.js       # GET /api/clock
    ├── conversationRoutes.js # GET/POST /api/conversation(s)/*
    ├── foChannelRoutes.js   # GET/POST /api/fo-channel/*
    ├── queueRoutes.js       # POST/GET /api/queue/*
    ├── sessionRoutes.js     # GET /api/session/info, POST /logout
    ├── tradeRoutes.js       # GET/POST /api/trade/*
    └── uiRoutes.js          # Legacy UI routes (deprecated — do not use)
```

---

## Frontend Architecture

### Technology
- **Next.js 16** with **App Router**
- **React 19**
- **TailwindCSS v4** (via `@tailwindcss/postcss`)
- **js-cookie** for cookie management
- **socket.io-client** for real-time updates

### Proxy Configuration (`next.config.mjs`)
All `/api/*` and `/socket.io/*` requests are proxied to the backend at `http://localhost:3002` (configurable via `NEXT_PUBLIC_BACKEND_URL` or `BACKEND_URL` env vars).

### Pages (`frontend/src/app/`)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `page.js` | Login / Register |
| `/dashboard` | `dashboard/page.js` | Desk selector (MO/CONFIRMATION/SETTLEMENT) |
| `/workstation` | `workstation/page.js` | Main trade queue view and action panel |
| `/communication` | `communication/page.js` | Email mailbox (CPTY & FO threads) |
| `/trade` | `trade/page.js` | Single trade detail view (legacy, rarely used) |
| `/mo-risk` | `mo-risk/page.js` | MO Termsheet / risk reference view |

### Auth Flow
1. Login POSTs to `/api/auth/login`
2. Backend returns JWT + sets `auth_token` cookie
3. Frontend stores token in `sessionStorage` AND `js-cookie`
4. All API calls include `Authorization: Bearer <token>` header
5. Middleware verifies JWT on every protected route

---

## Real-Time Architecture

### Socket.io Events
- `join_desk` — client joins desk room (`desk_MO`, `desk_CONFIRMATION`, etc.)
- `trade_update` — broadcast when a trade changes status
- `new_email` — broadcast when new email/message arrives
- `user_<userId>` room — targeted notifications per user

---

## Background Processing

Three `setInterval` loops run in `server.js`:
1. **CPTY Reply Processor** (3s) — delivers scheduled CPTY responses
2. **FO Reply Processor** (3s) — delivers scheduled FO responses
3. **FO Internal Channel Processor** (3s) — delivers FO internal escalation replies
4. **Cache Refresh** (2s) — refreshes `_cachedTrades` from DB for fast in-memory lookup

---

## LLM Integration

Provider chain (via `src/engine/llmService.js`):
1. **Google Gemini** (primary, `@google/genai`)
2. **Cerebras** (secondary, `@cerebras/cerebras_cloud_sdk`)
3. **Groq** (tertiary, commented out in `.env`)

Used for:
- Generating contextual counterparty email responses (`cptyAI.js`)
- Generating FO internal responses (`foAI.js`)
- Parsing user email content (`aiParser.js`)
- Falling back to `offlineResponseEngine.js` / static responses when LLM unavailable

---

## Deployment

- **Backend**: Docker (`Dockerfile` at root)
- **Frontend**: Docker (`frontend/Dockerfile`)
- **Orchestration**: `docker-compose.yml` at root
- **Local Dev**:
  - Backend: `npm run dev` (nodemon, port 3002)
  - Frontend: `npm run dev` (Next.js webpack mode, port 3000)
