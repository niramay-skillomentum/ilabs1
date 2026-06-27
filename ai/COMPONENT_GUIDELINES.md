# Component Guidelines

## Frontend Component Structure

### Page Component Pattern (Standard)
All Next.js pages follow this pattern due to `useSearchParams()` requiring `<Suspense>`:

```jsx
"use client";

// Inner component with all logic
function XxxComponent() {
  const searchParams = useSearchParams();
  // ... all state and logic ...
}

// Outer export wraps in Suspense
export default function XxxPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <XxxComponent />
    </Suspense>
  );
}
```

**Why**: Next.js App Router requires `useSearchParams()` to be inside a `<Suspense>` boundary.

---

## Existing Pages

### `page.js` (Login/Register)
- **State**: `isLoginMode`, `email`, `password`, `fullName`, `errorMsg`, `isLoading`
- **API calls**: `POST /api/auth/login`, `POST /api/auth/register`
- **Post-login**: Sets cookie + sessionStorage, redirects to `/dashboard?userId=...&fullName=...`
- **Styles**: TailwindCSS utility classes only (no inline CSS)
- **DO NOT ADD**: Backend calls without loading state; navigation without auth check

### `dashboard/page.js`
- **State**: `userId`
- **Purpose**: Simple desk selector — routes to `/workstation?userId=...&desk=...`
- **Auth check**: Verifies `auth_token` cookie exists
- **Style**: Inline `<style dangerouslySetInnerHTML>` with dark theme
- **DO NOT COMPLICATE**: Keep this page minimal — it's a routing hub only

### `workstation/page.js`
- **State**: `queue[]`, `selectedTrade`, `sessionExpiry`, `sessionStart`, `simTime`, `sessionTimerStr`, `popupState`, `comment`, `emailText`, `auditData`
- **Refs**: `alert1hrShown`, `alert10minShown`, `socketRef`
- **Key patterns**:
  - Auth headers via `authHeaders()` helper
  - Silent refresh via `refreshQueueSilent(desk)` — no user-visible feedback
  - Full refresh via `refreshQueue()` — shows alert
  - Selected trade syncs with queue via `useEffect` equality check
  - 15s polling fallback via `setInterval` in `useEffect`
  - Popups: `popupState.type` drives which modal is visible: `"action"`, `"email"`, `"audit"`, `"truth"`
- **DO NOT DUPLICATE**: Action allowed-status mapping — it mirrors backend `allowedActions` object

### `communication/page.js`
- **State**: `userId`, `desk`, `channel`, `selectedTradeRef`, `currentFolder`, `inboxData[]`, `currentTrade`, `currentMessages[]`, `replyModalOpen`, `composeModalOpen`, etc.
- **Refs**: `socketRef`, `inboxDataRef`, `selectedTradeRefRef`, `currentFolderRef`, `lastRenderedInboxDataStr`
- **Key patterns**:
  - Uses `useCallback` on expensive functions to prevent re-render loops
  - Handles both CPTY channel (`"COUNTERPARTY"`) and FO channel (`"FO"`) in same page
  - Composer pre-fills when opened from workstation via URL params (`composeFor`, `composeTo`, `composeAction`)
  - `lastRenderedInboxDataStr` ref prevents unnecessary inbox re-renders on socket events
- **DO NOT SPLIT** the folder/channel detection logic — it's tightly coupled to inbox rendering

### `trade/page.js` (Legacy)
- **Status**: Semi-deprecated — kept for reference but not the primary UI
- **Issues**: Uses non-existent action `MO_RESOLVE_BREAK`; email send missing auth header
- **DO NOT RELY ON**: Use workstation + communication pages instead

### `mo-risk/page.js`
- **Purpose**: Termsheet/risk reference document — read-only
- **Opened from**: Workstation topbar "📄 View Termsheet" button (MO desk only)

---

## Engine/Service Patterns (Backend)

### Engine Module Pattern
Each engine exports a plain object or class with focused methods:

```javascript
// Pattern A: Module exports object (most common)
module.exports = {
  methodOne,
  methodTwo
};

// Pattern B: Class instance
class QueueComposer { ... }
module.exports = new QueueComposer();
```

### Shared Engine Instances
All engines are singletons — `require()` returns the same instance across all route files. This is intentional for in-memory state (pending reply queues, cached trades).

### Engine Responsibilities

| Engine | Responsibility |
|--------|---------------|
| `queueComposer.js` | Build/fetch/end user session queues |
| `tradeGenerator.js` | Generate synthetic trades with realistic breaks |
| `communicationEngine.js` | Schedule and process CPTY/FO reply queues |
| `conversationEngine.js` | CRUD for email conversation threads |
| `foInternalChannel.js` | CRUD and scheduling for FO internal channel |
| `truthEngine.js` | Detect mismatches between truths and bookings |
| `amendmentEngine.js` | Extract, attach, apply trade amendments |
| `auditEngine.js` | Record and retrieve audit events |
| `lifecycle.js` | Trade status transition validation |
| `scoringEngine.js` | Award/deduct points for user actions |
| `clock.js` | Simulation clock (start, reset, get time) |
| `socketEngine.js` | Initialize and expose Socket.io instance |
| `llmService.js` | Unified LLM call abstraction |
| `cptyAI.js` | Generate AI counterparty responses |
| `foAI.js` | Generate AI FO internal responses |
| `offlineResponseEngine.js` | Static fallback responses when LLM unavailable |
| `aiParser.js` | Parse user email text with AI |
| `ageCalculator.js` | Calculate trade age in days |
| `agendaJobs.js` | Register Agenda periodic jobs |

---

## Adding New Pages

When creating a new frontend page:

1. Create `frontend/src/app/<route>/page.js`
2. Add `"use client"` at top
3. Use the Suspense wrapper pattern (see above)
4. Use `authHeaders()` pattern for all API calls
5. Check auth on mount (`useEffect`) — redirect to `/` if no token
6. Follow workstation color scheme for consistency
7. Update `CURRENT_PROGRESS.md`, `ROADMAP.md`, and `CHANGELOG.md`

## Adding New API Routes

When creating a new backend route:

1. Create `src/routes/<name>Routes.js`
2. Use `authenticateToken` middleware on all protected endpoints
3. Always re-fetch trade from DB with `assignedTo: userId` check
4. Always return `{ success: true, data }` or `{ error: message }`
5. Log to audit engine (fire-and-forget)
6. Register in `server.js` under `/api/<name>`
7. Update `API.md` and `CHANGELOG.md`
