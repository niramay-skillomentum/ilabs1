# API Reference

All API routes are prefixed with `/api`. The frontend proxies `/api/*` to the backend at `http://localhost:3002`.

**Authentication**: All protected routes require `Authorization: Bearer <JWT>` header OR an `auth_token` cookie.

---

## Auth Routes (`/api/auth`)

### `POST /api/auth/register`
Register a new user.

**Body**: `{ fullName, email, password }`
**Response**: `{ success: true, message: "Registration successful" }`
**Errors**: `400` if fields missing or email already registered

### `POST /api/auth/login`
Authenticate and receive JWT.

**Body**: `{ email, password }`
**Response**: `{ success: true, token, user: { email, fullName } }`
Sets `auth_token` cookie (Max-Age: 3h, SameSite=Lax)
**Errors**: `400` for invalid credentials

---

## Session Routes (`/api/session`) 🔒

### `GET /api/session/info`
Get current session state for authenticated user.

**Response**:
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

### `POST /api/session/logout`
End session and clear auth cookie.

**Response**: `{ success: true }`

---

## Queue Routes (`/api/queue`) 🔒

### `POST /api/queue/generate`
Generate a new queue of 20 trades for the user's selected desk.

**Body**: `{ desk }` — one of: `"MO"`, `"CONFIRMATION"`, `"SETTLEMENT"`
**Response**: `{ success, desk, queueSize, trades[], sessionStart, sessionExpiry }`
**Notes**: Resets and starts simulation clock. Returns error if user already has active queue.

### `GET /api/queue/my?desk=<desk>`
Fetch the user's current active queue.

**Query**: `desk` (optional — if provided and doesn't match active desk, returns error)
**Response**: `{ success, desk, queueSize, trades[], sessionStart, sessionExpiry }`
Touches session `lastActivity` on each call.

---

## Trade Routes (`/api/trade`) 🔒

### `GET /api/trade/all`
Get all trades in the DB (admin-level view).

**Response**: `{ success, trades[] }`
Returns: tradeRef, dates, status, desk, economics, truths, pendingAmendments.

### `POST /api/trade/action`
Perform an action on a trade in the user's queue.

**Body**: `{ trade: { tradeRef }, action, issueType?, comment }`
**Response**: `{ success, queueSize, trades[] }`

**Valid Actions by Status**:
| Action | Allowed Status |
|--------|---------------|
| `MO_VALIDATE_PASS` | `MO_PENDING`, `PENDING_FO_RESPONSE` |
| `MO_RAISE_BREAK` | `MO_PENDING` |
| `MO_SEND_TO_FO` | `MO_BREAK_OPEN` |
| `CONFIRM_TRADE` | `CONFIRMATION_PENDING`, `LIASING_WITH_CPTY` |
| `CONFIRM_RAISE_BREAK` | `LIASING_WITH_CPTY` |
| `CONFIRM_SEND_TO_CPTY` | `CONFIRMATION_PENDING`, `CONFIRMATION_BREAK`, `LIASING_WITH_FO`, `LIASING_WITH_CPTY` |
| `CONFIRM_REJECT_CLAIM` | `CONFIRMATION_BREAK` |
| `CONFIRM_REQUEST_EVIDENCE` | `CONFIRMATION_BREAK` |
| `CONFIRM_ESCALATE_TO_FO` | `CONFIRMATION_BREAK` |
| `CONFIRM_RAISE_AMENDMENT` | `CONFIRMATION_BREAK` |
| `CONFIRM_APPROVE_AMENDMENT` | `CONFIRMATION_BREAK` |
| `CONFIRM_RESEND` | `CONFIRMATION_PENDING` |
| `SETTLEMENT_APPROVE` | `SETTLEMENT_PENDING` |
| `SETTLEMENT_RAISE_BREAK` | `READY_FOR_APPROVAL` |
| `SETTLEMENT_FOLLOW_UP_CPTY` | `SETTLEMENT_BREAK` |

**Special Rules**:
- `comment` is mandatory (400 if empty)
- `MO_VALIDATE_PASS` from `PENDING_FO_RESPONSE` requires `foResponseReceived === true`
- `MO_VALIDATE_PASS` with pending amendments requires conversation status `RESOLVED`
- `CONFIRM_RAISE_BREAK` requires exactly 1 CPTY contact and 0 FO contacts
- Emits `trade_update` socket event after successful action

---

## Conversation Routes (`/api/conversation` and `/api/conversations`) 🔒

### `POST /api/conversation/send`
Send an email message for a trade.

**Body**: `{ tradeRef, sender, message, desk }`
**Behavior**:
- If trade is MO status → sends to FO, schedules FO reply
- If trade is CONFIRMATION status → sends to CPTY, schedules CPTY reply
- Transitions trade to appropriate "liaising" state
- Emits `new_email` socket event

### `POST /api/conversation/resolve`
Resolve the break conversation for a trade (MO only).

**Body**: `{ tradeRef }`
**Requires**: `foResponseReceived === true`
**Effect**: Marks conversation RESOLVED, applies accepted amendments, transitions trade to `MO_PENDING`

### `GET /api/conversation/shared?desk=<desk>`
Get all conversations for a desk's shared inbox.

**Response**: `{ success, conversations[] }` — sorted by latest message

### `GET /api/conversation/personal`
Get conversations where the authenticated user sent a message.

**Response**: `{ success, conversations[] }`

### `GET /api/conversation/:tradeRef`
Get conversation thread for a specific trade.

**Response**: `{ success, subject, messages[] }`

---

## FO Channel Routes (`/api/fo-channel`) 🔒

### `GET /api/fo-channel/list?desk=<desk>`
List all FO internal channels for a desk.

**Response**: `{ success, conversations[] }`

### `GET /api/fo-channel/:tradeRef`
Get FO internal channel for a specific trade.

**Response**: `{ channel, messages[] }`

### `POST /api/fo-channel/send`
Send a message on the FO internal channel.

**Body**: `{ tradeRef, message }`
**Effect**: Opens channel if not open, sends message, schedules FO internal reply, transitions trade status if needed.

---

## Audit Routes (`/api/audit`) 🔒

### `GET /api/audit/:tradeRef`
Get audit trail for a trade.

**Response**:
```json
{
  "trail": [ { "tradeRef", "action", "userId", "desk", "details", "timestamp", "isAutomated" } ],
  "xmlAudit": "<xml>...</xml> or null"
}
```

---

## Clock Routes (`/api/clock`)

### `GET /api/clock`
Get current simulation time and time remaining.

**Response**: `{ simTime: "HH:MM", timeLeftMinutes: N }`

---

## Socket.io Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `join_desk` | Client → Server | `"MO"` / `"CONFIRMATION"` / `"SETTLEMENT"` | Client joins desk room |
| `leave_desk` | Client → Server | desk name | Client leaves room |
| `trade_update` | Server → Client | `{ tradeRef, currentStatus }` | Trade action performed |
| `new_email` | Server → Client | `{ tradeRef, sender?, subject?, timestamp? }` | New email/message arrived |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation failure |
| 401 | No auth token provided |
| 403 | Invalid or expired token |
| 404 | Resource not found |
| 500 | Internal server error |
