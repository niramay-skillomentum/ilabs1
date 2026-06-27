# Known Issues

> Last updated: 2026-06-26

## 🔴 High Priority

### KI-001 | No rate limiting on auth endpoints ✅ RESOLVED
**File**: `src/routes/authRoutes.js`  
**Status**: Fixed. Added `express-rate-limit` middleware (15 requests / 15 min per IP) to `/register` and `/login`.

### KI-002 | Credentials exposed in query params ✅ RESOLVED
**File**: `frontend/src/app/page.js`, `workstation/page.js`, `dashboard/page.js`, `communication/page.js`, `mo-risk/page.js`  
**Status**: Fixed. User email now stored in `sessionStorage` via shared `frontend/src/lib/auth.js` helpers (`saveSession`, `loadUserId`, `loadFullName`). Removed `?userId=` from all URL navigations. Login page writes session on success.

### KI-003 | JWT secret fallback hardcoded ✅ RESOLVED
**File**: `src/middleware/auth.js`, `server.js`  
**Status**: Fixed. Fallback removed — `JWT_SECRET` is now read directly from env. `server.js` validates at startup and exits with `FATAL` if unset.

---

## 🟡 Medium Priority

### KI-004 | auth_token cookie is not HttpOnly ✅ RESOLVED
**File**: `src/routes/authRoutes.js`  
**Status**: Fixed. Cookie now set with `HttpOnly` flag. Frontend no longer reads the cookie via `js-cookie` — it uses `sessionStorage` exclusively.

### KI-005 | Socket.io CORS set to `*` ✅ RESOLVED
**File**: `src/engine/socketEngine.js`  
**Status**: Fixed. CORS now reads from `ALLOWED_ORIGINS` env var (comma-separated); defaults to `http://localhost:3000`. Credentials enabled.

### KI-006 | `uiRoutes.js` is registered nowhere but contains unauthenticated routes ✅ RESOLVED
**File**: `src/routes/uiRoutes.js`  
**Status**: Fixed. File deleted entirely.

### KI-007 | Pending CPTY/FO replies lost on server restart
**File**: `src/engine/communicationEngine.js`, `server.js`  
**Description**: `pendingReplies` array is in-memory. Any scheduled reply (4–12s delay) is lost if the server restarts.  
**Fix**: Persist pending reply queue in MongoDB or use Agenda jobs for all delayed tasks.

### KI-008 | `DATABASE_URL` (PostgreSQL) in `.env` is unused ✅ RESOLVED
**File**: `.env`  
**Status**: Fixed. Removed `DATABASE_URL` line. Documented in new `.env.example`.

---

## 🟢 Low Priority

### KI-009 | `trade/page.js` uses legacy API patterns ✅ RESOLVED
**File**: `frontend/src/app/trade/page.js`  
**Status**: Fixed. Page deleted entirely (workstation + communication pages are the primary UI).

### KI-010 | Layout metadata is default Next.js boilerplate ✅ RESOLVED
**File**: `frontend/src/app/layout.js`  
**Status**: Fixed. Title now `"SGB Operations Simulator | Niramay Skillomentum"` with branded description.

### KI-011 | No frontend tests
**File**: `frontend/__tests__/`  
**Description**: Directory exists but is empty. `jest.config.js` is configured.  
**Fix**: Add component tests for critical UI paths (login, queue generation, action submission).

### KI-012 | Single backend test only
**File**: `tests/backend/auth.test.js`  
**Description**: Only auth routes are tested. Queue, trade action, conversation routes have no test coverage.  
**Fix**: Add integration tests for queue lifecycle and trade actions.

### KI-013 | `scratch.js` in root ✅ RESOLVED
**File**: `scratch.js`  
**Status**: Fixed. File deleted.

### KI-014 | Workstation page uses `alert()` for user feedback ✅ RESOLVED
**File**: `frontend/src/app/workstation/page.js`  
**Description**: Native `alert()` and `window.alert()` are used for notifications. These are blocking, inaccessible, and non-dismissible.  
**Fix**: Replaced with `react-hot-toast` notifications.

### KI-015 | Communication page has 855 lines — should be decomposed
**File**: `frontend/src/app/communication/page.js`  
**Description**: Single monolithic component. Hard to maintain and test.  
**Fix**: Extract sub-components: InboxList, MessageThread, ComposeModal, ReplyModal, FolderNav.

