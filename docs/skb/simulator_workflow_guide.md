# Simulator Workflow Guide

## 1. Simulator Overview

### Purpose of the Simulator
The Investment Banking Operations Simulator is designed to train users in the end-to-end lifecycle of a trade through the Middle Office (MO), Confirmation, and Settlement desks. Its primary goal is to provide a realistic, hands-on environment where users learn by doing—identifying breaks, making decisions, communicating with stakeholders (like the Front Office or Counterparties), and ensuring trades settle successfully.

### What Users Will Learn
- **Trade Validation:** How to compare economic and non-economic details of a trade against reference documents (like a Trade Ticket).
- **Break Resolution:** How to identify discrepancies, raise breaks, and escalate issues.
- **Workflow Progression:** Understanding how a trade moves sequentially from MO to Confirmation and finally to Settlement.
- **Decision Making:** How to choose the correct course of action when faced with exceptions (e.g., amend, reject, reconfirm, approve).

### Overall Trade Lifecycle in the Simulator
Trades follow a strict, linear progression in the simulator:
1. **Trade Created:** The trade is injected into the simulator.
2. **MO Desk:** The user validates the trade. Any discrepancies cause an *MO Break*. Once resolved and validated, the trade moves forward.
3. **Confirmation Desk:** The trade is confirmed with the counterparty. If details don't match, a *Confirmation Break* occurs. Once matched, it moves to Settlement.
4. **Settlement Desk:** The trade undergoes bilateral or electronic settlement. Mismatched instructions lead to a *Settlement Break*. Once resolved, the trade is marked *Settled*.

---

## 2. Trade Lifecycle States

The simulator uses a rigid state machine. Here is every lifecycle state and what it means:

1. **Trade Created**
   - *Meaning:* The trade has been generated and is waiting to enter the active queues.
   - *Exit:* Automatically transitions to *MO Pending*.

2. **MO Pending**
   - *Meaning:* The trade appears in the Middle Office queue, awaiting validation by the user.
   - *Exit:* The user either clicks "Mark Validated" (moving it to *Confirmation Pending*) or "Raise Break" (moving it to *MO Break*).

3. **MO Break**
   - *Meaning:* A discrepancy was found between the Trade Details and the Trade Ticket. The user must resolve this.
   - *Exit:* The user communicates with the Front Office (FO), amends the trade if necessary, and then marks it validated to move to *Confirmation Pending*.

4. **Validated**
   - *Meaning:* The Middle Office has successfully validated the trade.
   - *Exit:* Automatically moves to *Confirmation Pending*.

5. **Confirmation Pending**
   - *Meaning:* The trade is in the Confirmation desk queue. The user must send a confirmation to the counterparty.
   - *Exit:* If the counterparty agrees, it moves to *Confirmed*. If not, it moves to *Confirmation Break*.

6. **Confirmation Break**
   - *Meaning:* The counterparty disagreed with the confirmation details.
   - *Exit:* The user requests evidence, reviews documents, escalates to FO if needed, amends the trade, and reconfirms. Once agreed, it moves to *Confirmed*.

7. **Confirmed**
   - *Meaning:* Both parties agree on the trade details.
   - *Exit:* Automatically moves to *Settlement Pending*.

8. **Settlement Pending**
   - *Meaning:* The trade is in the Settlement desk. The user must verify settlement instructions.
   - *Exit:* If instructions match and payment is successful, it moves to *Ready for Approval* or *Settled*. If they fail, it moves to *Settlement Break*.

9. **Settlement Break**
   - *Meaning:* A failure occurred during settlement (e.g., SSI mismatch, insufficient funds).
   - *Exit:* The user investigates, updates SSI, or resolves the issue, and retries settlement. 

10. **Ready for Approval**
    - *Meaning:* The settlement is staged and requires final authorization.
    - *Exit:* User clicks "Approve Settlement" to move it to *Settled*.

11. **Settled**
    - *Meaning:* The lifecycle is complete. Funds/assets have been exchanged.
    - *Exit:* Terminal state.

---

## 3. MO Desk Workflow

### Purpose
The Middle Office (MO) Desk is the first line of defense. The user's job is to ensure that the Trade Details in the system exactly match the original Trade Ticket provided by the Front Office.

### MO Workflow
1. **Trade Appears in MO Queue:** User selects a trade.
2. **Validation:** User compares the Trade Details on the screen against the Trade Ticket document.
3. **Decision Point:** 
   - *Match:* User clicks "Mark Validated".
   - *Mismatch:* User clicks "Raise Break".
