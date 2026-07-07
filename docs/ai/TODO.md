# TODO

> Active tasks, backlog items, and development priorities.

---

## Last Updated: 2026-07-04

---

## 🔴 Critical (P0)

| # | Task | Status | Notes |
|---|------|--------|-------|
| T01 | Restrict CORS to `ALLOWED_ORIGINS` | 🔲 TODO | Currently wide-open `cors()` |
| T02 | Add HTTPS for production | 🔲 TODO | Nginx reverse proxy with SSL |
| T03 | Restore SKB docs for AI Tutor | 🔲 TODO | `docs/skb/` guides deleted, tutor loses context |
| T04 | Root AGENTS.md | 🔲 TODO | Create root-level AI agent instructions |
| T05 | Root README.md | 🔲 TODO | No project README exists |

---

## 🟡 High Priority (P1)

| # | Task | Status | Notes |
|---|------|--------|-------|
| T06 | Wire Reconciliation desk (frontend) | 🔲 TODO | Engine exists, not connected to UI |
| T07 | Wire TLM desk (frontend + engine) | 🔲 TODO | Only button on dashboard |
| T08 | Wire Reporting desk (frontend + engine) | 🔲 TODO | Only button on dashboard |
| T09 | Integrate scoring system | 🔲 TODO | Model + engine exist, not wired |
| T10 | CSS consolidation | 🔲 TODO | Remove inline styles from 4 pages |
| T11 | Dead code cleanup | 🔲 TODO | 11 orphaned modules, 6 dead wirings |
| T12 | Remove unused deps | 🔲 TODO | `js-cookie` and others |
| T13 | Add CSRF protection for cookie auth | 🔲 TODO | Security hardening |
| T14 | Configure rate limits per endpoint | 🔲 TODO | Currently generic |
| T15 | Test coverage for all routes | 🔲 TODO | Only trade actions tested |
| T16 | Test coverage for all engines | 🔲 TODO | No engine unit tests |

---

## 🟢 Medium Priority (P2)

| # | Task | Status | Notes |
|---|------|--------|-------|
| T17 | Add structured logging (Winston/Pino) | 🔲 TODO | Currently console.log/error |
| T18 | Add Helmet.js security headers | 🔲 TODO | Missing security headers |
| T19 | Add input validation library (Joi/Zod) | 🔲 TODO | Manual validation only |
| T20 | Global state management (Context/Zustand) | 🔲 TODO | All local state currently |
| T21 | Custom hooks extraction | 🔲 TODO | Auth, socket, queue patterns |
| T22 | Shared layout wrapper | 🔲 TODO | Each page has its own layout |
| T23 | API client abstraction | 🔲 TODO | Centralize fetch calls |
| T24 | Virtual scrolling for trade tables | 🔲 TODO | Performance for large queues |
| T25 | Split Workstation into smaller components | 🔲 TODO | 728-line monolith |
| T26 | Lazy load AI Tutor | 🔲 TODO | Reduce initial bundle |
| T27 | Graceful shutdown handlers | 🔲 TODO | SIGTERM/SIGINT |
| T28 | OpenAPI/Swagger spec | 🔲 TODO | Generate from routes |
| T29 | CI/CD pipeline | 🔲 TODO | Automated testing + deployment |
| T30 | Accessibility audit (WCAG 2.1 AA) | 🔲 TODO | No a11y implementation |

---

## 🔵 Low Priority (P3)

| # | Task | Status | Notes |
|---|------|--------|-------|
| T31 | Multi-user concurrent sessions | 🔲 TODO | Currently single-user assumption |
| T32 | Admin panel for assessors | 🔲 TODO | Performance dashboard |
| T33 | Configurable scenario library | 🔲 TODO | Varying difficulty |
| T34 | PDF/Excel export | 🔲 TODO | Assessment reports |
| T35 | E2E tests (Playwright/Cypress) | 🔲 TODO | Full flow automation |
| T36 | Socket.io Redis adapter | 🔲 TODO | For horizontal scaling |
| T37 | Internationalization | 🔲 TODO | Multi-language support |
| T38 | Responsive design (mobile/tablet) | 🔲 TODO | Desktop-only currently |

---

## ✅ Completed

| # | Task | Completed |
|---|------|-----------|
| C01 | MO Desk implementation | Done |
| C02 | Confirmation Desk implementation | Done |
| C03 | Electronic Settlement | Done |
| C04 | Bilateral Settlement | Done |
| C05 | Communication / Mailbox | Done |
| C06 | AI Tutor (Gemini-powered) | Done |
| C07 | CPTY AI persona (Gemini + offline fallback) | Done |
| C08 | FO AI persona | Done |
| C09 | LLM reply queue → MongoDB (PendingReply) | Done |
| C10 | Secure cookie flag in production | Done |
| C11 | sanitize-html for email XSS prevention | Done |
| C12 | Frontend component tests (Jest + RTL) | Done |
| C13 | Backend integration tests (Jest + Supertest) | Done |
| C14 | System Workflow Engine (amendment + verification) | Done |
| C15 | Docker Compose deployment | Done |
| C16 | Modularized trade generation engine | Done |
| C17 | Modularized communication engine | Done |
| C18 | docs/ folder reorganization | Done |
