# Architecture

> System architecture overview of the SGB Operations Simulator.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose                               │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │   Frontend   │   │     Backend      │   │     MongoDB      │   │
│  │  (Next.js)   │◄─►│   (Express 5)    │◄─►│   (Mongoose 9)   │   │
│  │  Port 3000   │   │    Port 3002     │   │    Port 27017    │   │
│  └──────┬───────┘   └──────┬───────────┘   └──────────────────┘   │
│         │                  │                                        │
│         │    Socket.io     │    Agenda                              │
│         ├─────────────────►│    (Job Scheduler)                     │
│         │                  │                                        │
│         │    HTTP REST     │    LLM APIs                            │
│         ├─────────────────►│────► Gemini / OpenRouter / Cerebras    │
│         │                  │                                        │
└─────────┴──────────────────┴────────────────────────────────────────┘
```

---

## 2. Backend Architecture

### 2.1 Layered Design

```
Request Flow:

  HTTP Request
      │
      ▼
  ┌─────────────┐
  │  Express     │  Routes (src/routes/)
  │  Router      │  → 13 route modules
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Middleware  │  authenticateToken (JWT)
  │  Chain       │  rate limiting
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Engine     │  Business logic (src/engine/)
  │  Layer      │  → 37 engine modules
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Data Layer │  Mongoose Models (src/models/)
  │             │  → 11 collections
  └──────┬──────┘
         │
         ▼
     MongoDB
```

### 2.2 Route Modules

| Prefix | File | Description |
|--------|------|-------------|
| `/api/auth` | `authRoutes.js` | Login, Register |
| `/api/session` | `sessionRoutes.js` | Session info, Logout |
| `/api/clock` | `clockRoutes.js` | Simulated market clock |
| `/api/queue` | `queueRoutes.js` | Queue generation, user queue |
| `/api/trade` | `tradeRoutes.js` | Trade actions (core state machine) |
| `/api/conversation` | `conversationRoutes.js` | Personal inbox, send, resolve |
| `/api/conversations` | `conversationRoutes.js` | Shared inbox |
| `/api/fo-channel` | `foChannelRoutes.js` | FO internal channel |
| `/api/audit` | `auditRoutes.js` | Audit trail per trade |
| `/api/settlement` | `settlementRoutes.js` | Amend, approve, settle |
| `/api/system-mailbox` | `systemMailboxRoutes.js` | System notification mailbox |
| `/api/ssi` | `ssiRoutes.js` | SSI code lookup |
| `/api/chat` | `chatRoutes.js` | AI Tutor chat |

### 2.3 Engine Modules (37 total)

#### Lifecycle & State Machine
| Module | Purpose |
|--------|---------|
| `transitions.js` | Trade state machine (valid transitions per status) |
| `lifecycle.js` | High-level lifecycle orchestration |
| `lifecycleErrors.js` | Error handling for lifecycle operations |

#### Trade Generation
| Module | Purpose |
|--------|---------|
| `tradeGenerator.js` | Generates realistic trades with desk-specific truths and breaks |
| `scenarioEngine.js` | Scenario-based trade generation logic |
| `queue.js` | Queue data structures and management |

#### Queue & Session
| Module | Purpose |
|--------|---------|
| `queueComposer.js` | Composes trade queues for user sessions |

#### Clock & Scheduling
| Module | Purpose |
|--------|---------|
| `clock.js` | Simulated market clock (starts on queue generation) |
| `cutoff.js` | Value date cutoff logic |
| `ageCalculator.js` | Trade age tracking for SLA monitoring |
| `dailyScheduler.js` | Daily scheduled tasks |
| `agendaJobs.js` | Agenda (MongoDB-backed) job definitions |

#### Communication
| Module | Purpose |
|--------|---------|
| `communicationEngine.js` | Processes CPTY and FO replies with AI generation |
| `conversationEngine.js` | Conversation CRUD operations |
| `foInternalChannel.js` | FO internal escalation channel |
| `aiParser.js` | Parses AI-generated responses for structured actions |
| `foAI.js` | FO AI persona (Gemini-powered) |
| `cptyAI.js` | CPTY AI persona for general trades |
| `cptySettlementAI.js` | CPTY AI persona for settlement-specific queries |
| `offlineResponseEngine.js` | Offline fallback when LLM is unavailable |
| `tutorAI.js` | AI Tutor persona (Gemini-powered) |
| `llmService.js` | Unified LLM service (Gemini / OpenRouter / Cerebras / Groq) |

#### Settlement
| Module | Purpose |
|--------|---------|
| `systemWorkflowEngine.js` | System bot: amendment processing, verification, approval |
| `settlement.js` | Settlement operations |
| `settlementBreakEngine.js` | Settlement break detection and handling |
| `settlementInteraction.js` | Settlement desk interaction logic |

#### Reconciliation
| Module | Purpose |
|--------|---------|
| `reconciliation.js` | Post-settlement reconciliation |
| `reconBreakEngine.js` | Reconciliation break handling |

#### Other
| Module | Purpose |
|--------|---------|
| `confirmation.js` | Confirmation desk operations |
| `amendments.js` | Amendment tracking and history |
| `truthEngine.js` | Desk-specific truth management |
| `auditEngine.js` | Audit trail generation |
| `scoring.js` | User performance scoring |
| `socketEngine.js` | Socket.io server setup and room management |

---

## 3. Frontend Architecture

### 3.1 App Router Structure

```
frontend/src/app/
├── layout.js              # Root layout (fonts, Toaster)
├── page.js                # Login / Register
├── globals.css            # Tailwind v4 imports + theme
├── dashboard/
│   └── page.js            # Desk selection
├── workstation/
│   └── page.js            # Main trade queue workstation
├── communication/
│   ├── page.js            # 3-panel email client
│   ├── page.css           # Outlook-style design system
│   └── components/
│       ├── FolderNav.js    # Folder sidebar
│       ├── InboxList.js    # Email list panel
│       ├── MessageThread.js # Reading pane
│       ├── ComposeModal.js # New email modal
│       ├── ReplyModal.js   # Reply modal
│       └── utils.js        # Formatting utilities
├── mo-risk/
│   └── page.js            # MO Risk / Termsheet viewer
└── ssi-database/
    └── page.js            # SSI code lookup

