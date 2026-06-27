content: # Business Rules

> Last updated: 2026-06-27

---

## Session & Queue Rules

| # | Rule |
|---|------|
| SR-01 | One active session per user at a time. `buildQueue()` throws `"Complete your current queue first"` if `Queue.isActive === true` and `sessionExpiry` has not passed |
| SR-02 | Session duration = **3 real hours** from `sessionStart`. `sessionExpiry = sessionStart + 10800000ms` |
| SR-03 | Simulation clock maps real session time to 9:00 AM – 6:00 PM trading day (1:1 ratio) |
| SR-04 | Frontend alerts fire at **60 minutes remaining** and **10 minutes remaining** (guarded by `useRef` booleans to prevent repeat alerts) |
| SR-05 | Session expires automatically — frontend auto-calls logout when `diff <= 0` in the timer interval |
| SR-06 | Every queue contains exactly **20 trades**: 12 clean + 8 break |
| SR-07 | Break trades for MO are distributed: ~50% as `MO_PENDING` (break hidden), ~50% as `MO_BREAK_OPEN` (break pre-identified) |
| SR-08 | ~30% of MO-clean trades also have a **hidden confirmation-level discrepancy** — invisible to MO, only discovered at Confirmation desk |
| SR-09 | Queue allocation uses exponential decay: `dbCount = floor(20 * (1 - e^(-0.003 * availablePool)))`. Below 50 unassigned trades → all 20 generated fresh |
| SR-10 | Trade must have `assignedTo: null` to be eligible for pool allocation |
| SR-11 | `Queue.lastActivity` is updated on every `GET /api/queue/my` and every trade action |

---

## Trade Generation Truth Model

Trades are generated in `src/engine/tradeGenerator.js` with a **three-scenario distribution**:

| Scenario | Probability | MO Truth | CPTY Truth | Description |
|----------|------------|----------|------------|-------------|
| 1 | 40% | = Universal | = Universal | Fully clean — no discrepancy anywhere |
| 2 | 30% | ≠ Universal | = Universal | FO made an error; CPTY is correct |
| 3 | 30% | = Universal | ≠ Universal | CPTY made an error; FO is correct |

- **MO break**: Injected by making `booking` differ from `truths.mo` (on top of the scenario above)
- **MO break types**: AMOUNT, VALUE_DATE, CURRENCY, COUNTERPARTY
- **Confirmation break types**: AMOUNT, VALUE_DATE, CURRENCY only — **no COUNTERPARTY mismatch** (by design, per business requirement)

---

## MO Desk Rules

| Rule | Description |
|------|-------------|
| MO-01 | `MO_VALIDATE_PASS` transitions trade from `MO_PENDING` → `CONFIRMATION_PENDING` |
| MO-02 | `MO_VALIDATE_PASS` from `PENDING_FO_RESPONSE` requires `foResponseReceived === true`; otherwise 400 error |
| MO-03 | `MO_VALIDATE_PASS` when conversation exists and `pendingAmendments` is non-empty requires `conversation.status === "RESOLVED"`; otherwise 400 |
| MO-04 | On MO pass, accepted amendments are applied to trade fields via `amendmentEngine.applyAllAccepted()` before transition |
| MO-05 | `MO_RAISE_BREAK` transitions `MO_PENDING` → `MO_BREAK_OPEN` |
| MO-06 | `MO_SEND_TO_FO` is only valid from `MO_BREAK_OPEN` → transitions to `PENDING_FO_RESPONSE` |
| MO-07 | Sending email via `/api/conversation/send` from `MO_BREAK_OPEN` automatically transitions trade to `PENDING_FO_RESPONSE` |
| MO-08 | `/api/conversation/resolve` requires `foResponseReceived === true`; applies accepted amendments; sets `conversation.status = "RESOLVED"`; transitions to `MO_PENDING` |

---

## Confirmation Desk Rules

| Rule | Description |
|------|-------------|
| CONF-01 | `CONFIRM_TRADE` from `CONFIRMATION_PENDING` or `LIASING_WITH_CPTY` → `SETTLEMENT_PENDING` |
| CONF-02 | `CONFIRM_RAISE_BREAK` is gated: exactly **1 CPTY contact** and **0 FO contacts** (`cptyContactCount === 1 && foContactCount === 0`); otherwise 400 |
| CONF-03 | `CONFIRM_SEND_TO_CPTY` increments `cptyContactCount` and schedules a CPTY AI reply |
| CONF-04 | `CONFIRM_ESCALATE_TO_FO` opens FO internal channel, increments `foContactCount`, sets `foEscalation.status = "PENDING"` |
| CONF-05 | `CONFIRM_REJECT_CLAIM` or `CONFIRM_REQUEST_EVIDENCE` — if `foEscalation.status === "FO_SUPPORTS_US"` AND booking matches universal truth → CPTY concedes automatically (`truths.confirmation` corrected to match booking) |
| CONF-06 | `CONFIRM_APPROVE_AMENDMENT` accepts all pending amendments, applies them to trade fields, resets to `CONFIRMATION_PENDING` |
| CONF-07 | `CONFIRM_RESEND` sends amended confirmation to CPTY |
| CONF-08 | `CONFIRM_RAISE_AMENDMENT` stays in `CONFIRMATION_BREAK` — no status transition |

---

## Settlement Desk Rules

