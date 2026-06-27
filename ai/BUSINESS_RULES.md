# Business Rules

## Core Simulation Rules

### Session Rules
1. One active session per user at a time — you cannot start a new queue while one exists
2. Session duration = **3 real hours** (mapped to 9 AM–6 PM simulated trading day)
3. Session expires automatically — user is logged off at `sessionExpiry`
4. Simulation clock starts at **9:00 AM** on `sessionStart` and runs in real-time (1:1 mapping)
5. Alerts fire at: **60 minutes remaining** and **10 minutes remaining**
6. At 0 time remaining → auto logoff

### Queue Rules
7. Every queue contains exactly **20 trades**:
   - **12 clean trades** (no MO break) 
   - **8 break trades** (have a mismatch between `truths.mo` and `booking`)
8. Queue uses **graduated DB allocation**: pulls from DB pool when available; generates fresh when pool is small
9. Queue allocation formula: `20 * (1 - e^(-0.003 * availablePool))` — exponential decay
10. Full pool threshold: 1,000 unassigned trades in DB → allocates all 20 from DB
11. Minimum DB pool: 50 — below this, everything is freshly generated
12. Trades must be unassigned (`assignedTo: null`) to be eligible for allocation

### Trade Break Rules
13. **MO Break types**: AMOUNT, VALUE_DATE, CURRENCY, COUNTERPARTY mismatches
14. **Confirmation Break types**: AMOUNT, VALUE_DATE, CURRENCY only (no counterparty mismatch at confirmation level — this is a deliberate design decision)
15. ~**30% of MO-clean trades** also have a confirmation-level discrepancy
16. Break detection: compare `truths.mo` vs `booking` for MO breaks; compare `truths.confirmation` vs trade economics for confirmation breaks

---

## Action Business Rules

### MO Desk
| Rule | Description |
|------|-------------|
| MO-01 | `MO_VALIDATE_PASS` moves trade to CONFIRMATION_PENDING |
| MO-02 | `MO_VALIDATE_PASS` from `PENDING_FO_RESPONSE` requires `foResponseReceived === true` |
| MO-03 | `MO_VALIDATE_PASS` with pending amendments requires conversation status = `RESOLVED` |
| MO-04 | Accepted amendments are applied to trade fields before MO pass |
| MO-05 | `MO_RAISE_BREAK` moves to `MO_BREAK_OPEN` — user must then email FO |
| MO-06 | `MO_SEND_TO_FO` is only available from `MO_BREAK_OPEN` — transitions to `PENDING_FO_RESPONSE` |
| MO-07 | Sending an email from `MO_BREAK_OPEN` via conversation route auto-transitions to `PENDING_FO_RESPONSE` |

### Confirmation Desk
| Rule | Description |
|------|-------------|
| CONF-01 | `CONFIRM_TRADE` from `CONFIRMATION_PENDING` or `LIASING_WITH_CPTY` moves to `SETTLEMENT_PENDING` |
| CONF-02 | `CONFIRM_RAISE_BREAK` can only be raised **once** — exactly after the **1st** CPTY contact, with 0 FO contacts |
| CONF-03 | `CONFIRM_SEND_TO_CPTY` increments `cptyContactCount` and schedules a CPTY reply |
| CONF-04 | `CONFIRM_ESCALATE_TO_FO` opens FO internal channel, increments `foContactCount`, sets `foEscalation.status = PENDING` |
| CONF-05 | `CONFIRM_REJECT_CLAIM` or `CONFIRM_REQUEST_EVIDENCE` — if FO has confirmed our position (`FO_SUPPORTS_US`) AND booking matches universal truth → CPTY concedes (truths.confirmation auto-corrects) |
| CONF-06 | `CONFIRM_APPROVE_AMENDMENT` accepts all pending amendments and applies them, resets to `CONFIRMATION_PENDING` |
| CONF-07 | `CONFIRM_RESEND` sends an amended confirmation to CPTY |
| CONF-08 | `CONFIRM_RAISE_AMENDMENT` stays in `CONFIRMATION_BREAK` — does not transition |

