# Screen & Feature Guide

## 1. Dashboard

The Dashboard is the user's home screen and command center in the simulator. It provides a high-level view of the user's progress and active queues.

### Sections
- **Overview Metrics:** Displays total trades processed, current active breaks, and overall completion percentage for the active scenario.
- **Desk Navigation:** Buttons to enter the active queues: 
  - `Go to MO Desk`
  - `Go to Confirmation Desk`
  - `Go to Settlement Desk`
- **Statistics:** A visual representation of the user's score, time taken per trade, and accuracy rate.
- **Reports:** Downloadable summaries of all actions taken during the session, useful for post-mortem analysis.
- **Progress Tracking:** Shows how many trades remain in the current scenario before completion.

---

## 2. MO Desk Workstation

When a user clicks "Go to MO Desk", they enter the MO Workstation.

### Queue (Left Panel)
- A list of all trades currently in the `MO Pending` or `MO Break` state.
- **Columns Displayed:** Trade ID, Counterparty, Product, and Status.
- **Action:** Clicking a row opens the Trade Details in the main view.

### Workstation Layout
- **Left Panel:** The Queue (as described above).
- **Middle Panel (Trade Details):** Shows the digital representation of the trade as recorded in the simulator's internal system (Trade Date, Value Date, Quantity, Price, Counterparty, Direction).
- **Right Panel (Documents):** Displays the PDF or Image of the original Trade Ticket provided by the Front Office (FO).
- **Bottom Panel (Actions & Mailbox):** Where the user selects an action button or views incoming/outgoing communications.

### Available Actions (Buttons)
- **Mark Validated**
  - *What it does:* Signals that the user has checked the Trade Details against the Trade Ticket and found NO discrepancies. 
  - *Effect:* Moves the trade to `Confirmation Pending`.
- **Raise Break**
  - *What it does:* Flags the trade as having a discrepancy (e.g., Price mismatch). 
  - *Effect:* Changes trade status to `MO Break`.
- **Send Mail**
  - *What it does:* Opens a modal to select a recipient (e.g., Front Office) and a template to notify them of an issue.
  - *Effect:* Sends an email. Responses will appear in the Mailbox.
- **Amend Trade**
  - *What it does:* Opens editable fields in the Trade Details panel to correct errors based on FO instructions.
  - *Effect:* Allows saving new values. Must be followed by "Mark Validated" once correct.

---

## 3. Confirmation Desk Workstation

When a user clicks "Go to Confirmation Desk", they enter the Confirmation Workstation.

### Queue (Left Panel)
- Displays trades that have passed MO validation and are in `Confirmation Pending` or `Confirmation Break`.

### Workstation Layout
- **Middle Panel (Trade Details):** Read-only view of the validated trade. You cannot amend from this view without escalating first.
- **Right Panel (Evidence/Documents):** Displays any evidence requested from the counterparty (e.g., their booking ticket or confirmation email).
- **Bottom Panel (Timeline & Actions):** Shows the history of the trade and current available buttons.

### Available Actions (Buttons)
- **Send Confirmation**
  - *What it does:* Dispatches the confirmation document to the simulated counterparty. 
  - *Effect:* Triggers the simulator to check for matches. Changes state to `Confirmed` or `Confirmation Break`.
- **Request Evidence**
  - *What it does:* Asks the counterparty to supply their booking documentation when a break occurs.
  - *Effect:* An automated email response will deliver a document into the Right Panel.
- **Escalate to FO**
  - *What it does:* Sends the counterparty's evidence to the Front Office for a final ruling on who is correct.
  - *Effect:* An automated email response will tell the user to either amend the trade or reject the counterparty's claim.
- **Amend**
  - *What it does:* Allows changing trade details if the FO confirms our booking was incorrect.
- **Reconfirm**
  - *What it does:* Resends the confirmation after an amendment has been made or after the counterparty has (simulated) corrected their side.

---

## 4. Settlement Desk Workstation

The Settlement Desk is split into Bilateral and Electronic, depending on the scenario.

### Bilateral Settlement

#### Queue (Left Panel)
- Displays confirmed trades nearing their Value Date (Status: `Settlement Pending` or `Settlement Break`).

#### Workstation Layout
- **Middle Panel (Settlement Instructions):** Shows our SSIs (Standard Settlement Instructions) alongside the Counterparty's SSIs.
- **Right Panel (Payment Status & Audit):** Shows real-time simulated Swift messaging (e.g., MT202, MT103) or payment success/failure logs.
- **Bottom Panel (Actions):** Available buttons for resolving settlement issues.

#### Available Actions (Buttons)
- **Update SSI**
  - *What it does:* Allows the user to correct our Settlement Instructions if static data was determined to be incorrect.
- **Retry Settlement**
  - *What it does:* Re-initiates the payment/settlement process after an SSI update or after the counterparty fixes their side.
- **Approve Settlement**
  - *What it does:* The final authorization step for staged payments.
  - *Effect:* Marks the trade as `Settled`.

---

### Electronic Settlement

#### Workstation Layout
- **Settlement Dashboard:** Shows an aggregated view of trades routing through a central matching utility (e.g., Euroclear/DTCC).
- **Exception Queue:** Trades that fail to match appear here.
- **Exception Details Panel:** Shows a side-by-side comparison of Our Submission vs. Counterparty Submission, highlighting fields that are outside of matching tolerance.

#### Available Actions (Buttons)
- **Force Amend**
  - *What it does:* Overrides our submitted value to match the counterparty if they are correct.
- **Accept Counterparty Value**
  - *What it does:* A one-click resolution that adopts the counterparty's value based on simulator logic.
- **Re-Match**
  - *What it does:* Sends the updated data back into the matching engine.

---

## 5. Global Actions & Components

These components are accessible from any desk within the simulator.

- **Audit Timeline:** A chronological list of every state change, email sent, response received, and button clicked for a specific trade. Highly useful for tracking down *why* a trade is in its current state.
- **Mailbox:** A simulated email client. 
  - Users receive automated responses from the FO, Counterparty, or Static Data teams here. 
  - All decisions from simulated actors arrive via this Mailbox. 
  - Users can read threads to understand the context of a break.
