# Troubleshooting & FAQs

> **Purpose:** Answer the common "why" and "how" questions about simulator behaviour, accurately, so the AI Tutor can extend the same logic to similar questions.
> **Audience:** Trainees and the AI Tutor (this file is loaded into the tutor's knowledge base at runtime).
> **Last verified:** 2026-07-01 against the implementation.
> **Related:** [Simulator Workflow Guide](simulator_workflow_guide.md) · [Screen & Feature Guide](screen_and_feature_guide.md)

---

## General

**Q: Why can't I generate another desk queue?**
A: You may only have **one active desk queue at a time**. Finish your current queue, or let the 3-hour session expire, before generating a new one.

**Q: How is my score calculated?**
A: Scoring is simple and action-based: **+5** for correctly validating a clean trade, **+3** for correctly raising a break, and **+2** for selecting an issue type when you raise a break. **Penalties** of **10 points** apply when you approve settlement with mismatched SSI details or choose the wrong settlement type. The habit the score rewards is *investigate first, then act*.

**Q: Why did my score go down?**
A: The most common causes are approving a settlement whose 9 SSI fields don't match the truth, or selecting the wrong settlement type (electronic vs bilateral). Both are 10-point penalties. Advancing a trade without resolving its break also forfeits the points you would have earned.

**Q: Can a trade skip a desk?**
A: No. Trades follow a strict state machine: MO → Confirmation → Settlement → Reconciliation. You can only take the actions the current status allows.

**Q: Why is my queue empty?**
A: Either you haven't generated a queue for this desk, or all your trades have advanced to the next desk. Each queue holds 20 trades for one desk.

**Q: I sent a message but nothing happened. Is it broken?**
A: No — replies are **asynchronous**. The counterparty or front office answers a few seconds later, and the reply appears in your **Communication** mailbox. Keep working other trades and check back.

---

## Middle Office (MO) desk

**Q: What happens after I raise a break?**
A: The trade moves to `MO_BREAK_OPEN`. Investigate the discrepancy, then use **Send to FO** (`MO_SEND_TO_FO`) to escalate it — that moves the trade to `PENDING_FO_RESPONSE` and the front office replies asynchronously.

**Q: What does the Validate/Pass action do?**
A: `MO_VALIDATE_PASS` asserts the booking matches the MO truth and moves the trade `MO_PENDING → CONFIRMATION_PENDING`. If the trade is `PENDING_FO_RESPONSE`, you can only pass after the FO has responded; if amendments are pending, resolve the related conversation first.

**Q: I emailed the FO. Why haven't they replied?**
A: FO replies are asynchronous — check the mailbox after a few seconds. If the FO admits a booking error, the simulator auto-extracts the corrected values into **pending amendments** for you to approve.

**Q: The FO approved a correction — what's the next step?**
A: Approve the **pending amendment** the simulator created from the FO's message (approving applies it to the booking), then `MO_VALIDATE_PASS`. There is no separate "amend trade" form — corrections flow through the amendment approval mechanism.

**Q: What if the FO says the ticket/records were right, not the booking?**
A: Then don't amend anything — just `MO_VALIDATE_PASS`. Amending a correct booking is a wrong action.

---

## Confirmation desk

**Q: Why did my trade go into a confirmation break?**
A: You raised a break (`CONFIRM_RAISE_BREAK`) because the counterparty's expected economics disagree with the trade on amount, value date, or currency. (Counterparty identity is not disputed at confirmation.)

**Q: What should I do with a confirmation break?**
A: Gather evidence and a ruling: **Request Evidence** (`CONFIRM_REQUEST_EVIDENCE`) and/or **Escalate to FO** (`CONFIRM_ESCALATE_TO_FO`, which opens the internal FO channel and moves the trade to `LIASING_WITH_FO`). When the FO admits a booking error, amendments are auto-applied and the trade returns to `CONFIRMATION_PENDING`. Then approve the amendment / resend / confirm.

**Q: The FO says our booking is correct — now what?**
A: Reject the counterparty's claim (`CONFIRM_REJECT_CLAIM`); this returns the trade to `CONFIRMATION_PENDING`. Resend the confirmation (`CONFIRM_RESEND`) to re-engage the counterparty, and confirm (`CONFIRM_TRADE`) once agreed.

**Q: How do I move a confirmed trade to settlement?**
A: `CONFIRM_TRADE` moves `LIASING_WITH_CPTY → SETTLEMENT_PENDING`. You must have contacted the counterparty first (`CONFIRM_SEND_TO_CPTY`).

**Q: Why is my Confirmation queue empty?**
A: Trades only reach Confirmation after MO validation. Work the MO desk first.

---

## Settlement desk

**Q: Why did my trade go into a settlement break?**
A: The system settlement instructions don't match the truth, or you flagged one with `SETTLEMENT_RAISE_BREAK`. The mismatch is in one or more of the 9 SSI fields.

**Q: How do I resolve an SSI mismatch?**
A: When you message the settlement counterparty it replies only with its **SSI ID** — it never confirms a match. Look that ID up in the **SSI Database** (`/ssi-database`), compare it field by field against the system SSI, correct the wrong field with **Edit SSI**, then **Approve Settlement**. On the electronic screen you can only edit while in `SETTLEMENT_BREAK`.

**Q: Why was my settlement approval rejected?**
A: `SETTLEMENT_APPROVE` re-checks all 9 SSI fields against the truth. If any field is still wrong the approval is rejected and a 10-point penalty applies. Fix the offending field and approve again.

**Q: Which settlement type do I pick?**
A: Choose the type that matches the trade's real settlement type. Picking the wrong one (electronic vs bilateral) is a 10-point penalty. The correct choice opens the matching settlement screen.

**Q: What is "Mail CPTY"?**
A: On the **bilateral** screen only, it takes you to the mailbox to message the counterparty about this trade (for example to chase an SSI). Electronic settlement has no Mail CPTY action.

**Q: My settlement approved but the value date changed — why?**
A: If the currency's cut-off time had already passed on the value date when you approved, settlement rolls to the next business day and the value date shifts forward by one.

---

## After settlement (Reconciliation / TLM)

**Q: What happens after a trade settles?**
A: It moves to `RECON_PENDING`. Ledger and statement entries auto-match on amount, currency and reference. Match remaining items manually, or mark genuine exceptions as `UNMATCHED_BY_USER`. When all entries are matched the break clears (`RECON_CLEARED`) and the trade closes (`CLOSED`).

---

## Common pitfalls

- Expecting instant replies — they're asynchronous; watch the mailbox.
- Amending a booking that was actually correct — only amend when the booking is wrong.
- Approving settlement before self-matching the SSI in the SSI Database.
- Forgetting the mandatory comment on every action.
