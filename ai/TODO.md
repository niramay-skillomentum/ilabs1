# TODO

> Last updated: 2026-06-26

## 🔴 Critical (Bugs / Blocking)

- [x] **KI-001** Add rate limiting to auth endpoints (`/register`, `/login`)
- [x] **KI-002** Remove user email from URL query params — use opaque session refs
- [x] **KI-003** Remove JWT secret hardcoded fallback

## 🟡 Important (Security / Quality)

- [x] **KI-004** Make `auth_token` cookie HttpOnly + Secure
- [x] **KI-005** Restrict Socket.io CORS to known origins
- [x] **KI-006** Delete `src/routes/uiRoutes.js` (legacy, unauthenticated, unused)
- [ ] **KI-007** Persist CPTY/FO reply queue to DB (or migrate to Agenda) — currently lost on restart
- [x] **KI-008** Remove unused `DATABASE_URL` (PostgreSQL) from `.env`

## 🟢 Improvements (UX / Code Quality)

- [x] **KI-009** Fix or remove `frontend/src/app/trade/page.js` — uses non-existent actions
- [x] **KI-010** Update `layout.js` metadata title and description
- [ ] **KI-011** Write frontend component tests
- [ ] **KI-012** Write backend integration tests for queue, trade actions, conversations
- [x] **KI-013** Delete `scratch.js` from root
- [x] **KI-014** Replace `alert()` / `window.alert()` with toast notification system
- [ ] **KI-015** Decompose `communication/page.js` (855 lines) into sub-components

## 🚀 New Features

### Scoring & Results
- [ ] Build scoring summary page (post-session results)
- [ ] Show leaderboard / ranking across users
- [ ] Score breakdown by trade and action

### Admin / Trainer
- [ ] Trainer admin dashboard (view all users, sessions, scores)
- [ ] Session replay mode (review what a user did)
- [ ] Admin: manually generate/seed trades to DB pool

### User Experience
- [ ] Loading states on all async operations (currently instant or alert())
- [ ] Trade status history / timeline view in workstation
- [ ] Inline help / glossary for ops terminology
- [ ] Mobile-responsive workstation layout

### Technical Debt
- [ ] Migrate legacy in-memory engines to DB-backed equivalents (`queue.js`, `lifecycle.js` old versions)
- [ ] Consolidate duplicate route definitions (`/api/conversation` and `/api/conversations` both registered)
- [ ] Add TypeScript / JSDoc to engine files
- [ ] Production nginx reverse proxy config
- [ ] GitHub Actions CI/CD pipeline

### Infrastructure
- [x] `.env.example` file with all required variables (no secrets)
- [ ] Health check endpoint (`GET /health`)
- [ ] Graceful shutdown handler (process `SIGTERM`)
- [ ] Log aggregation (currently `console.log` only)
