# API Reference

> Complete API endpoint documentation for the SGB Operations Simulator backend.

---

## 1. Cross-Cutting Notes

- **Base URL**: `http://localhost:3002/api`
- **Authentication**: All endpoints (except `/auth/login` and `/auth/register`) require JWT Bearer token
- **Auth Header**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Rate Limiting**: Applied via `express-rate-limit`

---

## 2. Authentication

### POST `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "User registered successfully",
  "user": { "email": "john@example.com", "fullName": "John Doe" }
}
```

---

### POST `/api/auth/login`

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "email": "john@example.com", "fullName": "John Doe" }
}
```

---

## 3. Session

### GET `/api/session/info`

Get current session information. **Auth required.**

**Response (200):**
```json
{
  "userId": "john@example.com",
  "fullName": "John Doe",
  "queue": { "desk": "MO", "sessionExpiry": "2026-07-04T12:00:00Z" }
}
```

---

### POST `/api/session/logout`

End current session. **Auth required.**

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 4. Clock

### GET `/api/clock/status`

Get simulated market clock status. **Auth required.**

**Response (200):**
```json
{
  "isRunning": true,
  "currentTime": "09:30:00",
  "currentDate": "2026-07-04",
  "speed": 1
}
```

---

## 5. Queue

### GET `/api/queue/my?desk=<desk>`

Get the current user's trade queue for the specified desk. **Auth required.**

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `desk` | String | Yes | Desk name (MO, CONFIRMATION, SETTLEMENT, TLM, REPORTING) |

**Response (200):**
```json
{
  "queue": {
    "trades": ["TRD-20260704-0001", "TRD-20260704-0002"],
    "sessionStart": "2026-07-04T09:00:00Z",
    "sessionExpiry": "2026-07-04T12:00:00Z",
    "isActive": true
  },
  "trades": [
    {
      "tradeRef": "TRD-20260704-0001",
      "currentStatus": "MO_PENDING",
      "amount": 1500000,
      "currency": "USD",
      "counterparty": "Deutsche Bank",
      "truths": { "universal": { ... }, "mo": { ... } },
      "booking": { ... }
    }
  ]
}
```

---

### POST `/api/queue/generate`

Generate a new trade queue. **Auth required.**

**Response (200):**
```json
{
  "message": "Queue generated",
  "count": 10,
  "desk": "MO"
}
```

---

## 6. Trade Actions

### GET `/api/trade/all`

Fetch all trades. **Auth required.**

**Response (200):** Array of trade objects.

---

### POST `/api/trade/action`

Execute a trade lifecycle action. **Auth required.** This is the **core state machine endpoint**.

**Request Body:**
```json
{
  "tradeRef": "TRD-20260704-0001",
  "action": "MO_VALIDATE_PASS",
  "desk": "MO",
  "userId": "john@example.com"
}
```

**Allowed Actions by Desk:**

| Desk | Action | From Status | To Status |
|------|--------|-------------|-----------|
| MO | `MO_VALIDATE_PASS` | MO_PENDING | CONFIRMATION_PENDING |
| MO | `MO_RAISE_BREAK` | MO_PENDING | MO_BREAK_OPEN |
| MO | `MO_RESOLVE_BREAK` | MO_BREAK_OPEN | MO_PENDING |
| MO | `MO_ESCALATE_TO_FO` | MO_BREAK_OPEN | PENDING_FO_RESPONSE |
| Confirmation | `CONFIRM_TRADE` | CONFIRMATION_PENDING | SETTLEMENT_PENDING |
| Confirmation | `CONFIRM_SEND_TO_CPTY` | CONFIRMATION_PENDING | LIASING_WITH_CPTY |
| Confirmation | `CONFIRM_ESCALATE_TO_FO` | CONFIRMATION_PENDING | LIASING_WITH_FO |
| Confirmation | `CONFIRM_RAISE_BREAK` | CONFIRMATION_PENDING | CONFIRMATION_BREAK |
| Settlement | `SETTLEMENT_APPROVE` | SETTLEMENT_PENDING | SETTLED |
| Settlement | `SETTLEMENT_RAISE_BREAK` | SETTLEMENT_PENDING | SETTLEMENT_BREAK |
| Settlement | `SETTLEMENT_RESOLVE_BREAK` | SETTLEMENT_BREAK | SETTLEMENT_PENDING |

