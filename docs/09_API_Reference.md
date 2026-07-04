# 09 · API Reference

[← 08 Frontend Components](08_Frontend_Components.md) | [INDEX](INDEX.md) | Next: [10 Backend Engines →](10_Backend_Engines.md)

---

**Base URL:** backend `http://localhost:3002` (frontend calls relative `/api/*`, proxied by Next).
**Global middleware:** `cors()` (wide open) → `express.json()`. **Auth:** `authenticateToken` on all routes except `POST /api/auth/*` (rate-limited only) and `GET /api/clock` (public). **`req.user.userId` = email.**

Legend: 🔓 public · 🔑 JWT required · ⏱ rate-limited.

---

## Endpoint index

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | ⏱ | Create user |
| POST | `/api/auth/login` | ⏱ | Login, issue JWT |
| GET | `/api/session/info` | 🔑 | Active session summary |
| POST | `/api/session/logout` | 🔑 | End session, clear cookie |
| GET | `/api/clock` | 🔓 | Simulated time + minutes to close |
| POST | `/api/queue/generate` | 🔑 | Build a 20-trade queue |
| GET | `/api/queue/my` | 🔑 | Fetch active queue |
| GET | `/api/trade/all` | 🔑 | All trades (global) |
| POST | `/api/trade/action` | 🔑 | **Core state-machine action** |
| POST | `/api/conversation(s)/send` | 🔑 | Send email (CPTY/FO) |
| POST | `/api/conversation(s)/resolve` | 🔑 | Resolve break → MO |
| GET | `/api/conversation(s)/shared` | 🔑 | Group inbox (by desk) |
| GET | `/api/conversation(s)/personal` | 🔑 | Personal inbox |
| GET | `/api/conversation(s)/:tradeRef` | 🔑 | Thread messages |
| GET | `/api/fo-channel/list` | 🔑 | FO channel inbox |
| GET | `/api/fo-channel/:tradeRef` | 🔑 | FO thread |
| POST | `/api/fo-channel/send` | 🔑 | Send FO internal message |
| GET | `/api/audit/:tradeRef` | 🔑 | Audit trail + XML |
| POST | `/api/settlement/amend` | 🔑 | Schedule system amendment |
| POST | `/api/settlement/send-for-approval` | 🔑 | Schedule verification |
| POST | `/api/settlement/settle` | 🔑 | APPROVED → SETTLED |
| GET | `/api/system-mailbox/list` | 🔑 | System notifications |
| POST | `/api/system-mailbox/read` | 🔑 | Mark read |
| GET | `/api/ssi/search` | 🔑 | SSI lookup by id (legacy) |
| GET | `/api/ssi/search-codes` | 🔑 | SSI lookup by alert+acronym |
| POST | `/api/chat/tutor` | 🔑 | AI tutor reply |

---

## 1. Auth — [authRoutes.js](../src/routes/authRoutes.js)

Rate limiter `authLimiter`: 15 req / 15 min / IP → over-limit `429 {error:"Too many requests..."}`.

### `POST /api/auth/register` ⏱
- **Body:** `{ fullName, email, password }` (all required).
- **Logic:** validate → `bcrypt.hash(password,10)` → `User.findOne({email})` (dup → 400) → `new User().save()`.
- **200:** `{ success:true, message:"Registration successful" }` · **400:** validation/duplicate · **500:** `{error}`.

### `POST /api/auth/login` ⏱
- **Body:** `{ email, password }`.
- **Logic:** `User.findOne` → `bcrypt.compare` → `jwt.sign({userId:email, fullName}, JWT_SECRET, {expiresIn:"3h"})` → `Set-Cookie auth_token (HttpOnly, SameSite=Lax, 3h, +Secure in prod)`.
- **200:** `{ success:true, token, user:{email,fullName} }` · **400:** `"Invalid email or password"` (both user-not-found and wrong-password) · **500:** `{error}`.

## 2. Session — [sessionRoutes.js](../src/routes/sessionRoutes.js)

### `GET /api/session/info` 🔑
- `queueComposer.getActiveQueue(userId)`. **200:** `{ success, hasActiveSession, userId, fullName [, desk, queueSize, sessionStart, sessionExpiry] }`.

### `POST /api/session/logout` 🔑
- `queueComposer.endSession(userId)` (does NOT unassign trades) + clears cookie (`Max-Age=0`). **200:** `{ success:true }`.

## 3. Clock — [clockRoutes.js](../src/routes/clockRoutes.js)

### `GET /api/clock` 🔓
- `simulationClock.getTime()`; `timeLeftMinutes = 18*60 - (h*60+m)`. **200:** `{ simTime, timeLeftMinutes }`. No try/catch.

## 4. Queue — [queueRoutes.js](../src/routes/queueRoutes.js)

### `POST /api/queue/generate` 🔑
- **Body:** `{ desk }` ∈ {MO,CONFIRMATION,SETTLEMENT} (else 400).
- **Logic:** `simulationClock.reset()/start()` → `queueComposer.buildQueue(desk,userId)`.
- **200:** `{ success:true, desk, queueSize, trades, sessionStart, sessionExpiry }`.
- ⚠️ If `buildQueue` throws `"Complete your current queue first"` → **200** `{ success:false, error }` (not an error code). Other errors → **500**.

