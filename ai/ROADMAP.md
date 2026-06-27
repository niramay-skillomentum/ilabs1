# Roadmap

> Last updated: 2026-06-26

## Phase 1 — Core Simulation (✅ COMPLETE)

Milestone: A trainee can log in, generate a queue, process trades, and communicate with simulated FO/CPTY.

- [x] Authentication (register/login/logout)
- [x] Queue generation (20 trades, 3-desk support)
- [x] Trade lifecycle (MO → Confirmation → Settlement)
- [x] MO break detection and validation workflow
- [x] Confirmation break workflow (CPTY disputes, FO escalation)
- [x] Settlement workflow (approve, break, follow-up)
- [x] Email/conversation system (CPTY + FO threads)
- [x] FO internal channel
- [x] AI-powered CPTY and FO responses
- [x] Audit trail (XML + structured)
- [x] Simulation clock (3-hour session)
- [x] Real-time updates (Socket.io)
- [x] Session management (expiry, touch)
- [x] Amendment workflow (raise, attach, approve, apply)
- [x] Scoring engine (backend only)

---

## Phase 2 — Assessment & Reporting (🚧 NEXT)

Milestone: Trainers can measure and review trainee performance.

- [ ] Scoring results page (per-session summary)
- [ ] Score breakdown by trade and action quality
- [ ] Leaderboard across all users
- [ ] Admin dashboard (trainer login, view all sessions/scores)
- [ ] Session replay / trade-by-trade review

**Estimated scope**: Medium (3–5 days)

---

## Phase 3 — User Experience Polish (📋 PLANNED)

Milestone: The platform feels production-grade and trainee-friendly.

- [ ] Replace `alert()` with toast notifications
- [ ] Remove email from URL query params (privacy)
- [ ] Loading states on all async actions
- [ ] Mobile-responsive workstation layout
- [ ] Trade timeline view (status history)
- [ ] Inline ops glossary / help tooltips
- [ ] Dark mode for workstation
- [ ] Branded layout metadata

**Estimated scope**: Medium (4–6 days)

---

## Phase 4 — Security Hardening (📋 PLANNED)

Milestone: Platform is safe for external deployment.

- [ ] Rate limiting on auth endpoints
- [ ] HttpOnly + Secure cookies
- [ ] Remove hardcoded JWT fallback
- [ ] Restrict Socket.io CORS
- [ ] Input sanitization (email body XSS prevention)
- [ ] `.env.example` + secrets documentation
- [ ] Secure production deployment (HTTPS, nginx)

**Estimated scope**: Small (1–2 days)

---

## Phase 5 — Advanced Simulation (💡 FUTURE)

Milestone: Richer, more sophisticated simulation scenarios.

- [ ] Multi-round FO/CPTY negotiation (>2 rounds)
- [ ] Scenario packs (themed: rate spike, counterparty default, settlement fail)
- [ ] Market events that affect trades in real-time
- [ ] Different difficulty levels (easy / realistic / expert)
- [ ] Timer-based pressure events (urgent trade nearing cutoff)
- [ ] Configurable break ratios per session
- [ ] Timed assessment mode (scoring penalizes slow resolution)

**Estimated scope**: Large (2–4 weeks)

---

## Phase 6 — Infrastructure & Ops (💡 FUTURE)

Milestone: Production-grade DevOps.

- [ ] CI/CD with GitHub Actions
- [ ] Staging environment
- [ ] Log aggregation (structured JSON logs)
- [ ] Monitoring / alerting (uptime, DB health)
- [ ] Health check endpoint (`GET /health`)
- [ ] Graceful shutdown (`SIGTERM` handling)
- [ ] DB backup strategy

**Estimated scope**: Medium (3–4 days)

---

## Phase 7 — Testing (💡 FUTURE)

Milestone: Comprehensive test coverage.

- [ ] Backend: integration tests for all route groups
- [ ] Backend: unit tests for engine logic (truthEngine, amendmentEngine, queueComposer)
- [ ] Frontend: component tests for workstation, communication pages
- [ ] E2E tests (Playwright): full login → queue → action → logout flow
- [ ] Load testing (simulate 50 concurrent users)

**Estimated scope**: Large (1–2 weeks)
