# 22 · Glossary

[← 21 Developer Guide](21_Developer_Guide.md) | [INDEX](INDEX.md)

---

Project-specific and domain terms. Financial terms are explained in the context of *this simulator*.

## Domain (post-trade operations)

| Term | Meaning |
|---|---|
| **Post-trade operations** | The back/middle-office processing that happens *after* a trade is executed: validation, confirmation, settlement, reconciliation. This simulator trains that. |
| **Desk** | A processing station: **MO** (Middle Office), **CONFIRMATION**, **SETTLEMENT** (+ stubs **TLM**, **REPORTING**). The trainee works one desk per session. |
| **MO (Middle Office)** | First desk; validates the booked trade against the source of truth; raises/escalates breaks. |
| **Confirmation** | Desk that agrees trade economics with the counterparty. |
| **Settlement** | Desk that arranges payment/delivery using SSI; amends & approves then settles. |
| **FO (Front Office)** | The trading desk that booked the trade. Simulated by AI; the trainee escalates to FO to resolve breaks. |
| **CPTY (Counterparty)** | The other party to the trade. Simulated by AI; the trainee emails them to confirm/settle. |
| **Break** | A discrepancy between what the trainee sees (`booking`/`settlementDetails`) and the desk **truth**. The core thing to detect & resolve. |
| **Truth** | The correct economics for a trade, stored per-desk under `trade.truths.{universal,mo,confirmation,settlement}`. Grading compares trainee-visible data against it. |
| **Booking** | The trade economics as recorded/visible to the trainee (`trade.booking`). May contain an injected break vs `truths.mo`. |
| **Amendment** | A correction to a trade field, tracked in `amendmentHistory` with `source` (USER/AI/FO/CPTY/SYSTEM) and `status` (PENDING/ACCEPTED/APPLIED). |
| **Escalation** | Raising a break to FO (via the FO internal channel) for a ruling (`FO_SUPPORTS_US` / `FO_ADMITS_MISTAKE` / `FO_SUPPORTS_CPTY`). |
| **Reconciliation (Recon)** | Post-settlement matching of internal **ledger** entries against bank **statements**. (Engine present but not wired to a route — see [18](18_Unused_And_Dead_Code.md).) |

## Settlement & instruments

| Term | Meaning |
|---|---|
| **SSI** | **Standard Settlement Instructions** — beneficiary name/bank/BIC, account number/type, settlement method, correspondent bank, payment reference. The settlement desk verifies these against `truths.settlement`. |
| **Alert Code / Acronym Code** | Two lookup codes the counterparty provides; the trainee enters both on `/ssi-database` (`GET /api/ssi/search-codes`) to retrieve the canonical SSI. |
| **BIC** | Bank Identifier Code (SWIFT), e.g. `CITIUS33XXX`. |
| **T+2** | Value Date = Trade Date + 2 (business) days. `tradeGenerator` sets `valueDate = tradeDate + 2`. |
| **Value Date** | The date the trade settles / cash moves. |
| **Cut-off** | The latest simulated time a currency can still settle same-day (`cutoff.js` table, e.g. USD 18:00, JPY 14:00). Past cut-off, settlement rolls to next day. |
| **Settlement type** | `BILATERAL` (party-to-party) or `ELECTRONIC` (via a system/CSD). |
| **Bilateral / Electronic settlement** | Two settlement models the desk handles; determines the workflow branch. |
| **Product** | Instrument type: FX Spot/Forward, IRS, CDS, Equity, Bonds, Listed Futures/Options. |
| **Direction** | `BUY` or `SELL`. |

## Simulator-specific

| Term | Meaning |
|---|---|
| **Queue** | The 20-trade worklist assigned to a user for a 3-hour session (12 clean + 8 break target). Built by `queueComposer`. |
| **Session** | A 3-hour working window (`Queue.sessionExpiry = sessionStart + 3h`); the sim clock runs 09:00→18:00 within it. |
| **Simulation clock** | Compresses a 9-hour trading day into ~3 real hours; emits `clock_tick`. Starts on first queue generation, not at boot. |
| **Truth engine** | The grading oracle (`truthEngine.js`) that computes mismatches vs desk truths. |
| **System Verification Bot** | Automated settlement workflow (`systemWorkflowEngine.js`) that amends SSIs to truth and approves/rejects settlements via `SystemJob`/`SystemMail`. |
| **PendingReply** | A scheduled (delayed) AI reply row; drained by background processors to simulate real-world latency. |
| **SystemJob** | A delayed job for the settlement bot (AMENDMENT/VERIFICATION). |
| **SystemMail** | Isolated system-notification mailbox (separate from CPTY/FO email). |
| **Holding message** | A two-part AI reply: an immediate "we're looking into it" followed later by the real answer (`action: "HOLDING_MESSAGE"`). |
| **Round-based AI** | CPTY/FO behavior depends on `cptyContactCount`/`foContactCount`: round 1 uses local desk truth, round 2+ uses `universal` truth (drives "stay firm" → "admit mistake"). |
| **Offline response engine** | Deterministic template fallback used when Gemini is unavailable. |
| **XML audit** | A synthetic `<AuditTrail>` XML "story" generated per trade (`auditXml`) showing its system history before user assignment. |
| **LIASING** | The literal (misspelled) status prefix for "liaising with", e.g. `LIASING_WITH_CPTY`, `LIASING_WITH_FO`. Kept as-is because it's the exact code value. |

