# API Reference

> **Purpose:** Complete REST + Socket.io reference for the backend.
> **Audience:** Frontend and backend engineers, integrators.
> **Last verified:** 2026-07-01 against `src/routes/*` and `src/engine/socketEngine.js`.
> **Related:** [Architecture](ARCHITECTURE.md) · [Database](DATABASE.md) · [Business Rules](BUSINESS_RULES.md) · [Security](SECURITY.md)

---

All routes are prefixed with `/api`. The Next.js frontend proxies `/api/*` and `/socket.io/*` to the backend (default `http://localhost:3002`, via `NEXT_PUBLIC_BACKEND_URL`).

**Authentication:** 🔒 routes require a JWT via `Authorization: Bearer <token>`; the middleware also accepts the `auth_token` cookie as a fallback. On failure: `401 { error: "Authentication required" }` (no token) or `403 { error: "Invalid or expired token" }`.

**Response format:** JSON. Success responses generally include `"success": true`; errors include `"error": "<message>"`.

**Router mounts:** `/api/auth`, `/api/session`, `/api/clock`, `/api/queue`, `/api/trade`, `/api/conversation` (+ `/api/conversations`), `/api/fo-channel`, `/api/audit`, `/api/settlement`, `/api/ssi`, `/api/chat`.

---

## Auth — `/api/auth`

> Rate-limited: **15 requests / 15 minutes / IP** (`express-rate-limit`).

### `POST /api/auth/register` — public
Body `{ fullName, email, password }` → `200 { success: true, message: "Registration successful" }`. `400` if fields missing or email already registered. Password is bcrypt-hashed; email is lowercased.

### `POST /api/auth/login` — public
Body `{ email, password }` → `200 { success: true, token, user: { email, fullName } }`. `400` on missing fields / invalid credentials. Also sets `auth_token=<JWT>; Path=/; Max-Age=10800; SameSite=Lax; HttpOnly` (`Secure` in production). Token lifetime **3 hours**.

## Session — `/api/session` 🔒

### `GET /api/session/info`
→ `{ success, hasActiveSession, userId, fullName, [desk, queueSize, sessionStart, sessionExpiry] }`.

### `POST /api/session/logout`
→ `{ success: true }`. Clears the cookie and ends the session (`isActive = false`, unassigns trades).

## Clock — `/api/clock` — public

### `GET /api/clock`
→ `{ simTime: "HH:MM", timeLeftMinutes }` — minutes until the 18:00 sim cutoff.

## Queue — `/api/queue` 🔒

### `POST /api/queue/generate`
Body `{ desk }` where desk ∈ `"MO" | "CONFIRMATION" | "SETTLEMENT"` → `{ success, desk, queueSize, trades[], sessionStart, sessionExpiry }`. `400` on invalid desk, or `{ success:false, error:"Complete your current queue first" }` if an active queue exists. Composes a 20-trade queue (see [Business Rules](BUSINESS_RULES.md)) and creates a `Queue` doc with `isActive:true`.

### `GET /api/queue/my?desk=<desk>`
Fetch the active queue (touches `lastActivity`). Returns the queue, or `400` if there is no active session.

## Trade — `/api/trade` 🔒

### `GET /api/trade/all`
→ `{ success, trades[] }`. **No pagination** — see [Performance](PERFORMANCE.md).

### `POST /api/trade/action`
Body `{ trade: { tradeRef }, action, issueType?, comment }`.
- The trade is **re-fetched from the DB** by `tradeRef` — client-supplied fields are not trusted.
- `comment` is **mandatory** (`400` if empty).
- On success: persists the trade, records an `AuditLog` entry, emits `trade_update` to `user_<userId>`, returns `{ success, queueSize, trades[] }`.

**Action → transition map** (exactly as in `tradeRoutes.js`):