### Settlement Desk
| Rule | Description |
|------|-------------|
| SETT-01 | `SETTLEMENT_APPROVE` from `SETTLEMENT_PENDING` → `READY_FOR_APPROVAL` |
| SETT-02 | `SETTLEMENT_RAISE_BREAK` from `READY_FOR_APPROVAL` → `SETTLEMENT_BREAK` |
| SETT-03 | `SETTLEMENT_FOLLOW_UP_CPTY` from `SETTLEMENT_BREAK` → `LIASING_WITH_CPTY` |

### General Action Rules
| Rule | Description |
|------|-------------|
| GEN-01 | Every action requires a **mandatory comment** (400 error if empty) |
| GEN-02 | All actions are validated server-side against allowed action/status matrix |
| GEN-03 | Client-side trade object is **never trusted** — backend always re-fetches from DB |
| GEN-04 | Trade must be assigned to the requesting user (`assignedTo === userId`) |
| GEN-05 | Each action is logged to `AuditLog` (fire-and-forget, non-blocking) |
| GEN-06 | Each action emits a `trade_update` WebSocket event |

---

## Communication Business Rules

### Email Routing
| Rule | Description |
|------|-------------|
| COMM-01 | If trade status starts with `MO_` or is `PENDING_FO_RESPONSE` → email goes to FO |
| COMM-02 | Otherwise → email goes to COUNTERPARTY |
| COMM-03 | Sending email from `MO_BREAK_OPEN` auto-transitions trade to `PENDING_FO_RESPONSE` |
| COMM-04 | Sending email from confirmation desk increments `cptyContactCount` |

### AI Response Rules
| Rule | Description |
|------|-------------|
| AI-01 | CPTY/FO replies are **simulated asynchronously** with 4–12 second random delay |
| AI-02 | LLM provider priority: Gemini → Cerebras → Groq (commented out) → offline static responses |
| AI-03 | CPTY AI analyses the trade to decide: agree / dispute / concede / request amendment |
| AI-04 | FO AI analyses trade context: supports the desk / finds error / investigates |
| AI-05 | FO internal channel replies have a separate scheduling pathway from CPTY emails |

### Conversation Resolution
| Rule | Description |
|------|-------------|
| RES-01 | `/api/conversation/resolve` requires `foResponseReceived === true` |
| RES-02 | Resolution accepts all pending amendments and applies them to trade |
| RES-03 | Resolved conversation transitions trade back to `MO_PENDING` for re-validation |
| RES-04 | Conversation status persists across server restarts in the `Trade.conversation` sub-document |

---

## Break Detection Logic

### MO Break (src/engine/queueComposer.js `isBreakTrade()`)
Compares `truths.mo` vs `trade.booking`:
- Amount mismatch: `moTruth.amount !== booking.amount`
- Value date mismatch: date comparison after `new Date().getTime()`
- Currency mismatch: string comparison
- Counterparty mismatch: string comparison

### Confirmation Break (src/engine/truthEngine.js `getConfirmationMismatches()`)
Compares `truths.confirmation` vs trade economics (amount, valueDate, currency only).

### Universal Truth Check (truthEngine.js `getMismatchFields()`)
Used to determine if the trade's booking matches the universal ground truth — drives CPTY concession logic.

---

## Scoring Rules

- Every action with a comment contributes positively to scoring
- Actions without comments incur a penalty
- Final scoring stored in `UserScore` collection
- Implementation: `src/engine/scoringEngine.js`

---

## Session Termination Rules

1. User explicitly logs off → `POST /api/session/logout` → calls `queueComposer.endSession()`
2. Session timer reaches zero → frontend auto-calls logout
3. Simulation market closes (6 PM sim time) → frontend auto-calls logout
4. Agenda jobs may sweep expired sessions periodically
