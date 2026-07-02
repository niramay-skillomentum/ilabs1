# Screen & Feature Guide

> **Purpose:** Describe every screen and interactive feature of the iLabs — SGB Operations Simulator exactly as it behaves, so the analyst (and the AI Tutor) reference real UI, not imagined UI.
> **Audience:** Trainees and the AI Tutor (this file is loaded into the tutor's knowledge base at runtime).
> **Last verified:** 2026-07-01 against the frontend implementation.
> **Related:** [Simulator Workflow Guide](simulator_workflow_guide.md) · [Troubleshooting & FAQs](troubleshooting_and_faqs.md)

---

## 1. Login (`/`)

The entry screen. You **register** (full name, email, password) or **log in** (email, password). On success a session token is stored in the browser and you are taken to the Dashboard. There is nothing else on this screen — no data loads until you are authenticated.

## 2. Dashboard (`/dashboard`)

The Dashboard is a **desk selector — and only a desk selector**. It shows buttons for the desks:

- **MO** (Middle Office)
- **CONFIRMATION**
- **SETTLEMENT**
- **TLM** (Reconciliation)
- **REPORTING**

Clicking a desk takes you to the Workstation for that desk (`/workstation?desk=<DESK>`). There are **no** overview metrics, statistics charts, downloadable reports, or progress widgets on the Dashboard — those do not exist.

## 3. Workstation (`/workstation?desk=<DESK>`)

The main working screen for every desk. Its layout is the same regardless of desk; the available action buttons change with the desk and the selected trade's status.

- **Top bar:** desk title, a **session timer** (real 3-hour countdown plus the simulated 09:00–18:00 clock), and refresh / log-off controls.
- **Trade table:** one row per trade in your queue, with columns: Ref, Status, Next Desk, Age, Trade/Value Dates, Counterparty, Currency, Amount. You can export the table to CSV. Selecting a row makes it the active trade.
- **Action bar:** desk- and status-specific buttons (see the [Workflow Guide](simulator_workflow_guide.md) for the full action list per desk). Every action opens a **comment modal** — a comment is mandatory.
- **Settlement-type selector** (Settlement desk): choose electronic or bilateral; the correct choice opens the corresponding settlement screen.
- **Audit trail modal:** the full chronological history for a trade — system events plus every action you took, including an XML audit record for auto-generated events.
- **SSI viewer / editor:** view and (where permitted) edit the trade's settlement instructions.
- **Truth viewer:** reveals the trade's ground-truth economics for study/verification.
- **Instruction & Tutor panels:** a collapsible **Desk Guide** (step-by-step for the current desk) and a floating **Tutor** chatbot (see §8).

Actions are submitted to the backend; the queue updates in real time over a live socket connection, with polling as a fallback.

## 4. Communication mailbox (`/communication`)

A three-panel mailbox where all asynchronous conversations with the Counterparty and Front Office happen.

- **Folders (left):**
  - **Inbox** — your personal conversations for the current desk.
  - **Group Inbox** — desk-wide shared conversations (hidden when viewing the FO channel).
  - **Front Office Communications (FO channel)** — the internal escalation channel (shown when you escalate to FO).
  - **Sent / Drafts / Deleted** — present as folders but currently **placeholders** with no items.
- **Message list (middle):** conversations for the selected folder, searchable by reference, subject, counterparty, body, or sender, with status badges (awaiting / responded / resolved).
- **Thread (right):** the message thread for the selected conversation, newest expanded, with **Reply** and **Resolve** controls.
- **Compose / Reply modals:** new message and reply forms. For Confirmation and Settlement desks the compose form pre-fills a template (a trade-verification email or an SSI-request email). Replies quote recent history.

Remember: replies from the CPTY/FO arrive here **a few seconds after you send** — they are not instant.

## 5. Settlement screens (`/settlement/electronic`, `/settlement/bilateral`)

Reached by selecting the settlement type for a trade. Both screens show two columns:

- **System Details** — the trade's current settlement instructions (the 9 SSI fields).
- **Truth Details** — the correct settlement instructions; any field that differs from the system value is highlighted.

The 9 SSI fields are: **beneficiaryName, beneficiaryBank, beneficiaryBIC, accountNumber, accountType, currency, settlementMethod, correspondentBank, paymentReference**.

Actions on these screens:
- **Approve Settlement** — validates all 9 fields against the truth; a mismatch is rejected with a 10-point penalty, a full match settles the trade.
- **Raise Break** — flags a settlement break.
- **Edit SSI** — correct the system fields. On the **electronic** screen editing is allowed only while the trade is in `SETTLEMENT_BREAK`; on the **bilateral** screen you can edit until the trade is settled.
- **Mail CPTY** — *bilateral only* — jumps to the Communication mailbox to message the counterparty about this trade.

A settled trade shows a clear "settled" indicator.

## 6. SSI Database (`/ssi-database`)

A lookup screen. Enter an **SSI ID** (for example `CITI-01`) and the screen returns that party's standard settlement instructions. This is how you **self-match** at the Settlement desk: the settlement counterparty only ever gives you its SSI ID, so you look the ID up here and compare it field by field against the system SSI.

## 7. MO-Risk termsheet viewer (`/mo-risk`)

A reference screen for the MO desk. It lists all trades and shows a **termsheet** (front-office reference data) for the selected one: reference, status, next desk, age, dates, counterparty, entity, region, product, type, settlement type, direction, currency, amount. Use it to compare the booking against what the front office intended.

## 8. Shared panels: Desk Guide and Tutor

- **Desk Guide (Instruction panel):** a collapsible panel on the Workstation with numbered steps and a "Pro Tip" for the current desk (MO, Confirmation, Settlement have full guides; TLM and Reporting show a short placeholder).
- **Tutor (Tutorial panel):** a floating chatbot. It answers questions about the current desk and trade using this knowledge base, in a Socratic style — it guides you rather than handing over answers. It is labelled "Powered by Nvidia Nemotron 3".

## 9. Global feature: the audit trail

Every trade carries a complete audit trail: system-generated capture/compliance/routing events (as XML) plus every analyst action with its mandatory comment. Open it from the Workstation to understand *why* a trade is in its current state.