| Rule | Description |
|------|-------------|
| SETT-01 | `SETTLEMENT_APPROVE` from `SETTLEMENT_PENDING` → `READY_FOR_APPROVAL` |
| SETT-02 | `SETTLEMENT_RAISE_BREAK` from `READY_FOR_APPROVAL` → `SETTLEMENT_BREAK` |
| SETT-03 | `SETTLEMENT_FOLLOW_UP_CPTY` from `SETTLEMENT_BREAK` → `LIASING_WITH_CPTY` |

---

## General Action Rules

| Rule | Description |
|------|-------------|
| GEN-01 | Every action requires a **mandatory, non-empty comment** — server returns 400 if `comment` is missing or blank |
| GEN-02 | All actions are validated server-side against the allowed `action → status` matrix in `src/routes/tradeRoutes.js` |
| GEN-03 | Client-side trade object is **never trusted** — backend always re-fetches from DB with `{ tradeRef, assignedTo: userId }` |
| GEN-04 | Trade must be assigned to the requesting user (`trade.assignedTo === req.user.userId`) |
| GEN-05 | Each action is logged to `AuditLog` (fire-and-forget — never blocks response) |
| GEN-06 | Each action emits a `trade_update` Socket.io event with `{ tradeRef, currentStatus }` |

---

## Action → Allowed Status Matrix

| Action | Allowed From Statuses |
|--------|----------------------|
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

---

## Communication Routing Rules

| Rule | Description |
|------|-------------|
| COMM-01 | If trade status starts with `MO_` or is `PENDING_FO_RESPONSE` → email routes to **FO** |
| COMM-02 | Otherwise → email routes to **COUNTERPARTY** |
| COMM-03 | Sending email from `MO_BREAK_OPEN` auto-transitions trade to `PENDING_FO_RESPONSE` |
| COMM-04 | Sending email from Confirmation desk increments `cptyContactCount` (via `CONFIRM_SEND_TO_CPTY`) |

---

## AI Response Rules

| Rule | Description |
|------|-------------|
| AI-01 | CPTY/FO replies are **simulated asynchronously** with a randomized **4–12 second delay** (`Math.random() * 8000 + 4000`) |
| AI-02 | LLM provider priority: **Gemini** → **Cerebras** → **offline static responses** |
| AI-03 | CPTY AI analyses trade scenario (truths, booking, conversation history) and decides: agree / dispute / concede / request amendment |
| AI-04 | FO AI analyses trade context (truths, break description, conversation) and responds: supports desk / found error / investigating |
| AI-05 | FO internal channel replies follow a separate scheduling pathway via `foInternalChannel.scheduleFOInternalReply()` |
| AI-06 | If all LLM providers fail, `offlineResponseEngine.js` selects a contextually appropriate static response |

---

## Conversation Resolution Rules

| Rule | Description |
|------|-------------|
| RES-01 | `/api/conversation/resolve` requires `trade.foResponseReceived === true` |
| RES-02 | Resolution accepts all pending amendments and applies them to trade fields |
| RES-03 | Resolved conversation sets `trade.conversation.status = "RESOLVED"` and `resolvedAt` timestamp |
| RES-04 | After resolution, trade transitions back to `MO_PENDING` for re-validation |
| RES-05 | Conversation `status` field persists across server restarts (stored in MongoDB, not in-memory) |

---

## Break Detection Logic

### MO Break Detection (`queueComposer.js` → `isBreakTrade()`)

Compares `truths.mo` vs `trade.booking`:
```js
moTruth.amount !== booking.amount
new Date(moTruth.valueDate).getTime() !== new Date(booking.valueDate).getTime()
moTruth.currency !== booking.currency
moTruth.counterparty !== booking.counterparty
```
Any single mismatch = break trade.

### Confirmation Break Detection (`truthEngine.js` → `getConfirmationMismatches()`)

Compares `truths.confirmation` vs trade economics (`amount`, `valueDate`, `currency` only — **no counterparty**).

### CPTY Concession Logic (`truthEngine.js` → `getMismatchFields()`)

Used in `CONFIRM_REJECT_CLAIM` / `CONFIRM_REQUEST_EVIDENCE` to decide if CPTY automatically concedes:
- If `foEscalation.status === "FO_SUPPORTS_US"` AND `booking` matches `truths.universal` → CPTY was wrong → `truths.confirmation` corrected → trade reverts to clean

---

## Scoring Rules

- Every action with a comment earns positive points
- Missing comment is blocked at API level (never reaches scoring)
- Final scores stored in `UserScore` collection per user
- Implementation: `src/engine/scoringEngine.js`
- Score display UI does not yet exist (backend only)

---

## Session Termination Paths

| Path | Trigger | Handler |
|------|---------|---------|
| 1 | User clicks logout | `POST /api/session/logout` → `queueComposer.endSession(userId)` |
| 2 | 3-hour timer expires | Frontend timer calls logout |
| 3 | Market close (6 PM sim time) | Frontend sim clock calls logout |
| 4 | Expired session on next login | `buildQueue()` detects `sessionExpiry < now`, calls `expireSession(userId)` |
| 5 | Agenda sweep | Periodic job may sweep expired sessions |

In all cases, `endSession()` sets `Queue.isActive = false` and unassigns all trades (`assignedTo = null`) to return them to the pool.
 file_path: /workspace/ilabs1/ai/BUSINESS_RULES.md