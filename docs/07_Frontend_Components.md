# 7. Frontend Components Reference

The Next.js frontend uses a combination of page components and reusable sub-components. All state is handled via React Hooks (`useState`, `useEffect`) and browser `sessionStorage`.

## Pages

### 1. `LoginPage` (`src/app/page.js`)
- **Purpose:** Entry point for the application. Handles both login and registration.
- **State:** `email`, `password`, `fullName`, `isLoginMode`, `isLoading`, `errorMsg`.
- **API Calls:** `POST /api/auth/login`, `POST /api/auth/register`.
- **Navigation:** Redirects to `/dashboard` upon successful login.

### 2. `DashboardComponent` (`src/app/dashboard/page.js`)
- **Purpose:** Allows the user to select their role/desk (MO, Confirmation, Settlement).
- **State:** `userId`.
- **Hooks:** Validates session on mount.
- **Navigation:** Deep links to `/workstation?desk={SELECTED_DESK}`.

### 3. `WorkstationComponent` (`src/app/workstation/page.js`)
- **Purpose:** The main operational queue grid.
- **State:** `queue` (list of trades), `selectedTrade`, `sessionExpiry`, `simTime`, `popupState` (for modals), `comment`, `emailText`.
- **Real-time:** Uses `socket.io-client` listening to `trade_update` and `new_email` to silently refresh the queue. Uses `setInterval` for the simulation clock.
- **API Calls:** 
  - `GET /api/queue/my` (loads trades)
  - `POST /api/queue/generate` (generates new trades)
  - `POST /api/trade/action` (submits workflow actions)
  - `POST /api/session/logout`

### 4. `MoRiskComponent` & `TermsheetViewer` (`src/app/mo-risk/page.js`)
- **Purpose:** Middle Office Risk document viewer. Displays the internal "truth" of a trade (immutable FO parameters).
- **State:** `allTrades`, `searchQuery`, `selectedTrade`.
- **API Calls:** `GET /api/trade/all`.
- **Sub-components:** `TermsheetViewer` renders the specific trade economics.

### 5. `CommunicationComponent` (`src/app/communication/page.js`)
- **Purpose:** Mailbox interface for ops-to-ops and ops-to-cpty interactions.
- **State:** `inboxData`, `currentTrade`, `currentMessages`, `composeModalOpen`, `replyModalOpen`, `currentFolder`.
- **Real-time:** Socket.io listens to `new_email` to auto-refresh inbox.
- **API Calls:** `GET /api/conversations/personal`, `GET /api/conversations/shared`, `GET /api/fo-channel/list`.
- **Sub-components:** 
  - `FolderNav`: Left pane (Inbox, Sent, FO Channel).
  - `InboxList`: Middle pane (List of conversations).
  - `MessageThread`: Right pane (The chat history).
  - `ComposeModal`: Modal to draft new messages.
  - `ReplyModal`: Modal to reply to existing threads.

## Reusable Sub-components (Communication)

### `FolderNav.js`
- **Props:** `channel`, `currentFolder`, `switchFolder`.
- **Purpose:** Renders the folder sidebar.

### `InboxList.js`
- **Props:** `searchQuery`, `setSearchQuery`, `filteredInbox`, `loadConversation`, `selectedTradeRef`.
- **Purpose:** Renders the list of emails. Filters based on `searchQuery`.

### `MessageThread.js`
- **Props:** `currentMessages`, `currentTrade`, `resolveState`, `resolveConversation`, `openReplyModal`.
- **Purpose:** Displays the thread. Includes a "Resolve" button depending on the `resolveState` computed in the parent.

### `ComposeModal.js`
- **Props:** `composeModalOpen`, `composeTrades`, `sendCompose`, etc.
- **Purpose:** A modal that allows users to select a trade and write an initial email to FO or Counterparty. Auto-generates template drafts.

### `ReplyModal.js`
- **Props:** `replyModalOpen`, `currentTrade`, `sendReply`, `replyBody`.
- **Purpose:** A simpler modal just for appending to an existing thread.
