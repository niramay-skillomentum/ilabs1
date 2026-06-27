content: # Roadmap

> Last updated: 2026-06-27

---

## Phase 1 — Core Simulation ✅ COMPLETE

**Milestone**: A trainee can log in, generate a queue, process all trade types, communicate with simulated FO/CPTY, and have their actions audited.

### Delivered
- [x] Authentication — register, login, JWT, HttpOnly cookies
- [x] Session management — 3-hour sessions, expiry tracking, auto-logout
- [x] Queue generation — 20 trades (12 clean + 8 break), graduated DB allocation
- [x] Trade lifecycle — MO → Confirmation → Settlement full state machine
- [x] MO break detection and validation workflow (raise break, contact FO, resolve, validate pass)
- [x] Confirmation break workflow — CPTY disputes, FO escalation, amendment engine, concession logic
- [x] Settlement workflow — approve, raise break, follow-up CPTY
- [x] Email/conversation system — CPTY + FO threads, DB-backed, shared inbox + personal
- [x] FO internal escalation channel (separate from CPTY email)
- [x] AI-powered CPTY and FO responses (Gemini → Cerebras → offline fallback)
- [x] Audit trail — XML auto-generated + structured `AuditLog` per action
- [x] Simulation clock — 3-hour session mapped to 9 AM–6 PM trading day
- [x] Real-time updates — Socket.io `trade_update` + `new_email` events
- [x] Amendment workflow — raise, extract, attach, approve, apply
- [x] Scoring engine — points/penalties backend logic
- [x] Truth engine — MO and Confirmation level mismatch detection
- [x] Security hardening — rate limiting, HttpOnly cookies, JWT validation, CORS, privacy fixes
- [x] Docker support — backend + frontend Dockerfiles + docker-compose

---

## Phase 2 — Assessment & Reporting 🚧 NEXT

**Milestone**: Trainers can measure and review trainee performance.

### To Build
- [ ] Score summary page (`/results`) — per-session breakdown of points, penalties, trades resolved
- [ ] Per-trade action breakdown — correct/incorrect decisions with explanations
- [ ] Leaderboard — ranked view across all users (`GET /api/scores/leaderboard`)
- [ ] Admin login — RBAC to separate trainer and trainee roles
- [ ] Admin dashboard — view all active sessions, user list, scores, trade pool status
- [ ] Session replay mode — step through every action a trainee took, in order

---

## Phase 3 — User Experience Polish 📋 PLANNED

**Milestone**: The platform feels production-grade for real training cohorts.

### To Build
- [ ] Loading states on all async operations (queue generation, action submission, email send)
- [ ] Trade status history / timeline in workstation action panel
- [ ] Inline ops glossary — hover tooltips on trade fields, actions, and statuses
- [ ] Mobile-responsive workstation layout
- [ ] Dark mode for workstation and communication pages
- [ ] Decompose `communication/page.js` into sub-components (KI-015)
- [ ] Error boundary components for graceful UI error handling

---

## Phase 4 — Infrastructure & Reliability 📋 PLANNED

**Milestone**: Platform is stable enough for production deployment and horizontal scaling.

### To Build
- [ ] Persist CPTY/FO pending reply queue to MongoDB (KI-007) — replies survive server restart
- [ ] `GET /health` endpoint — returns `{ status, db, uptime, version }`
- [ ] Graceful shutdown — `process.on("SIGTERM")` → drain connections → close server → close DB
- [ ] Structured JSON logging — replace `console.log` with `pino` or `winston`
- [ ] Targeted trade cache invalidation — replace full 2s rebuild (KP-004)
- [ ] Recommended MongoDB indexes added (compound indexes for pool queries)
- [ ] Fix `GET /api/trade/all` pagination (KP-002)
- [ ] Fix conversation shared inbox N+1 (KP-001)
- [ ] GitHub Actions CI/CD — test → build → push Docker images on `main` push

---

## Phase 5 — Testing Coverage 📋 PLANNED

**Milestone**: Comprehensive test coverage gives confidence when refactoring.

### To Build
- [ ] Backend: integration tests for all route groups (queue, trade, conversation, FO channel, session)
- [ ] Backend: unit tests for all core engines (truthEngine, amendmentEngine, queueComposer, lifecycle, tradeGenerator, clock)
- [ ] Frontend: component tests for Login, Dashboard, Workstation, Communication
- [ ] E2E tests with Playwright — full happy-path and break workflow flows
- [ ] Load testing — simulate 50 concurrent users generating queues and submitting actions
- [ ] Separate test MongoDB database (`MONGO_URI_TEST`) for CI isolation

---

## Phase 6 — Advanced Simulation 💡 FUTURE

**Milestone**: Richer, more sophisticated scenarios for advanced trainees.

### Ideas
- [ ] Multi-round FO/CPTY negotiation (more than 2 rounds of back-and-forth)
- [ ] Scenario packs — themed queues (rate spike day, counterparty default, T+1 cutoff pressure)
- [ ] Market events that affect trades in real-time during a session
- [ ] Configurable difficulty — easy (fewer breaks, helpful AI) / realistic (current) / expert (more breaks, ambiguous responses)
- [ ] Timed pressure events — urgent trade approaching market cutoff
- [ ] Configurable break ratios per session
- [ ] Assessment mode — time pressure with scoring penalizing slow resolution

---

## Phase 7 — Multi-Desk & Advanced Features 💡 FUTURE

**Milestone**: Simulate a full ops floor, not just one desk.

### Ideas
- [ ] Multi-desk simultaneous mode — user rotates across MO, Confirmation, Settlement in one session
- [ ] Inter-desk communication — MO passes a note to Confirmation visible to both desks
- [ ] Trainer-controlled live simulation — trainer can inject breaks or events during a session
- [ ] API integrations — push final results to an LMS or HR system
- [ ] Custom trade packs — trainers upload real (anonymized) trade data for simulation
 file_path: /workspace/ilabs1/ai/ROADMAP.md