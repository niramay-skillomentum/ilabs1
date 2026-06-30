# 8. Backend API Reference

The backend Express application exposes several RESTful endpoints.

## Authentication (`authRoutes.js`)

### `POST /api/auth/register`
- **Payload:** `{ fullName, email, password }`
- **Logic:** Hashes password with `bcrypt`, saves `User`.
- **Returns:** `{ success: true, message: "..." }`

### `POST /api/auth/login`
- **Payload:** `{ email, password }`
- **Logic:** Validates password. Signs JWT. Sets `auth_token` HttpOnly cookie.
- **Returns:** `{ success: true, token, user }`

## Queue Management (`queueRoutes.js`)

### `GET /api/queue/my`
- **Query Params:** `?desk=MO|CONFIRMATION|SETTLEMENT`
- **Logic:** Finds the active `Queue` for the user. If active, populates `trades` assigned to them based on `desk` state rules.
- **Returns:** `{ success: true, trades: [...], sessionStart, sessionExpiry }`

### `POST /api/queue/generate`
- **Payload:** `{ desk }`
- **Logic:** Calls `queueComposer.js` to synthetically generate new Trades based on predefined rules (clean vs breaks). Generates a 3-hour session.
- **Returns:** `{ success: true, trades: [...] }`

## Trade Actions (`tradeRoutes.js`)

### `GET /api/trade/all`
- **Headers:** `Authorization: Bearer <token>`
- **Logic:** Returns all trades associated with the logged-in user. Used by MO-Risk.

### `POST /api/trade/action`
- **Payload:** `{ trade: { tradeRef }, action: "MO_VALIDATE_PASS", comment: "..." }`
- **Logic:** Validates the state transition. Calls `lifecycle.js` to move the trade (e.g., MO -> Confirmation). Logs an entry in `AuditLog`. Triggers Socket.io `trade_update`.
- **Returns:** `{ success: true, trades: [...] }` (Returns the updated queue).

## Settlement (`settlementRoutes.js`)

### `POST /api/settlement/select-type`
- **Payload:** `{ tradeRef, selectedType }`
- **Logic:** Validates if the user selected the correct settlement type (Bilateral vs Electronic).

### `GET /api/settlement/bilateral/:tradeRef` & `GET /api/settlement/electronic/:tradeRef`
- **Logic:** Returns the trade for the respective settlement dashboard.

### `POST /api/settlement/bilateral/action` & `POST /api/settlement/electronic/action`
- **Payload:** `{ tradeRef, action, editData }`
- **Logic:** Handles `APPROVE_SETTLEMENT`, `RAISE_BREAK`, `EDIT_SETTLEMENT`, and `MAIL_CPTY` (Bilateral only). Enforces SSI matching on approval.

## Conversations (`conversationRoutes.js` & `foChannelRoutes.js`)

### `GET /api/conversations/personal`
- **Query Params:** `?userId=X&desk=Y`
- **Logic:** Fetches `Conversation` documents where `messages` contain emails addressed to/from the counterparty.

### `GET /api/conversation/:tradeRef`
- **Logic:** Returns the specific `Conversation` document.

### `POST /api/conversation/send`
- **Payload:** `{ tradeRef, sender, message, desk }`
- **Logic:** Appends a message to `Conversation`. **Crucially**, if the desk is sending a message to a bot (FO or CPTY), this triggers the `communicationEngine` to query the LLM. 
- **Returns:** `{ success: true }`

### `POST /api/conversation/resolve`
- **Payload:** `{ tradeRef, userId }`
- **Logic:** Marks a conversation as resolved, updating `Trade.conversation.status = "RESOLVED"`.

### `GET /api/fo-channel/list`
- **Logic:** Fetches threads from `FOCommunication` model.

### `POST /api/fo-channel/send`
- **Logic:** Sends an escalation message to Front Office. Triggers `foInternalChannel.js` which queues a prompt to the FO AI.

## Session (`sessionRoutes.js`)

### `GET /api/session/info`
- **Logic:** Decodes the JWT and returns `{ success: true, userId, fullName }`.

### `POST /api/session/logout`
- **Logic:** Clears the `auth_token` cookie. Can also deactivate the active Queue.

## Audit (`auditRoutes.js`)

### `GET /api/audit/:tradeRef`
- **Logic:** Returns an array of `AuditLog` documents sorted by timestamp. Used for the Audit Trail popup in the workstation.
