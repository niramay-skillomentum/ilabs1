# 11. State Management & Event Flow

This document details how data state is managed on the frontend, how it is persisted, and traces complete event flows from user action to database update.

## State Management Approach

The SGB simulator relies on **Vanilla React State** (no Redux/Zustand) combined with **Socket.io** for real-time synchronization.

### 1. Local UI State (`useState`)
- Component-level state is used for forms, modals, and local data filtering.
- Examples: `isLoginMode`, `searchQuery`, `replyBody`, `popupState`.

### 2. Server-Synchronized State
- Heavy data (e.g., the queue of trades, email threads) is fetched via REST APIs and stored in `useState` (e.g., `setQueue`, `setInboxData`).
- **WebSockets (Socket.io)** act as the invalidation layer. Rather than managing complex Redux reducers to mutate the queue locally when another user acts, the frontend listens for `socket.on("trade_update")` and simply re-fetches the list via `refreshQueueSilent()`. This guarantees the client is always perfectly in sync with the database.

### 3. Session State (`sessionStorage`)
- `auth_token`: The JWT used for API authorization.
- `userId`: The logged-in user's email identifier.
- `fullName`: For display purposes.
- Passed around via `lib/auth.js` helpers.

## Event Flow: "User Clicks an Action"

When a user in the Workstation clicks "MO Validate" for a trade, the following exact chronological flow executes:

### Step 1: User Action (Frontend)
- **File:** `WorkstationComponent` (`src/app/workstation/page.js`)
- **Event:** User clicks `<button onClick={() => handleOpenAction('MO_VALIDATE_PASS')}>`
- **Validation:** Frontend checks `allowed['MO_VALIDATE_PASS'].includes(selectedTrade.currentStatus)`.
- **State Change:** `setPopupState({ type: "action", action: "MO_VALIDATE_PASS" })`. The modal opens.

### Step 2: Modal Submission
- **Action:** User types a comment and clicks "Submit".
- **Handler:** `submitAction()`
- **State Change:** `setIsSubmittingAction(true)` (Disables button).
- **API Call:** `fetch("/api/trade/action", { method: "POST", body: JSON.stringify({trade, action, comment}) })`

### Step 3: Backend Controller
- **File:** `src/routes/tradeRoutes.js`
- Express routes `POST /api/trade/action`.
- Middleware `authenticateToken` validates JWT.
- Calls `lifecycle.processAction(req.body.trade.tradeRef, req.body.action, req.user.userId, req.body.comment)`.

### Step 4: Engine Business Logic
- **File:** `src/engine/lifecycle.js`
- Looks up the Trade in MongoDB (`Trade.findOne`).
- Executes a massive switch statement on `action` (`case "MO_VALIDATE_PASS":`).
- Applies business logic: Moves `currentStatus` from `MO_PENDING` to `CONFIRMATION_PENDING`, sets `nextDesk = "CONFIRMATION"`.

### Step 5: Database Commit & Audit
- **File:** `src/engine/lifecycle.js`
- `await trade.save()`.
- Calls `auditEngine.logAction(tradeRef, "MO_VALIDATE_PASS", userId, comment)`.
  - **File:** `src/engine/auditEngine.js` -> `AuditLog.create(...)`.

### Step 6: Socket Broadcast
- **File:** `src/engine/lifecycle.js`
- `socketEngine.getIo().to("user_" + userId).emit("trade_update", { tradeRef })`.

### Step 7: Controller Response
- **File:** `src/routes/tradeRoutes.js`
- Fetches the user's updated queue: `queueRoutes.fetchQueue(req.user.userId, desk)`.
- Sends HTTP response: `res.json({ success: true, trades: [...] })`.

### Step 8: Frontend UI Update
- **File:** `WorkstationComponent` (`src/app/workstation/page.js`)
- `submitAction` receives HTTP response.
- `setQueue(data.trades)` updates the table.
- `setPopupState({ type: null })` closes modal.
- *Meanwhile*, the Socket.io listener receives `"trade_update"` and optionally triggers `refreshQueueSilent()` as a failsafe.
