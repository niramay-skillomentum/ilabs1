content: # Changelog

All notable changes — reverse chronological order.

---

## [Unreleased] — 2026-06-29

### Fixed
- **Confirmation Desk Constraints**: Enforced action validation checks on frontend UI buttons ("Send to CPTY" and "Escalate to FO"). `CONFIRM_TRADE` now strictly requires `LIASING_WITH_CPTY` state, and "Escalate to FO" requires the user to manually trigger "Confirmation Break" first.
- **FO Escalation State Bug**: Fixed `server.js` background polling loop improperly forcing `CONFIRMATION_BREAK` on all internal FO replies. Trades now correctly remain in `LIASING_WITH_FO` when FO replies with "Our records match".
- **Proactive Email Generation**: Fixed `tradeGenerator.js` to correctly route `trade.truths.confirmation` discrepancy data instead of universal truths to the proactive Counterparty emails.
- **Email Template Rendering**: Corrected `buySell` typo to `direction` in the frontend confirmation email template, ensuring correct rendering of trade direction.
- **Pending Replies Persistence (KI-007)**: Moved in-memory LLM reply queues for CPTY emails, FO emails, and FO Internal Chat to a MongoDB `PendingReply` collection. Delayed responses now successfully survive server restarts.
- **Security & Quality Enhancements**:
  - **(KI-016)**: Added conditional `Secure` flag to `auth_token` cookie when running in production.
  - **(KI-017)**: Integrated `sanitize-html` into `conversationEngine.js` to proactively strip malicious `<script>` tags and XSS payloads from all AI and user-generated email bodies before they reach the frontend.
  - **(KI-011)**: Introduced the foundational frontend testing suite with Jest & React Testing Library (RTL), featuring component rendering validation for the `Workstation` dashboard.
  - **(KI-012)**: Introduced the backend integration test suite with Supertest, validating core Trade Action endpoints (e.g. `CONFIRM_TRADE`) against state machine constraints.

---

## [Security Hardening Batch] — 2026-06-26

A complete security hardening pass resolving all known high and medium priority security issues.

### Fixed
- **KI-001** | Auth rate limiting: Added `express-rate-limit` (15 req / 15 min per IP) to `POST /api/auth/register` and `POST /api/auth/login`
- **KI-003** | JWT secret: Removed hardcoded fallback from `src/middleware/auth.js`. `server.js` now exits with `FATAL` error at startup if `JWT_SECRET` is unset
- **KI-004** | HttpOnly cookie: `auth_token` now set with `HttpOnly` flag. Frontend switched to `sessionStorage` exclusively via new `frontend/src/lib/auth.js` module
- **KI-005** | Socket.io CORS: Restricted origin to `ALLOWED_ORIGINS` env var (defaults to `http://localhost:3000`); `credentials: true` enabled

### Removed
- **KI-006** | Deleted `src/routes/uiRoutes.js` — 151 lines of legacy, unauthenticated, in-memory v1 routes not used anywhere
- **KI-008** | Removed `DATABASE_URL` (PostgreSQL legacy) from `.env`
- **KI-009** | Deleted `frontend/src/app/trade/page.js` — legacy page using non-existent API actions
- **KI-013** | Deleted `scratch.js` from repo root

### Changed
- **KI-002** | Privacy: Email no longer appears in URL query params. New shared module `frontend/src/lib/auth.js` provides `saveSession()`, `loadUserId()`, `loadFullName()`, `getToken()`, `authHeaders()`, `clearSession()`. All five pages (login, dashboard, workstation, communication, mo-risk) updated.
- **KI-010** | Metadata: `frontend/src/app/layout.js` title updated to `"SGB Operations Simulator | Niramay Skillomentum"`
- **KI-014** | UX: Replaced all `alert()` and `window.alert()` calls in workstation page with `react-hot-toast` notifications (`react-hot-toast` dependency added)
- **KP-005** | Performance: Replaced `JSON.stringify(updatedTrade) !== JSON.stringify(selectedTrade)` deep-compare in workstation `useEffect` with targeted field comparison on `currentStatus` and `pendingAmendments`

### Added
- `.env.example` — template file documenting all required environment variables with no real secrets

---

## [AI Knowledge Base Initialized] — 2026-06-26

### Added
Full `ai/` documentation directory created with 18 markdown files covering architecture, API, business rules, database schema, coding standards, deployment, security, testing, performance, decisions, and roadmap.

---

## [Prior History — Reconstructed from Source]

### Backend (Node.js + Express + MongoDB)
- Express v5 server bootstrapped with Socket.io v4, JWT auth, bcrypt password hashing
- MongoDB Atlas connection with memory-only fallback mode
- **Queue Composer V2** — `QueueComposer` class with graduated exponential-decay DB/generated allocation (`20 * (1 - e^(-0.003 * pool))`)
- **Trade Generator V2** — desk-specific truths (mo, confirmation, settlement, universal), three-scenario truth distribution (40% clean / 30% FO error / 30% CPTY error), XML audit trail generation
- **Trade Lifecycle Engine** — `LifecycleEngine` class with `transitions.js` state machine; all MO / Confirmation / Settlement statuses and valid transitions
- **Amendment Engine** — extract amendments from AI responses, attach to trade, apply on accept
- **Truth Engine** — `getMismatchFields()` for universal comparison, `getConfirmationMismatches()` for CPTY level
- **CPTY AI Pipeline** — `cptyAI.js` → `llmService.js` (Gemini → Cerebras) → `offlineResponseEngine.js`
- **FO AI Pipeline** — `foAI.js` → `llmService.js` → offline fallback
- **FO Internal Channel** — `FOCommunication` model, separate from CPTY email threads
- **Conversation Engine** — `Conversation` model, CPTY/FO thread CRUD
- **Audit Engine** — `AuditLog` model, fire-and-forget logging, XML content storage
- **Scoring Engine** — points and penalties per action in `UserScore` collection
- **Age Calculator** — desk-specific trade age calculation
- **Simulation Clock** — maps real session elapsed time to 9 AM–6 PM trading day
- **Agenda** job scheduler for periodic/scheduled background tasks
- **Background processors** — three `setInterval(3s)` loops for CPTY, FO, and FO internal replies
- **Trade cache** — `setInterval(2s)` rebuilding `_cachedTrades` for fast reply processing
- Session management — `Queue` model with `isActive`, `sessionExpiry`, `lastActivity`

### Frontend (Next.js 16 + React 19)
- Login/Register page with JWT-based auth
- Dashboard — desk selector
- Workstation — trade queue table, action panel, audit popup (XML + structured), truth viewer, CSV export, session timer, simulation clock
- Communication — full email mailbox with CPTY inbox, FO internal channel, compose, reply
- MO Risk / Termsheet reference viewer
- Socket.io real-time trade and email notifications
- Background 15s polling fallback for queue refresh
- Webpack mode forced (`next dev --webpack`) — Turbopack disabled for Windows compatibility
- `react-hot-toast` for non-blocking notifications

### Infrastructure
- Docker — `Dockerfile` (backend) and `frontend/Dockerfile`
- `docker-compose.yml` — orchestrates both services
- MongoDB Atlas with SSL/TLS replica set connection
 file_path: /workspace/ilabs1/ai/CHANGELOG.md