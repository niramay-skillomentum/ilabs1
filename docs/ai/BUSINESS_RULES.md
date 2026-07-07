# Business Rules

> All business rules, validation logic, and domain constraints for the SGB Operations Simulator.

---

## 1. Trade Lifecycle Rules

### 1.1 State Machine
- Trades must follow the state machine defined in `src/engine/transitions.js`
- Invalid transitions are rejected with a descriptive error
- The state machine is the single source of truth for allowed status changes

### 1.2 Initial State
- All auto-generated trades start at `MO_PENDING`
- `NEW` is a theoretical entry state — no trade is persisted as `NEW`

### 1.3 Terminal States
- `CLOSED` is the final state — no further transitions allowed
- `SETTLED` is a near-terminal state (only → `RECON_PENDING`)

---

## 2. Desk-Specific Rules

### 2.1 MO Desk (Middle Office)

| Rule | Description |
|------|-------------|
| **MO001** | MO validates trade economics against universal truths (amount, valueDate, currency, counterparty) |
| **MO002** | If all economics match → `MO_VALIDATE_PASS` → transition to `CONFIRMATION_PENDING` |
| **MO003** | If any mismatch → `MO_RAISE_BREAK` → transition to `MO_BREAK_OPEN` |
| **MO004** | From `MO_BREAK_OPEN`, user can resolve break → back to `MO_PENDING` or escalate to FO → `PENDING_FO_RESPONSE` |
| **MO005** | FO responds from `PENDING_FO_RESPONSE` → back to `MO_BREAK_OPEN` or `MO_PENDING` |
| **MO006** | Truth comparison is desk-specific: `truths.mo` vs `booking` fields |
| **MO007** | ~30% of generated trades have confirmation-level breaks injected |

### 2.2 Confirmation Desk

| Rule | Description |
|------|-------------|
| **CONF001** | From `CONFIRMATION_PENDING`, user can: confirm, raise break, liaise with CPTY, or liaise with FO |
| **CONF002** | `CONFIRM_TRADE` → transition to `SETTLEMENT_PENDING` |
| **CONF003** | `CONFIRM_SEND_TO_CPTY` → sends email to counterparty, triggers CPTY AI response, transitions to `LIASING_WITH_CPTY` |
| **CONF004** | `CONFIRM_ESCALATE_TO_FO` → triggers FO escalation |
| **CONF005** | CPTY may accept, dispute, or request amendments |
| **CONF006** | Disputes trigger evidence collection workflow |
| **CONF007** | Truth comparison uses `truths.confirmation` fields |

### 2.3 Settlement Desk

| Rule | Description |
|------|-------------|
| **SET001** | From `SETTLEMENT_PENDING`, user can: approve or raise break |
| **SET002** | `SETTLEMENT_APPROVE` → transition to `SETTLED` (if no breaks) |
| **SET003** | `SETTLEMENT_RAISE_BREAK` → transition to `SETTLEMENT_BREAK` |
| **SET004** | From `SETTLEMENT_BREAK`, user can: liaise with CPTY, go back, or request amendment |
| **SET005** | Amendment flow: `SETTLEMENT_BREAK` → `PENDING_AMENDMENT` → `AMENDED` → `PENDING_APPROVAL` |
| **SET006** | System Workflow Engine auto-processes amendments (corrects to truth values) |
| **SET007** | System Verification Bot validates economics + SSI match after amendment |
| **SET008** | From `APPROVED`, user executes `SETTLEMENT_SETTLE` → `SETTLED` |
| **SET009** | If verification fails → `REJECTED_REVERIFY` → back to `PENDING_AMENDMENT` or `SETTLEMENT_PENDING` |
| **SET010** | Truth comparison uses `truths.settlement` fields (includes SSI details) |
| **SET011** | Bilateral settlement supported (counterparty-initiated settlement flow) |

---

## 3. Communication Rules

| Rule | Description |
|------|-------------|
| **COMM001** | Users can communicate with CPTY and FO via email-like interface |
| **COMM002** | CPTY AI generates responses within seconds (via LLM or offline fallback) |
| **COMM003** | FO AI handles escalation responses |
| **COMM004** | FO internal channel is separate from CPTY conversations |
| **COMM005** | Conversations can be resolved (marked as complete) |
| **COMM006** | System mailbox receives automated notifications (amendments, verifications) |
| **COMM007** | Each desk sees only its relevant conversations |

---

## 4. Amendment Rules

| Rule | Description |
|------|-------------|
| **AMD001** | Amendments can only be requested from `SETTLEMENT_BREAK` or `REJECTED_REVERIFY` |
| **AMD002** | System auto-corrects settlement details to match `truths.settlement` |
| **AMD003** | Every amendment is recorded in `amendmentHistory` with desk, field, old/new values, source, status |
| **AMD004** | After amendment, System Verification Bot must approve before settlement |
| **AMD005** | Verification checks: trade economics consistency, counterparty match, mandatory fields, SSI match vs truth |

---

## 5. Queue & Session Rules

| Rule | Description |
|------|-------------|
| **QRY001** | Queue generation creates N trades and assigns to user |
| **QRY002** | Each user gets one active queue at a time |
| **QRY003** | Sessions last 3 hours from `sessionStart` |
| **QRY004** | Session expiry triggers auto-logout |
| **QRY005** | Session resume: if user logs in within expiry window, previous session is restored |
| **QRY006** | Simulated market clock starts on first queue generation |
| **QRY007** | User must be logged in to generate a queue |

---

## 6. Trade Generation Rules

| Rule | Description |
|------|-------------|
| **GEN001** | Trades are generated with realistic financial data (currencies, counterparties, entities) |
| **GEN002** | Each trade has desk-specific truths that may differ from visible data |
| **GEN003** | Truths define what the "correct" values should be at each desk |
| **GEN004** | Breaks are injected by making visible data differ from truth values |
| **GEN005** | Trade references follow format `TRD-YYYYMMDD-NNNN` |
| **GEN006** | Settlement details include SSI codes (alertCode + acronymCode) |
| **GEN007** | Audit XML is generated per trade for regulatory trail |

---

## 7. SSI (Standing Settlement Instructions) Rules

| Rule | Description |
|------|-------------|
| **SSI001** | SSI lookup requires Alert Code AND Acronym Code |
| **SSI002** | SSI data includes: beneficiary name, bank, BIC/SWIFT, account number, account type, settlement method, correspondent bank |
| **SSI003** | Settlement desk must verify SSI details match the truth |
| **SSI004** | SSI mismatch is a valid reason for settlement break |

---

## 8. Validation Rules

### 8.1 Input Validation
- All API inputs are validated before processing
- Missing required fields return 400 errors
- Invalid state transitions return appropriate error messages

### 8.2 System Verification Bot Checks
- Trade economics consistency (amount, valueDate, currency match)
- Counterparty field consistency
- All mandatory settlement fields present
- SSI fields match truth values

---

## 9. Scoring Rules (Planned)

| Rule | Description |
|------|-------------|
| **SCR001** | Points awarded for correct actions (validate pass, confirm, settle) |
| **SCR002** | Points deducted for incorrect actions |
| **SCR003** | Time bonuses for fast processing |
| **SCR004** | Break handling accuracy tracked |
| **SCR005** | Communication effectiveness scored |
