# 5. User Flows

This document details the distinct functional flows a user performs within the SGB Operations Simulator.

## 1. Dashboard Flow

- **User Action:** Logs in successfully.
- **Frontend Component:** `DashboardComponent` (in `src/app/dashboard/page.js`).
- **State Change:** Validates `userId` using `loadUserId()` from session storage.
- **UI:** Presents three buttons: "MO Desk", "Confirmation Desk", "Settlement Desk".
- **User Action:** Clicks a desk button (e.g., "MO Desk").
- **Navigation:** `router.push("/workstation?desk=MO")` is executed.

---

## 2. Workstation Flow (Queue Management)

The Workstation is the core screen where users process trades.

- **Initialization:** `WorkstationComponent` loads.
- **API Call:** GET `/api/queue/my?desk=...`
- **Controller:** `src/routes/queueRoutes.js` -> `router.get("/my")`
- **Database:** Looks up `Trade` where `assignedTo == userId` and `currentStatus` matches the active desk's required statuses.
- **Response:** Returns an array of `Trade` objects and session timing info.
- **State Change:** `setQueue(data.trades)`.
- **UI:** A data grid table renders the assigned trades.
- **Real-time Updates:** A Socket.io connection joins the room `desk_MO`. Listens for `trade_update` and `new_email` events to automatically run `refreshQueueSilent()`.

### Sub-Flow: Taking an Action on a Trade
- **User Action:** User selects a trade by clicking the checkbox, then clicks an action button (e.g., "MO Validate").
- **Validation:** Frontend checks if `allowed['MO_VALIDATE_PASS'].includes(selectedTrade.currentStatus)`.
- **State Change:** `setPopupState({ type: "action", action: "MO_VALIDATE_PASS" })`.
- **User Action:** Types a comment and clicks "Submit" in the modal.
- **API Call:** POST `/api/trade/action` with payload `{ trade, action, comment }`.
- **Controller:** `src/routes/tradeRoutes.js` -> routes to `engine/lifecycle.js` (or similar).
- **Database:** Trade status is updated, audit log is written.
- **Response:** Returns updated queue. Frontend updates `setQueue()`.

### Sub-Flow: Generating New Trades
- **User Action:** User clicks "Generate Queue".
- **API Call:** POST `/api/queue/generate` with payload `{ desk }`.
- **Backend Flow:** Hits `src/engine/queueComposer.js`. Generates synthetic trades, assigns them to the user, starts the simulation clock.
- **UI Update:** The queue table populates with new simulated trades.

---

## 3. Communication Flow (Mailbox)

The Mailbox is a 3-panel UI mimicking an email client for ops-to-ops or ops-to-client communication.

- **Navigation:** User clicks "📧 Mailbox" from Workstation.
- **API Calls:** 
  - On load, fetches `GET /api/conversations/personal?userId=...` (or group/FO endpoints based on folder).
  - Populates `InboxList` component.
- **User Action:** User clicks a conversation in the left pane.
- **API Call:** GET `/api/conversation/:tradeRef` fetches the full message array.
- **UI Update:** `MessageThread` component renders the messages.

### Sub-Flow: Replying to an Email
- **User Action:** Clicks "Reply", types a message, clicks "Send".
- **API Call:** POST `/api/conversation/send`.
- **Backend Flow:** 
  - Saves the message to `Conversation` model.
  - LLM Integration: The engine detects a message sent to CPTY/FO. The `communicationEngine` intercepts this, builds a prompt, and queries the LLM (`cptyAI.js` or `foAI.js`) in the background via the `setInterval` loop in `server.js`.
  - The AI response is generated, saved to DB, and a Socket.io event `new_email` is broadcasted.
- **Frontend Update:** Socket receives `new_email`, triggers `loadConversation` to refresh the thread.

---

## 4. MO Risk Flow (Termsheet Viewer)

- **Navigation:** User clicks "📄 View Termsheet" (only available on MO desk).
- **API Call:** GET `/api/trade/all` (fetches all trades for the user).
- **UI:** Splitscreen layout. Left side lists trades.
- **User Action:** Clicks a trade on the left.
- **UI Update:** Right side (`TermsheetViewer` component) extracts `trade.truth` (the immutable generated truth representing the physical FO document) and displays it formatted. This allows the user to compare the "Risk system" view (in Workstation) vs the "FO Termsheet" (in MO-Risk) to spot breaks.

---

## 5. Settlement Flows

Settlement flows are designed to simulate the final stages of trade processing, where operations compare booked SSI (Standard Settlement Instructions) details against expected truth details. 

### Sub-Flow: Bilateral Settlement
- **Navigation:** User clicks "Action" on a trade in `SETTLEMENT_PENDING` status and selects `Bilateral`.
- **UI:** The Bilateral Dashboard (`frontend/src/app/settlement/bilateral/page.js`) is loaded.
- **User Action (Match):** If system details exactly match truth details, user clicks "Approve Settlement". Status transitions to `SETTLED`.
- **User Action (Mismatch):** 
  - User clicks "Raise Break". Status becomes `SETTLEMENT_BREAK`.
  - User can then click "Edit Details" to correct the system values, OR
  - User can click "Mail CPTY" to navigate to the mailbox and communicate with the counterparty.

### Sub-Flow: Electronic Settlement
- **Navigation:** User clicks "Action" on a trade in `SETTLEMENT_PENDING` status and selects `Electronic`.
- **UI:** The Electronic Dashboard (`frontend/src/app/settlement/electronic/page.js`) is loaded.
- **User Action (Match):** If system details exactly match truth details, user clicks "Approve Settlement". Status transitions to `SETTLED`.
- **User Action (Mismatch):**
  - Mail CPTY functionality is completely disabled/removed for Electronic settlement.
  - User must first click "Raise Break" to transition the trade to `SETTLEMENT_BREAK`.
  - Only after raising a break does the "Edit Details" button become enabled.
  - User fixes the system details to match the expected truth and clicks "Approve Settlement".
