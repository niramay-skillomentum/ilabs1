content: # API Reference

> Last updated: 2026-06-27

All API routes are prefixed with `/api`. The Next.js frontend proxies all `/api/*` and `/socket.io/*` requests to the backend at `http://localhost:3002` (configurable via `NEXT_PUBLIC_BACKEND_URL`).

**Authentication**: All 🔒 routes require `Authorization: Bearer <JWT>` header. The middleware also accepts the `auth_token` cookie as a fallback.

**Response format**: All responses are JSON. Success responses include `"success": true`. Error responses include `"error": "<message>"`.

---

## Auth Routes — `/api/auth`

> Rate-limited: **15 requests per 15 minutes per IP** (via `express-rate-limit`)

### `POST /api/auth/register`

Register a new user account.

**Body**: `{ fullName, email, password }`

**Response** (200):
```json
{ "success": true, "message": "Registration successful" }
```

**Errors**:
- `400` — missing fields, or email already registered

**Notes**: Password is hashed with bcrypt (10 rounds) before storage. Email is normalized to lowercase.

---

### `POST /api/auth/login`

Authenticate and receive JWT.

**Body**: `{ email, password }`

**Response** (200):
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "email": "user@example.com", "fullName": "John Doe" }
}
```

Also sets cookie: `auth_token=<JWT>; Path=/; Max-Age=10800; SameSite=Lax; HttpOnly`

**Errors**:
- `400` — missing fields or invalid credentials

---

## Session Routes — `/api/session` 🔒

### `GET /api/session/info`

Get current session state for the authenticated user.

**Response** (200):
```json
{
  "success": true,
  "hasActiveSession": true,
  "userId": "user@example.com",
  "fullName": "John Doe",
  "desk": "MO",
  "queueSize": 20,
  "sessionStart": "2026-01-01T09:00:00Z",
  "sessionExpiry": "2026-01-01T12:00:00Z"
}
```

If no active session: `{ "success": true, "hasActiveSession": false }`

---

### `POST /api/session/logout`

End session and clear auth cookie.

**Response** (200):
```json
{ "success": true }
```

Sets cookie: `auth_token=; Path=/; Max-Age=0` (clears it). Calls `queueComposer.endSession(userId)` which sets `isActive = false` and unassigns all trades.

---

## Queue Routes — `/api/queue` 🔒

### `POST /api/queue/generate`

Generate a new 20-trade queue for the authenticated user.

**Body**: `{ desk }` — one of: `"MO"`, `"CONFIRMATION"`, `"SETTLEMENT"`

**Response** (200):
```json
{
  "success": true,
  "desk": "MO",
  "queueSize": 20,
  "trades": [ /* array of trade objects */ ],
  "sessionStart": "...",
  "sessionExpiry": "..."
}
```

**Errors**:
- `400` — invalid desk value
- `400` — user already has an active queue (`"Complete your current queue first"`)

**Notes**:
- Resets simulation clock
- Triggers graduated DB/generated allocation (see `BUSINESS_RULES.md` SR-09)
- Creates `Queue` document with `isActive: true`

---

### `GET /api/queue/my?desk=<desk>`

Fetch the authenticated user's current active queue.

**Query**: `desk` (optional — if provided and doesn't match active desk, returns 400)

**Response** (200):
```json
{
  "success": true,
  "desk": "MO",
  "queueSize": 20,
  "trades": [ /* array of trade objects */ ],
  "sessionStart": "...",
  "sessionExpiry": "..."
}
```

**Notes**: Touches `Queue.lastActivity` on every call. Returns 200 with `{ success: true, trades: [] }` if no active session.

---

## Trade Routes — `/api/trade` 🔒

### `GET /api/trade/all`

Get all trades in the DB (admin-level endpoint, no pagination).

**Response** (200):
```json
{
  "success": true,
  "trades": [ /* all trade documents */ ]
}
```

**⚠️ Performance Warning**: No pagination — loads all trades. See `PERFORMANCE.md` KP-002.

---

### `POST /api/trade/action`

Submit an action on a trade in the authenticated user's queue.

**Body**:
```json
{
  "trade": { "tradeRef": "TRD_1234_abc" },
  "action": "MO_VALIDATE_PASS",
  "issueType": "AMOUNT",
  "comment": "Amount matches FO truth. Validating."
}
```

- `trade.tradeRef` — identifies the trade (client-provided; re-fetched from DB server-side)
- `action` — one of the valid action codes (see table below)
- `issueType` — optional; used for break-type classification
- `comment` — **mandatory**; returns 400 if empty

**Response** (200):
```json
{
  "success": true,
  "queueSize": 19,
  "trades": [ /* updated trade list */ ]
}
```

**Valid Actions**:

| Action | Allowed From Status | Effect |
|--------|--------------------|-|
| `MO_VALIDATE_PASS` | `MO_PENDING`, `PENDING_FO_RESPONSE` | → `CONFIRMATION_PENDING` |
| `MO_RAISE_BREAK` | `MO_PENDING` | → `MO_BREAK_OPEN` |
| `MO_SEND_TO_FO` | `MO_BREAK_OPEN` | → `PENDING_FO_RESPONSE` |
| `CONFIRM_TRADE` | `CONFIRMATION_PENDING`, `LIASING_WITH_CPTY` | → `SETTLEMENT_PENDING` |
| `CONFIRM_RAISE_BREAK` | `LIASING_WITH_CPTY` | → `CONFIRMATION_BREAK` |
| `CONFIRM_SEND_TO_CPTY` | `CONFIRMATION_PENDING`, `CONFIRMATION_BREAK`, `LIASING_WITH_FO`, `LIASING_WITH_CPTY` | schedules CPTY reply |
| `CONFIRM_REJECT_CLAIM` | `CONFIRMATION_BREAK` | may trigger CPTY concession |
| `CONFIRM_REQUEST_EVIDENCE` | `CONFIRMATION_BREAK` | may trigger CPTY concession |
| `CONFIRM_ESCALATE_TO_FO` | `CONFIRMATION_BREAK` | opens FO channel |
| `CONFIRM_RAISE_AMENDMENT` | `CONFIRMATION_BREAK` | no status change |
| `CONFIRM_APPROVE_AMENDMENT` | `CONFIRMATION_BREAK` | applies amendments → `CONFIRMATION_PENDING` |
| `CONFIRM_RESEND` | `CONFIRMATION_PENDING` | sends resend to CPTY |
| `SETTLEMENT_APPROVE` | `SETTLEMENT_PENDING` | → `READY_FOR_APPROVAL` |
| `SETTLEMENT_RAISE_BREAK` | `READY_FOR_APPROVAL` | → `SETTLEMENT_BREAK` |
| `SETTLEMENT_FOLLOW_UP_CPTY` | `SETTLEMENT_BREAK` | → `LIASING_WITH_CPTY` |

**Special Validations**:
- `MO_VALIDATE_PASS` from `PENDING_FO_RESPONSE` requires `foResponseReceived === true`
- `MO_VALIDATE_PASS` with `pendingAmendments` requires `conversation.status === "RESOLVED"`
- `CONFIRM_RAISE_BREAK` requires `cptyContactCount === 1 && foContactCount === 0`
- After action: emits `trade_update` Socket.io event; logs to `AuditLog`

---

## Conversation Routes — `/api/conversation` 🔒

> Both `/api/conversation/*` and `/api/conversations/*` are registered (legacy compatibility).

### `POST /api/conversation/send`

Send an email message for a trade.

**Body**: `{ tradeRef, sender, message, desk }`

- `sender` — typically the user's name or `"USER"`
- `message` — email body
- `desk` — desk context for routing

**Behavior**:
- MO status trades → email goes to FO, schedules FO reply
- Other status trades → email goes to CPTY, schedules CPTY reply, increments `cptyContactCount`
- Transitions `MO_BREAK_OPEN` → `PENDING_FO_RESPONSE` automatically
- Emits `new_email` Socket.io event

**Response** (200):
```json
{ "success": true }
```

---

### `POST /api/conversation/resolve`

Resolve the break conversation for a trade (MO desk only).

**Body**: `{ tradeRef }`

**Requires**: `trade.foResponseReceived === true`

**Effect**:
1. Accepts all pending amendments and applies them to trade fields
2. Sets `conversation.status = "RESOLVED"` + `resolvedAt`
3. Transitions trade to `MO_PENDING`

**Response** (200):
```json
{ "success": true, "trade": { /* updated trade */ } }
```

---

### `GET /api/conversation/shared?desk=<desk>`

Get all conversations for a desk's shared inbox (messages from any user on this desk).

**Response** (200):
```json
{
  "success": true,
  "conversations": [ /* sorted by latest message timestamp, descending */ ]
}
```

---

### `GET /api/conversation/personal`

Get conversations where the authenticated user sent at least one message.

**Response** (200):
```json
{ "success": true, "conversations": [ /* user's sent threads */ ] }
```

---

### `GET /api/conversation/:tradeRef`

Get conversation thread for a specific trade.

**Response** (200):
```json
{
  "success": true,
  "subject": "Re: Trade TRD_1234_abc",
  "messages": [
    { "sender": "USER", "body": "...", "subject": "...", "timestamp": "..." },
    { "sender": "COUNTERPARTY", "body": "...", "subject": "...", "timestamp": "..." }
  ]
}
```

---

## FO Channel Routes — `/api/fo-channel` 🔒

### `GET /api/fo-channel/list?desk=<desk>`

List all FO internal channels for a desk.

**Response** (200):
```json
{ "success": true, "conversations": [ /* FOCommunication documents */ ] }
```

---

### `GET /api/fo-channel/:tradeRef`

Get FO internal channel for a specific trade.

**Response** (200):
```json
{
  "channel": { /* FOCommunication document */ },
  "messages": [ /* message array */ ]
}
```

---

### `POST /api/fo-channel/send`

Send a message on the FO internal escalation channel.

**Body**: `{ tradeRef, message }`

**Effect**:
1. Opens `FOCommunication` document if not already open
2. Saves user message
3. Schedules FO internal reply (via `foInternalChannel.scheduleFOInternalReply()`)
4. Transitions trade status if needed (may set `LIASING_WITH_FO`)

**Response** (200):
```json
{ "success": true }
```

---

## Audit Routes — `/api/audit` 🔒

### `GET /api/audit/:tradeRef`

Get full audit trail for a specific trade.

**Response** (200):
```json
{
  "trail": [
    {
      "tradeRef": "TRD_1234_abc",
      "action": "MO_VALIDATE_PASS",
      "userId": "user@example.com",
      "desk": "MO",
      "details": "Validated. Amount matches FO truth.",
      "timestamp": "2026-06-27T09:15:00Z",
      "isAutomated": false
    }
  ],
  "xmlAudit": "<?xml version=\"1.0\"?>... or null"
}
```

The `xmlAudit` field is the XML from the trade's `auditXml` field (generated at creation). The `trail` array is from `AuditLog` entries.

---

## Settlement Routes — `/api/settlement` 🔒

### `POST /api/settlement/select-type`
Validates the user's choice of settlement type (Bilateral vs Electronic). Applies penalty if incorrect.

### `GET /api/settlement/bilateral/:tradeRef`
Fetches the trade for the Bilateral Settlement Dashboard.

### `POST /api/settlement/bilateral/action`
Performs an action on a Bilateral Settlement trade (`APPROVE_SETTLEMENT`, `RAISE_BREAK`, `EDIT_SETTLEMENT`, `MAIL_CPTY`).

### `GET /api/settlement/electronic/:tradeRef`
Fetches the trade for the Electronic Settlement Dashboard.

### `POST /api/settlement/electronic/action`
Performs an action on an Electronic Settlement trade (`APPROVE_SETTLEMENT`, `RAISE_BREAK`, `EDIT_SETTLEMENT`). Does NOT include `MAIL_CPTY`.

---

## Clock Routes — `/api/clock`

### `GET /api/clock`

Get current simulation time and time remaining (public endpoint — no auth).

**Response** (200):
```json
{
  "simTime": "10:30",
  "timeLeftMinutes": 150
}
```

Simulation clock is calculated from the active user session's `sessionStart`. Frontend also computes this client-side without polling.

---

## Socket.io Events

**Connection**: `io(BACKEND_URL, { auth: { token: <JWT> } })`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_desk` | `"MO"` / `"CONFIRMATION"` / `"SETTLEMENT"` | Join desk broadcast room |
| `leave_desk` | desk name | Leave desk broadcast room |

### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `trade_update` | `{ tradeRef, currentStatus }` | After any successful trade action |
| `new_email` | `{ tradeRef, sender?, subject?, timestamp? }` | When a new email/message arrives in any conversation |

**Room structure**:
- `desk_<deskName>` — broadcast room for desk-wide events
- `user_<userId>` — targeted room for user-specific notifications

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request — missing fields, validation failure, business rule violation |
| 401 | No auth token provided |
| 403 | Invalid or expired JWT |
| 404 | Resource not found |
| 500 | Internal server error (unexpected exception) |
 file_path: /workspace/ilabs1/ai/API.md