frontend/src/components/
├── InstructionPanel.js     # Desk-specific SOP instructions
├── TutorialPanel.js       # AI Tutor chatbot widget
└── instructionsData.js     # Static desk instruction data

frontend/src/lib/
└── auth.js                 # Session/token utilities
```

### 3.2 State Management

No global state library. Each page manages its own state:

| Mechanism | Storage | Keys |
|-----------|---------|------|
| `sessionStorage` | Browser | `auth_token`, `userId`, `fullName`, `justLoggedIn` |
| `useState` | Component-local | Per-page state |
| `useRef` | Component-local | Socket refs, stale closure avoidance |
| `useCallback` | Component-local | Memoized data-loading functions |

### 3.3 Real-Time Communication

| Page | Socket Events |
|------|---------------|
| Workstation | `join_desk`, `trade_update`, `new_email` |
| Communication | `join_desk`, `new_email`, `new_system_mail` |
| All | 15s/5s polling fallback |

---

## 4. Data Architecture

### 4.1 MongoDB Collections (11)

| Collection | Model | Purpose |
|------------|-------|---------|
| `trades` | `Trade` | Core trade records with desk-specific truths |
| `users` | `User` | User accounts (email, password, fullName) |
| `queues` | `Queue` | Per-user trade queue assignments |
| `conversations` | `Conversation` | Email threads (personal + shared) |
| `focommunications` | `FOCommunication` | FO internal channel messages |
| `pendingreplies` | `PendingReply` | LLM reply queue (survives restart) |
| `systemjobs` | `SystemJob` | Scheduled amendment/verification jobs |
| `systemmails` | `SystemMail` | System notification mailbox |
| `auditlogs` | `AuditLog` | Per-trade audit trail |
| `userscores` | `UserScore` | User performance scores |
| `systemconfigs` | `SystemConfig` | System-wide configuration |

### 4.2 In-Memory State (Backend)

| Store | Location | Purpose |
|-------|----------|---------|
| `_cachedTrades` | `communicationEngine` | Cached assigned trades for reply processing |
| Socket rooms | `socketEngine` | Desk-based room subscriptions |
| LLM response cache | `llmService` | Cached LLM responses |

---

## 5. Background Processors (Server.js)

| Interval | Processor | Purpose |
|----------|-----------|---------|
| 2s | Cache refresh | Reloads assigned trades into memory |
| 3s | Communication reply processor | Processes pending CPTY replies (AI-generated) |
| 3s | FO reply processor | Processes pending FO replies |
| 3s | FO internal channel processor | Processes FO internal escalations |
| 3s | System workflow processor | Processes amendment and verification jobs |
| Variable | Agenda jobs | Cron-like scheduled tasks (daily) |

---

## 6. External Integrations

| Integration | Direction | Purpose |
|-------------|-----------|---------|
| Google Gemini API | Outbound | CPTY AI, FO AI, AI Tutor responses |
| OpenRouter API | Outbound | Fallback LLM provider |
| Cerebras API | Outbound | Alternative LLM provider |
| Groq API | Outbound | Alternative LLM provider |

---

## 7. Deployment Topology

```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │  Frontend  │  │  Backend   │  │    MongoDB     │ │
│  │  :3001     │──│  :3002     │──│    :27017      │ │
│  │            │  │            │  │                │ │
│  └────────────┘  └─────┬──────┘  └────────────────┘ │
│                       │                              │
│                       │  External APIs               │
│                       ├───── Gemini                   │
│                       ├───── OpenRouter               │
│                       ├───── Cerebras                 │
│                       └───── Groq                     │
└─────────────────────────────────────────────────────┘
```