| Action | Allowed from | Result |
|--------|--------------|--------|
| `MO_VALIDATE_PASS` | `MO_PENDING`, `PENDING_FO_RESPONSE` | → `CONFIRMATION_PENDING` (applies accepted amendments) |
| `MO_RAISE_BREAK` | `MO_PENDING` | → `MO_BREAK_OPEN` |
| `MO_SEND_TO_FO` | `MO_BREAK_OPEN` | → `PENDING_FO_RESPONSE` |
| `CONFIRM_TRADE` | `LIASING_WITH_CPTY` | → `SETTLEMENT_PENDING` |
| `CONFIRM_RAISE_BREAK` | `LIASING_WITH_CPTY` | → `CONFIRMATION_BREAK` (once only) |
| `CONFIRM_SEND_TO_CPTY` | `CONFIRMATION_PENDING`, `CONFIRMATION_BREAK`, `LIASING_WITH_FO`, `LIASING_WITH_CPTY` | → `LIASING_WITH_CPTY` (increments `cptyContactCount`, schedules CPTY reply) |
| `CONFIRM_REJECT_CLAIM` | `CONFIRMATION_BREAK` | → `CONFIRMATION_PENDING` (applies truth if FO supports & booking matches universal) |
| `CONFIRM_REQUEST_EVIDENCE` | `CONFIRMATION_BREAK` | stays `CONFIRMATION_BREAK` (logs evidence request) |
| `CONFIRM_ESCALATE_TO_FO` | `CONFIRMATION_BREAK` | → `LIASING_WITH_FO` (opens FO internal channel) |
| `CONFIRM_RAISE_AMENDMENT` | `CONFIRMATION_BREAK` | stays `CONFIRMATION_BREAK` |
| `CONFIRM_APPROVE_AMENDMENT` | `CONFIRMATION_BREAK` | → `CONFIRMATION_PENDING` (applies accepted amendments) |
| `CONFIRM_RESEND` | `CONFIRMATION_PENDING` | → `LIASING_WITH_CPTY` |
| `SETTLEMENT_APPROVE` | `SETTLEMENT_PENDING`, `LIASING_WITH_CPTY`, `SETTLEMENT_BREAK` | → `SETTLED` (validates SSI match) |
| `SETTLEMENT_RAISE_BREAK` | `SETTLEMENT_PENDING`, `READY_FOR_APPROVAL`, `LIASING_WITH_CPTY` | → `SETTLEMENT_BREAK` |
| `SETTLEMENT_FOLLOW_UP_CPTY` | `SETTLEMENT_PENDING`, `SETTLEMENT_BREAK`, `LIASING_WITH_CPTY` | → `LIASING_WITH_CPTY` |

**Extra guards:**
- `MO_VALIDATE_PASS` from `PENDING_FO_RESPONSE` requires `foResponseReceived === true`.
- `MO_VALIDATE_PASS` with `pendingAmendments` requires the conversation to be `RESOLVED`.
- `CONFIRM_RAISE_BREAK` requires `cptyContactCount === 1 && foContactCount === 0`.

## Conversation — `/api/conversation` (+ `/api/conversations`) 🔒

> Both mount paths are registered for compatibility; they serve the same handlers.

### `POST /api/conversation/send`
Body `{ tradeRef, sender, message, desk }` → `{ success }`. Parses the message (`aiParser`), then: MO / `PENDING_FO_RESPONSE` trades schedule an **FO** reply (and `MO_BREAK_OPEN → PENDING_FO_RESPONSE`); other trades schedule a **CPTY** reply. Emits `new_email` (broadcast).

### `POST /api/conversation/resolve`
Body `{ tradeRef }`. Requires `foResponseReceived === true`. Marks the conversation `RESOLVED`, accepts + applies pending amendments, transitions to `MO_PENDING` → `{ success, message, newStatus: "MO_PENDING" }`.

### `GET /api/conversation/shared?desk=<desk>`
→ `{ success, conversations: [{ trade, conversation: { subject, status, messages[] } }] }` for the desk's group inbox.

### `GET /api/conversation/personal`
→ conversations where the user sent at least one message.

### `GET /api/conversation/:tradeRef`
→ `{ success, subject, messages[] }`. Message shape: `{ sender: "USER"|"FO"|"COUNTERPARTY", body, subject, timestamp }`.