4. **Handling an MO Break:**
   - User clicks "Send Mail" to notify the Front Office (FO) of the discrepancy.
   - FO responds via the simulator mailbox.
   - If the FO confirms an error, the user clicks "Amend Trade" and corrects the erroneous fields.
   - Once amended and correct, the user clicks "Mark Validated".
5. **Completion:** The trade moves to the Confirmation Desk.

### Every State Transition (MO)
- `MO Pending` → (User: Mark Validated) → `Validated` → `Confirmation Pending`
- `MO Pending` → (User: Raise Break) → `MO Break`
- `MO Break` → (User: Send Mail to FO, Amend, Mark Validated) → `Validated` → `Confirmation Pending`

---

## 4. Confirmation Desk Workflow

### Purpose
To ensure that the counterparty agrees with the trade details validated by the MO.

### Confirmation Workflow
1. **Trade Arrives from MO:** The trade appears in the Confirmation Queue.
2. **Send Confirmation:** The user reviews the details and clicks "Send Confirmation".
3. **Counterparty Response (Simulated):** The counterparty compares the confirmation against their truth.
4. **Decision Point:**
   - *Match:* Trade becomes *Confirmed* and moves to Settlement.
   - *Mismatch:* Trade becomes a *Confirmation Break*.
5. **Handling a Confirmation Break:**
   - User clicks "Request Evidence" from the counterparty.
   - User reviews the provided documents.
   - User clicks "Escalate to FO" to ask for a decision based on the evidence.
   - The FO provides a decision via mail.
   - If required, the user clicks "Amend" to change the trade details.
   - The user clicks "Reconfirm".
6. **Completion:** Once both parties match, the trade moves to the Settlement Desk.

---

## 5. Settlement Desk Workflow

### Bilateral Settlement

1. **Queue & Workstation:** Trade arrives in the Settlement queue. The workstation displays Settlement Instructions (SSIs), Payment Status, and Documents.
2. **Verification:** The user checks if our SSIs match the counterparty's SSIs.
3. **Handling a Settlement Break:**
   - A break occurs if SSIs mismatch or funds fail.
   - *Investigation:* User checks the Audit Timeline and Mailbox. User may need to contact the counterparty or internal static data team.
   - *Resolution:* User clicks "Update SSI" if our static data was wrong, or informs the counterparty if theirs was wrong.
   - *Action:* User clicks "Retry Settlement".
4. **Completion:** Once resolved, the user clicks "Approve Settlement" (if required) and the trade is marked *Settled*.

### Electronic Settlement

1. **Settlement Dashboard:** Shows trades routing through a central matching utility (e.g., Euroclear/DTCC).
2. **Exception Queue:** Trades that fail to match appear here.
3. **Matching Process:** The simulator automatically attempts to match based on predefined rules. Exceptions happen when fields like Quantity or Price fall outside tolerance.
4. **Resolution:** User reviews Exception Details, identifies the offending field, and forces an amendment or accepts the counterparty's value based on simulator logic.
5. **Completion:** Once matched in the utility, the trade is marked *Settled*.

---

## 6. Simulator Rules

To ensure a structured learning environment, the simulator enforces the following strict rules:

- **Strict Linearity:** A trade CANNOT skip desks. It must flow MO -> Confirmation -> Settlement.
- **Dependency:** Confirmation starts *only* after MO validation is complete. Settlement starts *only* after Confirmation is complete.
- **Single Active Queue:** A user can only actively work on one desk queue at a time.
- **Multiple Amendments:** A trade can be amended multiple times if previous amendments did not fully resolve the break.
- **No Manual State Jumping:** Users cannot force a trade to "Settled" without going through the required actions (e.g., raising a break, sending an email, validating).
- **One Truth:** The simulator's automated responses act as the absolute truth for a given scenario.

---

## 7. Scoring

The simulator evaluates the user based on their actions, not just the final outcome.

### How Score is Calculated
- **Investigation Quality:** Did the user accurately identify the correct field that caused the break?
- **Communication:** Did the user send the correct email template to the correct party (e.g., FO vs. Counterparty)?
- **Resolution Accuracy:** Was the amendment correct based on the evidence?
- **Time:** How quickly was the trade processed from creation to settlement?

### Good Decisions (Increase Score)
- Identifying a break correctly and immediately.
- Escalating to the correct party with the right context.
- Amending the trade with accurate data.
- Approving settlement only when all details match.

### Bad Decisions (Decrease Score)
- Clicking "Mark Validated" when there is a mismatch between the Trade Details and Trade Ticket.
- Amending a trade without receiving confirmation/instruction from the FO.
- Sending unnecessary emails or escalating to the wrong party.
- Updating SSIs with incorrect information during a Settlement Break.
