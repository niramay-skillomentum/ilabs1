# Roadmap

> Planned features, milestones, and future development direction.

---

## Last Updated: 2026-07-04

---

## 1. Completed Milestones

| # | Milestone | Status | Branch |
|---|-----------|--------|--------|
| M1 | Project scaffolding + Auth | ✅ Done | `main` |
| M2 | MO Desk (validate, break, FO escalation) | ✅ Done | `main` |
| M3 | Confirmation Desk + Communication flow | ✅ Done | `main` |
| M4 | Electronic Settlement | ✅ Done | `main` |
| M5 | Bilateral Settlement | ✅ Done | `bilateral` |
| M6 | LLM reply queue → MongoDB (PendingReply) | ✅ Done | `main` |
| M7 | Security hardening (Secure cookie, sanitize-html) | ✅ Done | `main` |
| M8 | Frontend + Backend test infrastructure | ✅ Done | `main` |

---

## 2. Short-Term Goals (Next Sprint)

### Priority: High
- [ ] **Wire Reconciliation desk** — Complete the recon flow (RECON_PENDING → RECON_CLEARED) with frontend UI
- [ ] **Wire TLM desk** — Implement TLM-specific workflow page
- [ ] **Wire Reporting desk** — Create reporting/analytics page
- [ ] **Integrate scoring system** — Connect UserScore engine to trade actions and display in UI

### Priority: Medium
- [ ] **Restore SKB docs** — Recreate `docs/skb/` guides for AI Tutor domain context
- [ ] **CSS consolidation** — Move inline styles from dashboard/workstation/mo-risk/ssi-database to shared CSS modules or Tailwind
- [ ] **Dead code cleanup** — Remove 11 orphaned modules, 6 dead frontend wirings (see docs/18_Unused_And_Dead_Code.md)
- [ ] **Remove unused dependencies** — `js-cookie` (frontend), any other unused packages

### Priority: Low
- [ ] **OpenAPI/Swagger spec** — Generate from route definitions
- [ ] **Root README.md** — Create a proper project README
- [ ] **Root AGENTS.md** — Create root-level AI agent instructions file

---

## 3. Medium-Term Goals

### Architecture Improvements
- [ ] **Global state management** — Consider Context API or Zustand for shared session state
- [ ] **Custom hooks** — Extract common patterns (auth checks, socket connections, queue loading) into reusable hooks
- [ ] **Shared layout wrapper** — Create a common shell component (top bar, navigation) instead of per-page layouts
- [ ] **API client abstraction** — Centralize API calls in a shared service layer instead of inline fetch in components

### Feature Enhancements
- [ ] **Multi-user support** — Allow multiple simultaneous users with separate queues
- [ ] **Admin panel** — Dashboard for assessors to view user performance, scores, and session data
- [ ] **Scenario library** — Configurable trade scenarios with varying difficulty
- [ ] **Performance dashboard** — Real-time analytics on trade processing metrics

### Quality & Reliability
- [ ] **Comprehensive test coverage** — Unit tests for all engine modules, integration tests for all routes
- [ ] **E2E tests** — Playwright or Cypress for full user flow testing
- [ ] **Error boundary components** — React error boundaries for graceful failure handling
- [ ] **Structured logging** — Winston or Pino for production logging

---

## 4. Long-Term Vision

- [ ] **Multi-desk concurrent sessions** — Users can work on multiple desks simultaneously
- [ ] **Role-based access control** — Different user roles (trainee, assessor, admin)
- [ ] **Export capabilities** — PDF/Excel reports for assessments
- [ ] **CI/CD pipeline** — Automated testing and deployment
- [ ] **Monitoring** — Application performance monitoring (APM)
- [ ] **Internationalization** — Multi-language support
- [ ] **Accessibility audit** — WCAG 2.1 AA compliance

---

## 5. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable production branch |
| `bilateral` | Bilateral settlement feature (current) |
| Feature branches | Individual features (created as needed) |