## FO Channel — `/api/fo-channel` 🔒

### `GET /api/fo-channel/list?desk=<desk>` → `{ success, conversations[] }`
### `GET /api/fo-channel/:tradeRef` → `{ channel, messages[] }` (or `{ channel: null, messages: [] }`)
### `POST /api/fo-channel/send`
Body `{ tradeRef, message }` → `{ success }`. Opens the `FOCommunication` channel, saves the message, increments `foContactCount`, transitions to `LIASING_WITH_FO`/`PENDING_FO_RESPONSE` if needed, and schedules an FO internal reply.

## Audit — `/api/audit` 🔒

### `GET /api/audit/:tradeRef`
→ `{ trail: [ AuditLog entries ], xmlAudit: "<xml>" | null }`. `trail` is the structured `AuditLog`; `xmlAudit` is the trade's `auditXml` generated at creation.

## Settlement — `/api/settlement` 🔒

### `POST /api/settlement/select-type`
Body `{ tradeRef, selectedType }` → `{ success, redirect: "/settlement/<type>" }`. Compares against `truths.settlement.settlementType`; a wrong choice applies a **10-point penalty** and returns `400`.

### `POST /api/settlement/edit-ssi`
Body `{ tradeRef, ssiData }` → `{ success }`. Updates the trade's `settlementDetails`.

### `GET /api/settlement/bilateral/:tradeRef` → `{ success, trade }`
### `POST /api/settlement/bilateral/action`
Body `{ tradeRef, action, editData? }` where action ∈ `APPROVE_SETTLEMENT | RAISE_BREAK | EDIT_SETTLEMENT | MAIL_CPTY`. `APPROVE_SETTLEMENT` validates all **9 SSI fields** vs `truths.settlement`; match → `SETTLED`, mismatch → 10-point penalty + `400`. `MAIL_CPTY` transitions `SETTLEMENT_BREAK → LIASING_WITH_CPTY` and emits a socket event.

### `GET /api/settlement/electronic/:tradeRef` → `{ success, trade }`
### `POST /api/settlement/electronic/action`
Same as bilateral **without** `MAIL_CPTY`.

The 9 SSI fields: `beneficiaryName, beneficiaryBank, beneficiaryBIC, accountNumber, accountType, currency, settlementMethod, correspondentBank, paymentReference`.

## SSI — `/api/ssi` 🔒

### `GET /api/ssi/search?id=<ssiId>`
→ `{ success, ssi }` or `404`. Searches the `CPTY_SSIS` and `ENTITY_SSIS` tables (from `tradeGenerator.js`). Powers the SSI Database screen used for settlement self-matching.

## Chat / Tutor — `/api/chat` 🔒

### `POST /api/chat/tutor`
Body `{ message, desk, tradeContext, history[] }` → `{ reply }`. `400` if `message` missing, `500` on generation failure. Backed by `tutorAI.generateTutorResponse()` (OpenRouter Nemotron 3 Ultra), grounded in the `docs/skb/*` knowledge base.

---

## Socket.io

**Connect:** `io(BACKEND_URL, { auth: { token: <JWT> } })` — auth also falls back to the `auth_token` cookie. On failure the server emits an `"Authentication error"`.

**Client → Server**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_desk` | desk name | Join `desk_<desk>` room |
| `leave_desk` | desk name | Leave `desk_<desk>` room |

**Server → Client**

| Event | Payload | Trigger |
|-------|---------|---------|
| `trade_update` | `{ tradeRef, currentStatus }` | After a successful trade / settlement action (to `user_<userId>`) |
| `new_email` | `{ tradeRef, sender, subject, timestamp }` | When a message is added to a conversation (broadcast) |

**Rooms:** `user_<userId>` (auto-joined) and `desk_<desk>` (joined via `join_desk`).

## Error codes

| Code | Meaning |
|------|---------|
| 400 | Bad request — missing fields, validation or business-rule failure |
| 401 | No auth token |
| 403 | Invalid/expired token |
| 404 | Not found |
| 500 | Internal error |