### `GET /api/queue/my?desk=` 🔑
- `getActiveQueue(userId)`; if `desk` mismatches active queue's desk → `400 { error:"Complete your <desk> desk queue first", activeDesk }`; `touchSession`.
- **200:** `{ success, desk, queueSize, trades, sessionStart, sessionExpiry }` · **400:** no queue / wrong desk.

## 5. Trade — [tradeRoutes.js](../src/routes/tradeRoutes.js)

### `GET /api/trade/all` 🔑
- `Trade.find({}).select("tradeRef tradeDate valueDate currentStatus nextDesk amount currency counterparty direction entity foRegion product tradeType settlementType age truths pendingAmendments").sort({_id:-1})`.
- ⚠️ **Returns ALL trades globally** (not user-scoped). **200:** `{ success:true, trades }`.

### `POST /api/trade/action` 🔑 — the core endpoint
- **Body:** `{ trade, action, issueType, comment }`. `comment` **mandatory** (empty → 400). `trade.tradeRef` required; server re-fetches by `{tradeRef, assignedTo:userId}` (client object not trusted). `issueType` destructured but unused.
- **Guard:** `allowedActions[action]` must include `currentStatus` (else `400 "Invalid action for current state"`). Full map:

| action | legal statuses |
|---|---|
| `MO_VALIDATE_PASS` | MO_PENDING, PENDING_FO_RESPONSE |
| `MO_RAISE_BREAK` | MO_PENDING |
| `MO_SEND_TO_FO` | MO_BREAK_OPEN |
| `CONFIRM_TRADE` | LIASING_WITH_CPTY |
| `CONFIRM_RAISE_BREAK` | LIASING_WITH_CPTY |
| `CONFIRM_SEND_TO_CPTY` | CONFIRMATION_PENDING, CONFIRMATION_BREAK, LIASING_WITH_FO, LIASING_WITH_CPTY |
| `CONFIRM_REJECT_CLAIM` | CONFIRMATION_BREAK |
| `CONFIRM_REQUEST_EVIDENCE` | CONFIRMATION_BREAK |
| `CONFIRM_ESCALATE_TO_FO` | CONFIRMATION_BREAK |
| `CONFIRM_RAISE_AMENDMENT` | CONFIRMATION_BREAK |
| `CONFIRM_APPROVE_AMENDMENT` | CONFIRMATION_BREAK |
| `CONFIRM_RESEND` | CONFIRMATION_PENDING |
| `SETTLEMENT_APPROVE` | LIASING_WITH_CPTY, AMENDED |
| `SETTLEMENT_RAISE_BREAK` | LIASING_WITH_CPTY |
| `SETTLEMENT_MAIL_CPTY` | SETTLEMENT_PENDING |

- **Behavior:** see per-action table in [06 §6.2–6.4](06_User_Flows.md). Engines called: `LifecycleEngine.transition`, `amendmentEngine`, `conversationEngine.createMessage`, `communicationEngine.scheduleReply`, `foInternalChannel`, `systemWorkflowEngine.scheduleVerification`, `truthEngine`, `auditEngine.recordEvent`.
- **Response (generic):** `200 { success:true, queueSize, trades }`, then emits `trade_update {tradeRef,currentStatus}` to `user_<userId>`, then fire-and-forget audit.
- **`SETTLEMENT_APPROVE`** special path: transition to `PENDING_APPROVAL`, `scheduleVerification`, awaited audit, then respond + emit.
- ⚠️ `CONFIRM_SEND_BACK_TO_MO`, `SETTLEMENT_SEND_BACK_TO_MO`, `default` are unreachable (guarded out).
- **Errors:** 404 (not in session), 400 (many variants), 500.

## 6. Conversations — [conversationRoutes.js](../src/routes/conversationRoutes.js) (mounted at `/api/conversation` **and** `/api/conversations`)

### `POST .../send` 🔑
- **Body:** `{ tradeRef, sender, message, desk }` (author = `sender` from body, not `req.user`).
- `conversationEngine.createMessage` (sanitized) → MO branch (schedule FO reply, maybe transition `MO_BREAK_OPEN→PENDING_FO_RESPONSE`) or CPTY branch (schedule CPTY reply, maybe `→LIASING_WITH_CPTY`) → emit `new_email` → audit `EMAIL_SENT`. **200** `{success:true}`.
- ⚠️ No try/catch; null trade in CPTY branch → 500.

### `POST .../resolve` 🔑
- **Body:** `{ tradeRef }`. Guard `foResponseReceived` else `400`. Set `conversation.status="RESOLVED"`, apply accepted amendments, transition `→ MO_PENDING`. Audit `BREAK_RESOLVED`. **200** `{success, message, newStatus}`.

### `GET .../shared?desk=` 🔑
- Threads on `Conversation.desks=desk` + active `Queue` trades; placeholders for archived trades. **200** `{success, conversations:[{trade, conversation}]}`.

