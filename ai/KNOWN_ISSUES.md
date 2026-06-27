content: # Known Issues

> Last updated: 2026-06-27

---

## ✅ Resolved Issues

### KI-001 | No rate limiting on auth endpoints
**File**: `src/routes/authRoutes.js`
**Resolution**: Added `express-rate-limit` middleware (15 requests / 15 minutes per IP) to `/api/auth/register` and `/api/auth/login`.

### KI-002 | User email exposed in URL query params
**Files**: `frontend/src/app/page.js`, `workstation/page.js`, `dashboard/page.js`, `communication/page.js`, `mo-risk/page.js`
**Resolution**: Created shared `frontend/src/lib/auth.js` module with `saveSession()`, `loadUserId()`, `loadFullName()`, `getToken()`, `authHeaders()`, `clearSession()`. All pages now read from sessionStorage. Email no longer appears in any URL.

### KI-003 | JWT secret hardcoded fallback
**Files**: `src/middleware/auth.js`, `server.js`
**Resolution**: Fallback string removed entirely. `server.js` validates `JWT_SECRET` at startup and calls `process.exit(1)` with a `FATAL` message if unset.

### KI-004 | `auth_token` cookie not HttpOnly
**File**: `src/routes/authRoutes.js`
**Resolution**: `HttpOnly` flag added to `Set-Cookie` header. Frontend uses `sessionStorage` exclusively for token access.

### KI-005 | Socket.io CORS set to wildcard `*`
**File**: `src/engine/socketEngine.js`
**Resolution**: CORS origin now reads from `ALLOWED_ORIGINS` env var (comma-separated list); defaults to `http://localhost:3000`. `credentials: true` enabled.

### KI-006 | `uiRoutes.js` contained unauthenticated routes
**File**: `src/routes/uiRoutes.js`
**Resolution**: File deleted entirely (151 lines removed). Routes were legacy v1 in-memory implementations, not registered in `server.js`.

### KI-008 | `DATABASE_URL` (PostgreSQL) unused in `.env`
**Resolution**: Removed from `.env`. Documented correctly in `.env.example`. Was a leftover from when SQL was considered.

### KI-009 | `trade/page.js` referenced non-existent actions
**File**: `frontend/src/app/trade/page.js`
**Resolution**: Page deleted. The Workstation + Communication pages are the primary trade UI.

### KI-010 | Layout metadata was default Next.js boilerplate
**File**: `frontend/src/app/layout.js`
**Resolution**: Title updated to `"SGB Operations Simulator | Niramay Skillomentum"` with a branded description.

### KI-013 | `scratch.js` in project root
**Resolution**: File deleted.

### KI-014 | `alert()` / `window.alert()` used for notifications
**File**: `frontend/src/app/workstation/page.js`
**Resolution**: All native `alert()` calls replaced with `react-hot-toast` notifications (non-blocking, dismissible, accessible).

---

## 🔴 Open — High Priority

### KI-007 | Pending CPTY/FO replies lost on server restart
**File**: `src/engine/communicationEngine.js`, `server.js`
**Description**: The `pendingReplies` array is stored in-memory. Any CPTY or FO reply scheduled within the 4–12 second delay window is permanently lost if the server process restarts or crashes during that window.
**Impact**: Trainee sends email, server restarts, reply never arrives — conversation thread stalls.
**Fix**: Persist pending replies to MongoDB (add a `PendingReply` collection or use Agenda jobs for all delayed AI response tasks).

---

## 🟡 Open — Medium Priority

### KI-011 | No frontend component tests
**File**: `frontend/__tests__/`
**Description**: The `__tests__` directory exists and `jest.config.js` + `jest.setup.js` are configured with `jest-environment-jsdom` and `@testing-library/react`. However, the directory contains no test files.
**Impact**: Zero test coverage on UI components — regressions in Login, Workstation, Communication, Dashboard undetected.
**Fix**: Add component tests for critical paths (see `TESTING.md` for patterns).

### KI-012 | Only 1 backend test (auth only)
**File**: `tests/backend/auth.test.js`
**Description**: The only backend test covers basic auth routes. Queue generation, trade actions, conversation routes, FO channel, and audit routes have zero test coverage.
**Impact**: Core business logic (lifecycle, amendments, break detection) is entirely untested via automated tests.
**Fix**: Add integration tests for queue, trade actions, and conversation flows (see `TESTING.md`).

### KI-015 | `communication/page.js` is 850 lines — should be decomposed
**File**: `frontend/src/app/communication/page.js`
**Description**: Single monolithic React component handling inbox listing, message thread rendering, compose modal, reply modal, and FO channel switching — all in one file.
**Impact**: Difficult to read, maintain, and test. Slow to parse and hydrate.
**Fix**: Extract sub-components: `InboxList`, `MessageThread`, `ComposeModal`, `ReplyModal`, `FolderNav`.

---

## 🟢 Open — Low Priority

### KI-016 | No `Secure` flag on `auth_token` cookie
**File**: `src/routes/authRoutes.js`
**Description**: The `auth_token` cookie does not include the `Secure` flag. In production (HTTPS), this means the cookie could be transmitted over HTTP.
**Fix**: Add `Secure` flag when `NODE_ENV === "production"`.

### KI-017 | No HTML sanitization on email message bodies
**Files**: `src/engine/conversationEngine.js`, `frontend/src/app/communication/page.js`
**Description**: User-submitted email message bodies are stored as-is and rendered in the communication page. AI-generated CPTY responses include inline HTML tables (e.g., `<table>` tags). No sanitization layer exists.
**Impact**: Potential XSS if a malicious user injects script tags in email bodies.
**Fix**: Sanitize bodies on save (server-side, e.g., `sanitize-html`) or on render (client-side, `DOMPurify`).

### KI-018 | Duplicate route mount for conversations
**File**: `server.js`
**Description**: `conversationRoutes` is mounted twice:
```js
app.use("/api/conversation", require("./src/routes/conversationRoutes"));
app.use("/api/conversations", require("./src/routes/conversationRoutes"));
```
**Impact**: Harmless currently but doubles the route surface area. The frontend uses `/api/conversations` for the shared inbox and `/api/conversation` for single-trade operations.
**Fix**: Consolidate to a single prefix. Update all frontend calls accordingly.

### KI-019 | `GET /api/trade/all` has no pagination
**File**: `src/routes/tradeRoutes.js`
**Description**: Returns all trades in the DB with no `skip`/`limit`. At scale (thousands of pooled trades) this will be slow.
**Fix**: Add `?page=&limit=` query parameters (see `PERFORMANCE.md` KP-002).

### KI-020 | In-memory trade cache unbounded growth
**File**: `server.js` cache refresh loop
**Description**: Every 2 seconds, `Trade.find({ assignedTo: { $ne: null } }).lean()` loads all assigned trades. As concurrent users grow, this query's payload size grows linearly.
**Fix**: Use targeted cache invalidation (update/add specific trades on action) rather than full rebuild.
 file_path: /workspace/ilabs1/ai/KNOWN_ISSUES.md