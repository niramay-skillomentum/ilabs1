# 6. Routing and Navigation

This document maps all frontend and backend routes in the SGB Operations Simulator.

## Frontend Navigation Map (Next.js App Router)

The frontend uses Next.js file-based routing within `frontend/src/app/`.

| Route Path | Component File | Protection / Flow | Purpose |
|------------|----------------|-------------------|---------|
| `/` | `page.js` | Public | Login & Registration page. Sets `sessionStorage`. |
| `/dashboard` | `dashboard/page.js` | Protected | Desk selection (MO, CONFIRMATION, SETTLEMENT). Requires `sessionStorage` token. |
| `/workstation` | `workstation/page.js` | Protected | The main queue management screen. Expects `?desk=` parameter. |
| `/communication` | `communication/page.js` | Protected | Mailbox interface. Expects `?desk=` parameter. Optionally takes `?tradeRef=`, `?composeFor=`, `?channel=` to deep-link. |
| `/mo-risk` | `mo-risk/page.js` | Protected | Termsheet viewer. Expects `?desk=MO`. |

### Client-Side Protection Logic
In every protected route (e.g., `dashboard`, `workstation`), a `useEffect` hook runs on mount:
```javascript
const uid = loadUserId();
if (!uid || !getToken()) {
    toast.error("Session expired. Login again.");
    router.push("/");
}
```

---

## Backend API Routes (Express)

The backend exposes several modular routers mounted in `server.js`. All routes (except auth) expect a `Bearer` JWT token handled by `src/middleware/auth.js`.

### Authentication (`/api/auth`)
Mounted via `src/routes/authRoutes.js`.
- `POST /api/auth/login` - Authenticates user, returns JWT.
- `POST /api/auth/register` - Creates a new `User` record.

### Session (`/api/session`)
Mounted via `src/routes/sessionRoutes.js`.
- `POST /api/session/logout` - Clears session data.
- `GET /api/session/info` - Returns user data from token.

### Queue Management (`/api/queue`)
Mounted via `src/routes/queueRoutes.js`.
- `GET /api/queue/my` - Returns trades assigned to the user for a specific desk.
- `POST /api/queue/generate` - Generates a synthetic queue of trades and assigns them.

### Trade Actions (`/api/trade`)
Mounted via `src/routes/tradeRoutes.js`.
- `GET /api/trade/all` - Returns all trades for the user (used by MO-Risk).
- `POST /api/trade/action` - Processes lifecycle actions (e.g., `MO_VALIDATE_PASS`, `CONFIRM_SEND_TO_CPTY`).

### Conversations / Mailbox (`/api/conversation` & `/api/conversations`)
Mounted via `src/routes/conversationRoutes.js`.
- `GET /api/conversations/personal` - Lists inbox for a specific user.
- `GET /api/conversations/shared` - Lists group inbox for a desk.
- `GET /api/conversation/:tradeRef` - Fetches the full message history for a trade.
- `POST /api/conversation/send` - Sends a new message (to FO or CPTY).
- `POST /api/conversation/resolve` - Marks a conversation as resolved.

### Front Office Internal Channel (`/api/fo-channel`)
Mounted via `src/routes/foChannelRoutes.js`.
- `GET /api/fo-channel/list` - Fetches FO specific conversation threads.
- `GET /api/fo-channel/:tradeRef` - Fetches FO thread messages.
- `POST /api/fo-channel/send` - Sends message specifically to the FO escalation channel.

### Audit (`/api/audit`)
Mounted via `src/routes/auditRoutes.js`.
- `GET /api/audit/:tradeRef` - Returns the audit trail and truth XML for a specific trade.

### Clock (`/api/clock`)
Mounted via `src/routes/clockRoutes.js`.
- `GET /api/clock/status` - Gets the current simulated time.
