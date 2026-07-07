# Known Issues

> Documented bugs, limitations, and issues to be aware of.

---

## Last Updated: 2026-07-04

---

## 🔴 Critical

| ID | Issue | Impact | Workaround |
|----|-------|--------|-----------|
| KI-001 | **CORS wide open** — `app.use(cors())` allows all origins | Security risk in production | Restrict `ALLOWED_ORIGINS` before deployment |
| KI-002 | **No HTTPS** in production configuration | Data transmitted in plaintext | Add nginx reverse proxy with SSL |

---

## 🟡 High Priority

| ID | Issue | Impact | Workaround |
|----|-------|--------|-----------|
| KI-003 | **2-second DB polling** for trade cache refresh | Excessive database load under load | Increase interval or use change streams |
| KI-004 | **Polling fallback always active** — 15s/5s intervals run even when Socket.io works | Unnecessary API calls | Add logic to disable polling when socket connected |
| KI-005 | **Workstation page is 728 lines** — single monolithic component | Hard to maintain, large re-render scope | Split into sub-components |
| KI-006 | **Communication page is 647 lines** — single monolithic component | Hard to maintain, large re-render scope | Split into sub-components (partially done) |
| KI-007 | **Reconciliation not wired** — Engine exists but no frontend | Dead code, incomplete feature | Build recon desk UI |
| KI-008 | **TLM desk not implemented** — Only button on dashboard | Non-functional button | Remove or implement |
| KI-009 | **Reporting desk not implemented** — Only button on dashboard | Non-functional button | Remove or implement |
| KI-010 | **Scoring system not wired** — Model + engine exist but unused | Incomplete feature | Integrate into trade action flow |
| KI-011 | **SKB docs deleted** — AI Tutor loses domain context | Tutor gives generic responses | Restore `docs/skb/` guides |
| KI-012 | **11 orphaned engine modules** — Dead code in codebase | Maintenance burden, confusion | Remove (see docs/18_Unused_And_Dead_Code.md) |
| KI-013 | **6 dead frontend wirings** — References to non-existent code | Runtime errors possible | Clean up references |

---

## 🟢 Medium Priority

| ID | Issue | Impact | Workaround |
|----|-------|--------|-----------|
| KI-014 | **Inline `<style>` tags** in dashboard and workstation | Not reusable, hard to maintain | Migrate to Tailwind |
| KI-015 | **Inline `style={}`** in MO Risk and SSI Database | Not reusable, no responsive | Migrate to Tailwind |
| KI-016 | **`js-cookie`** dependency unused in frontend | Unnecessary bundle size | Remove from package.json |
| KI-017 | **No graceful shutdown** — Interval processors don't clean up | Resource leaks on restart | Add SIGTERM/SIGINT handlers |
| KI-018 | **No error boundaries** in React | Unhandled errors crash UI | Add React error boundaries |
| KI-019 | **No audit logging** for auth events | Security blind spot | Log login/logout/failures |
| KI-020 | **Session expiry hardcoded** to 3 hours | Inflexible | Make configurable via SystemConfig |
| KI-021 | **No pagination** on trade queue API | Performance issue with large queues | Add skip/limit parameters |
| KI-022 | **No input validation library** — Manual validation only | Inconsistent validation | Add Joi/Zod schemas |

---

## 🔵 Low Priority

| ID | Issue | Impact | Workaround |
|----|-------|--------|-----------|
| KI-023 | **No responsive design** — Desktop only | Not usable on mobile/tablet | Add responsive breakpoints |
| KI-024 | **No accessibility features** — No ARIA labels, keyboard nav | Poor a11y experience | Add a11y attributes |
| KI-025 | **`dangerouslySetInnerHTML`** used for inline styles | Potential XSS vector | Review and sanitize |
| KI-026 | **No OpenAPI spec** | No machine-readable API docs | Generate from routes |
| KI-027 | **No root README.md** | Poor developer onboarding | Create README |
| KI-028 | **Geist + Inter + Segoe UI** mixed font usage | Inconsistent typography | Standardize on one font family |
| KI-029 | **Single-server Socket.io** — No horizontal scaling | Cannot scale horizontally | Add Redis adapter |
| KI-030 | **No rate limiting per endpoint** — Generic config | May be too permissive/restrictive | Configure per-route limits |

---

## Resolved Issues

| ID | Issue | Resolution |
|----|-------|-----------|
| KI-R01 | LLM replies lost on server restart | Migrated to PendingReply MongoDB collection |
| KI-R02 | No XSS protection on email bodies | Added sanitize-html |
| KI-R03 | No Secure flag on auth cookie | Added Secure flag in production |
| KI-R04 | No test infrastructure | Added Jest + Supertest (backend) + RTL (frontend) |