**Response (200):**
```json
{
  "message": "Action completed successfully",
  "trade": { "tradeRef": "TRD-20260704-0001", "currentStatus": "CONFIRMATION_PENDING" },
  "auditLog": { "action": "MO_VALIDATE_PASS", "performedBy": "john@example.com" }
}
```

**Error Response (400/403/404):**
```json
{
  "error": "Invalid transition from MO_PENDING to SETTLED"
}
```

---

## 7. Conversations (Email)

### GET `/api/conversations/personal?userId=<uid>&desk=<desk>`

Get personal inbox conversations. **Auth required.**

---

### GET `/api/conversations/shared?desk=<desk>`

Get shared/group inbox conversations. **Auth required.**

---

### GET `/api/conversation/<tradeRef>`

Get a specific conversation thread. **Auth required.**

---

### POST `/api/conversation/send`

Send a message (compose or reply). **Auth required.**

**Request Body:**
```json
{
  "tradeRef": "TRD-20260704-0001",
  "from": "john@example.com",
  "to": "CPTY",
  "subject": "Trade Confirmation - TRD-20260704-0001",
  "body": "Please confirm the following trade details...",
  "desk": "CONFIRMATION"
}
```

---

### POST `/api/conversation/resolve`

Mark a conversation as resolved. **Auth required.**

**Request Body:**
```json
{
  "tradeRef": "TRD-20260704-0001",
  "userId": "john@example.com"
}
```

---

## 8. FO Channel

### GET `/api/fo-channel/list?desk=<desk>`

List FO internal channel messages. **Auth required.**

---

### GET `/api/fo-channel/<tradeRef>`

Get FO channel thread for a trade. **Auth required.**

---

### POST `/api/fo-channel/send`

Send FO internal message. **Auth required.**

---

## 9. Audit

### GET `/api/audit/<tradeRef>`

Get audit trail for a specific trade. **Auth required.**

**Response (200):** Array of audit log entries.

---

## 10. Settlement

### POST `/api/settlement/amend`

Request amendment (from SETTLEMENT_BREAK or REJECTED_REVERIFY). **Auth required.**

Triggers System Workflow Engine to auto-correct to truth values.

---

### POST `/api/settlement/send-for-approval`

Trigger System Verification Bot (from AMENDED state). **Auth required.**

---

### POST `/api/settlement/settle`

Execute final settlement (from APPROVED state). **Auth required.**

---

## 11. System Mailbox

### GET `/api/system-mailbox/list`

List system mailbox notifications. **Auth required.**

---

### POST `/api/system-mailbox/read`

Mark a system mail as read. **Auth required.**

---

## 12. SSI (Standing Settlement Instructions)

### GET `/api/ssi/search?ssiId=<id>`

Legacy single SSI lookup. **Auth required.**

---

### GET `/api/ssi/search-codes?alertCode=<code>&acronymCode=<code>`

Dual-code SSI search. **Auth required.**

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `alertCode` | String | Yes | Alert code |
| `acronymCode` | String | Yes | Acronym code |

**Response (200):**
```json
{
  "beneficiaryName": "Goldman Sachs",
  "beneficiaryBank": "JP Morgan Chase",
  "beneficiaryBIC": "CHASUS33",
  "accountNumber": "123456789",
  "accountType": "CHECKING",
  "settlementMethod": "SWIFT_MT103",
  "correspondentBank": "Citibank NY"
}
```

---

## 13. AI Tutor Chat

### POST `/api/chat/tutor`

Send a message to the AI Tutor. **Auth required.**

**Request Body:**
```json
{
  "message": "What should I do when I find a break?",
  "desk": "MO"
}
```

**Response (200):**
```json
{
  "reply": "When you find a break in MO validation, you should..."
}
```

---

## 14. Socket.io Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_desk` | Client → Server | `{ desk }` | Join a desk room |
| `trade_update` | Server → Client | — | Trade queue updated |
| `new_email` | Server → Client | `{ tradeRef }` | New email received |
| `new_system_mail` | Server → Client | — | New system mail received |