## Status literals (lifecycle)

| Status | Meaning |
|---|---|
| `NEW` | Freshly captured (pre-MO) |
| `MO_PENDING` | Awaiting MO validation |
| `MO_BREAK_OPEN` | MO raised a break |
| `PENDING_FO_RESPONSE` | Awaiting FO reply (MO escalation) |
| `CONFIRMATION_PENDING` | Awaiting confirmation |
| `CONFIRMATION_BREAK` | Confirmation discrepancy raised |
| `LIASING_WITH_CPTY` | In dialogue with counterparty |
| `LIASING_WITH_FO` | In dialogue with front office |
| `SETTLEMENT_PENDING` | Awaiting settlement processing |
| `SETTLEMENT_BREAK` | Settlement (SSI) discrepancy raised |
| `PENDING_AMENDMENT` | Queued for system amendment |
| `AMENDED` | SSIs corrected by the bot |
| `PENDING_APPROVAL` | Awaiting bot verification |
| `REJECTED_REVERIFY` | Failed verification; needs re-amend |
| `APPROVED` | (legacy) approved, pre-settle |
| `SETTLED` | Settled |
| `RECON_PENDING` | Awaiting reconciliation |
| `UNMATCHED_BY_USER` | Recon item marked unmatched |
| `RECON_CLEARED` | Reconciled |
| `CLOSED` | Terminal |

## Break-type & category literals

| Group | Values |
|---|---|
| MO break fields | `AMOUNT`, `VALUE_DATE`, `CURRENCY`, `COUNTERPARTY` |
| Confirmation break fields | `AMOUNT`, `VALUE_DATE`, `CURRENCY` |
| Settlement discrepancy causes | `AMOUNT_MISMATCH`, `SSI_MISMATCH`, `REFERENCE_MISMATCH`, `OTHER` |
| Recon scenarios | `PERFECT_MATCH`, `REFERENCE_MISMATCH`, `AMOUNT_MISMATCH`, `MISSING_STATEMENT`, `DUPLICATE_LEDGER`, `TIMING_DIFFERENCE` |
| CPTY response types | `MATCHED`, `DISCREPANCY`, `NO_RESPONSE`, `PENDING_CPTY_ACTION` |
| FO/CPTY escalation | `FO_SUPPORTS_US`, `FO_SUPPORTS_CPTY`, `FO_ADMITS_MISTAKE`, `FO_INVESTIGATING` |
| Amendment source/status | source: `USER/AI/FO/CPTY/SYSTEM`; status: `PENDING/ACCEPTED/APPLIED` |
| Canonical "correct" values (legacy) | reference `REF99881`, BIC `CITIUS33XXX` |

## Technical

| Term | Meaning |
|---|---|
| **JWT** | JSON Web Token; carries `{userId(email), fullName}`, 3h expiry. |
| **Agenda** | MongoDB-backed cron scheduler (`session-cleanup`, `daily-age-update`). |
| **Socket.io room** | `user_<userId>` (per-user) / `desk_<desk>` (per-desk) channels for targeted emits. |
| **Gemini** | Google `gemini-2.5-flash`, used for CPTY/FO personas. |
| **Nemotron** | Nvidia `nemotron-3-ultra-550b-a55b:free` via OpenRouter, used for the tutor. |
| **Mongoose** | MongoDB ODM used for all persistence (except the Prisma remnant in `settlement.js`). |

---
[← 21 Developer Guide](21_Developer_Guide.md) | [INDEX](INDEX.md)

---

*End of the SGB / iLabs1 Project Knowledge Base. Generated by full reverse-engineering of the codebase; documents behavior as-is including bugs and dead code (flagged ⚠️). No source files were modified in producing this documentation.*