### `GET .../personal` 🔑
- `Conversation.find({"messages.sender": userId})`. **200** `{success, conversations}`.

### `GET .../:tradeRef` 🔑
- `conversationEngine.getConversation(tradeRef)`. **200** `{success, subject, messages}` (empty if none).

## 7. FO Channel — [foChannelRoutes.js](../src/routes/foChannelRoutes.js)

### `GET /api/fo-channel/list?desk=` 🔑
- `FOCommunication.find({desk})` joined to trades; message sender mapped from `senderRole`. **200** `{success, conversations}` · **500** `{error:"Server error"}` (generic).

### `GET /api/fo-channel/:tradeRef` 🔑
- `foInternalChannel.getChannel`. **200** `{channel:status|null, messages}`.

### `POST /api/fo-channel/send` 🔑
- **Body:** `{ tradeRef, message }` (both required). ⚠️ `Trade.findOne({tradeRef})` **without** `assignedTo` filter. Transitions to `PENDING_FO_RESPONSE`/`LIASING_WITH_FO`, `foContactCount++`, opens channel, sends message, `scheduleFOInternalReply`. Emit `new_email`. **200** `{success:true}`.

## 8. Audit — [auditRoutes.js](../src/routes/auditRoutes.js)

### `GET /api/audit/:tradeRef` 🔑
- `auditEngine.getAuditTrail(tradeRef)` + `Trade.auditXml`. **200** `{ trail:[], xmlAudit:string|null }` (⚠️ **no `success` field**).

## 9. Settlement — [settlementRoutes.js](../src/routes/settlementRoutes.js)

### `POST /api/settlement/amend` 🔑
- **Body:** `{ tradeRef, settlementType }`. Status must be `SETTLEMENT_BREAK`/`REJECTED_REVERIFY` (else 400). `systemWorkflowEngine.scheduleAmendment`. **200** `{success, trade, currentStatus}` · errors → **400** (not 500).

### `POST /api/settlement/send-for-approval` 🔑
- **Body:** `{ tradeRef }`. Status must be `AMENDED`. `scheduleVerification`. **200** `{success, trade, currentStatus}`.

### `POST /api/settlement/settle` 🔑
- **Body:** `{ tradeRef }`. Status must be `APPROVED`. `LifecycleEngine.transition(→SETTLED)`, save, awaited audit `SETTLEMENT_SETTLED`, emit `trade_update`. **200** `{success, trade, currentStatus}`.

## 10. System Mailbox — [systemMailboxRoutes.js](../src/routes/systemMailboxRoutes.js)

### `GET /api/system-mailbox/list` 🔑
- `SystemMail.find({userId}).sort({timestamp:1})` grouped by tradeRef. **200** `{success, conversations}` (shaped like `/personal`).

### `POST /api/system-mailbox/read` 🔑
- **Body:** `{ tradeRef? }`. `SystemMail.updateMany({userId, read:false [,tradeRef]}, {read:true})`. **200** `{success:true}`.

## 11. SSI — [ssiRoutes.js](../src/routes/ssiRoutes.js)

In-memory only (searches `CPTY_SSIS` + `ENTITY_SSIS` from tradeGenerator; no DB).

### `GET /api/ssi/search?id=` 🔑 (legacy)
- Find `ssi.ssiId===id`. **200** `{success, ssi}` · **404** not found.

### `GET /api/ssi/search-codes?alertCode=&acronymCode=` 🔑
- Both required (else 400). Find `ssi.alertCode===A && ssi.acronymCode===B`. **200** `{success, ssi}` · **404** `"No SSI found matching both codes..."`.

## 12. Chat/Tutor — [chatRoutes.js](../src/routes/chatRoutes.js)

### `POST /api/chat/tutor` 🔑
- **Body:** `{ message, desk, tradeContext, history }` (`message` required). `tutorAI.generateTutorResponse` (OpenRouter/Nemotron). **200** `{ reply }` · **500** `{error:"Failed to generate tutor response."}`.

---

## Cross-cutting API notes

1. **`req.user.userId` = email** — all `assignedTo` ownership filters key on email.
2. **Only `GET /api/clock` is public.**
3. **Rate limiting only on `/api/auth/*`.**
4. **Socket emits from routes:** `trade_update {tradeRef,currentStatus}` (to `user_<userId>`) from trade/settlement routes; `new_email` (global `io.emit`) from conversation/fo-channel `send`. All wrapped in try/catch, swallowed on failure.
5. **Audit writes are fire-and-forget** except `settlement/settle` (awaited).
6. **Inconsistent `success` flag:** `GET /api/audit/:tradeRef` omits it; `POST /api/queue/generate` can return 200 with `success:false`.
7. **Ownership gaps (see [20](20_Security_Analysis.md)):** `GET /api/trade/all` is global; `POST /api/fo-channel/send` and conversation send/resolve don't scope by the calling user.

---
[← 08 Frontend Components](08_Frontend_Components.md) | [INDEX](INDEX.md) | Next: [10 Backend Engines →](10_Backend_Engines.md)
