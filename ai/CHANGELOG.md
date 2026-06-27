# Changelog

All notable changes to this project — reverse chronological order.

---

## [Unreleased] — 2026-06-26

### Security Hardening
- **KI-001**: Added rate limiting (`express-rate-limit`, 15 req/15min per IP) to `/api/auth/register` and `/api/auth/login`
- **KI-003**: Removed hardcoded JWT secret fallback; `server.js` now exits with FATAL if `JWT_SECRET` is unset
- **KI-004**: `auth_token` cookie now set with `HttpOnly` flag; frontend uses `sessionStorage` exclusively
- **KI-005**: Socket.io CORS restricted to `ALLOWED_ORIGINS` env var (defaults to `http://localhost:3000`); `credentials: true` enabled

### Privacy
- **KI-002**: Removed user email from URL query params across all pages. New shared `frontend/src/lib/auth.js` module manages session via `sessionStorage` (`saveSession`, `loadUserId`, `loadFullName`, `getToken`, `authHeaders`, `clearSession`). Updated login, dashboard, workstation, communication, and mo-risk pages.

### Cleanup
- **KI-006**: Deleted legacy `src/routes/uiRoutes.js` (151 lines, unauthenticated, unused)
- **KI-008**: Removed unused `DATABASE_URL` (PostgreSQL) from `.env`
- **KI-009**: Deleted legacy `frontend/src/app/trade/page.js` (referenced non-existent actions)
- **KI-013**: Deleted root `scratch.js` dev scratch file

### Improvements
- **KI-010**: Updated `layout.js` metadata title to `"SGB Operations Simulator | Niramay Skillomentum"`
- **KP-005**: Replaced `JSON.stringify` deep-compare with targeted field comparison in workstation `selectedTrade` sync effect

### Infrastructure
- Added `.env.example` template with all required env vars (no real secrets)

---

## [AI Knowledge Base Initialized] — 2026-06-26

### Added
- Full AI knowledge base documentation initialized for the first time:
  - `PROJECT_OVERVIEW.md`
  - `ARCHITECTURE.md`
  - `DATABASE.md`
  - `API.md`
  - `BUSINESS_RULES.md`
  - `CURRENT_PROGRESS.md`
  - `DECISIONS.md`
  - `KNOWN_ISSUES.md`
  - `TODO.md`
  - `ROADMAP.md`
  - `CHANGELOG.md`
  - `SECURITY.md`
  - `PERFORMANCE.md`
  - `CODING_STANDARDS.md`
  - `UI_GUIDELINES.md`
  - `COMPONENT_GUIDELINES.md`
  - `DEPLOYMENT.md`
  - `TESTING.md`

---

## [Prior History — Reconstructed from Source]

### Backend
- Express server with Socket.io, MongoDB Atlas, JWT authentication
- Queue Composer with graduated exponential decay DB/generated allocation
- Trade Generator V2 with desk-specific truths (MO, Confirmation, Settlement) and XML audit trails
- Full trade lifecycle engine (MO → Confirmation → Settlement)
- Amendment engine (extract, attach, apply amendments)
- CPTY AI pipeline (Gemini → Cerebras → offline fallback)
- FO AI pipeline for internal channel responses
- FO Internal Channel (separate from CPTY email threads)
- Agenda job scheduler integration
- 3-second background reply processors (CPTY, FO, FO internal)
- 2-second trade cache refresh
- Truth Engine for mismatch detection (MO and Confirmation levels)
- Conversation Engine (DB-backed email threads)
- Audit Engine (DB-backed audit logs + XML audit on trade)
- Scoring Engine (points and penalties)
- Age Calculator
- Simulation Clock

### Frontend (Next.js 16 / React 19)
- Login/Register page
- Dashboard (desk selector)
- Workstation (trade queue table, action panel, audit popup, truth viewer, CSV export)
- Communication page (full email-style mailbox with inbox/FO channel, compose, reply)
- MO Risk / Termsheet viewer
- Trade detail page (legacy)
- Session timer (client-side countdown using sessionStart/sessionExpiry)
- Simulation clock (client-side calculation, no backend clock dependency)
- Socket.io real-time trade and email notifications
- Background polling fallback (15s)
- Webpack mode forced (Turbopack disabled for Windows compatibility)

### Infrastructure
- Docker support (backend + frontend Dockerfiles)
- docker-compose configuration
- MongoDB Atlas connection with memory-only fallback
