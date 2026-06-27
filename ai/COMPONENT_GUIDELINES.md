content: # Component Guidelines

> Last updated: 2026-06-27

---

## Page Component Pattern

All Next.js App Router pages follow this two-level structure to satisfy the `useSearchParams()` Suspense requirement:

```jsx
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadUserId, getToken, authHeaders, clearSession } from "../../lib/auth";
import toast from "react-hot-toast";

// Inner component: all logic, state, and rendering
function XxxComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. State declarations
  const [data, setData] = useState(null);
  const socketRef = useRef(null);

  // 2. Primary useEffect: runs once on mount
  useEffect(() => {
    const uid = loadUserId();
    if (!uid || !getToken()) {
      toast.error("Session expired. Please log in.");
      router.push("/");
      return;
    }
    // ... initialization, socket setup, initial data load
    return () => {
      socketRef.current?.disconnect();
      // cleanup intervals, etc.
    };
  }, []);

  // 3. Render
  return <div>...</div>;
}

// Outer wrapper: Suspense boundary only — no logic
export default function XxxPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <XxxComponent />
    </Suspense>
  );
}
```

---

## Existing Pages — Reference

### `page.js` — Login / Register (`/`)

**State**: `isLoginMode`, `email`, `password`, `fullName`, `errorMsg`, `isLoading`

**Auth flow**:
1. `POST /api/auth/login` or `POST /api/auth/register`
2. On success: `saveSession(token, email, fullName)` → sets sessionStorage + cookie
3. Sets `sessionStorage.justLoggedIn = "true"` flag for workstation resume toast
4. Redirects to `/dashboard`

**Styling**: TailwindCSS v4 utility classes only — no inline styles

**Do NOT add**: Server-side rendering, backend logic

---

### `dashboard/page.js` — Desk Selector (`/dashboard`)

**State**: `userId`, `fullName`, `sessionInfo` (from `/api/session/info`), `selectedDesk`, `isGenerating`

**Flow**:
1. Load session info on mount
2. If `hasActiveSession` → show "Resume Session" option + go to workstation
3. If no session → show desk buttons (MO / CONFIRMATION / SETTLEMENT)
4. On Generate: `POST /api/queue/generate` → redirect to `/workstation?desk=<desk>`

**Styling**: Inline `<style dangerouslySetInnerHTML>` with CSS custom properties

---

### `workstation/page.js` — Trade Workstation (`/workstation?desk=<desk>`) — 549 lines

**State**:
- `userId`, `desk`, `queue` (array of 20 trades)
- `selectedTrade` — currently selected trade for action panel
- `sessionExpiry`, `sessionStart`, `simTime`, `sessionTimerStr`
- `popupState` — `{ type: "action"|"audit"|"truth", action: <action_code> }`
- `comment`, `emailText`, `auditData` — action form fields

**Refs**: `alert1hrShown`, `alert10minShown`, `socketRef`

**Key behaviors**:
- Socket joins `desk_<desk>` room; listens for `trade_update` → `refreshQueueSilent()`
- Background 15s polling via `setInterval` as fallback
- Session timer: `setInterval(1s)` calculating `sessionExpiry - now`; alerts at 60min and 10min
- Simulation clock: calculates `9:00 AM + elapsed since sessionStart`
- `selectedTrade` sync: `useEffect` on `queue` change compares by key fields, not full stringify
- Audit popup: fetches `GET /api/audit/:tradeRef` → renders XML viewer + structured trail table
- Truth viewer: renders `truths.mo` vs `truths.confirmation` vs `booking` side-by-side
- CSV export: client-side blob download of serialized queue

**Styling**: Inline `<style dangerouslySetInnerHTML>` — complex responsive table/panel layout

---

### `communication/page.js` — Email Mailbox (`/communication?desk=<desk>`) — 850 lines

**State**:
- `userId`, `desk`, `folder` — `"shared"|"personal"|"fo-channel"`
- `conversations` — loaded from `/api/conversation/shared` or `/api/conversation/personal`
- `selectedConversation`, `messages` — currently viewed thread
- `composeOpen`, `replyOpen` — modal visibility
- `composeText`, `replyText` — form fields
- `foChannels`, `selectedFoChannel`, `foMessages` — FO internal channel state

**Key behaviors**:
- Socket listens for `new_email` → reload conversations
- Folder switching (shared inbox / personal / FO channel) via `folder` state
- Compose: `POST /api/conversation/send`
- Reply: `POST /api/conversation/send` (same endpoint, with thread context)
- FO channel: `GET /api/fo-channel/list?desk=<desk>`, `POST /api/fo-channel/send`
- Conversation selection loads message thread: `GET /api/conversation/:tradeRef`

**⚠️ Decomposition needed**: See `KNOWN_ISSUES.md` KI-015. Should be split into:
- `InboxList` — renders conversation list with sender/subject/timestamp
- `MessageThread` — renders messages in selected thread
- `ComposeModal` — new email compose form
- `ReplyModal` — reply to existing thread
- `FolderNav` — folder/tab switcher

**Styling**: `page.css` import — dedicated CSS file for communication layout

---

### `mo-risk/page.js` — MO Termsheet View (`/mo-risk`)

**Purpose**: Reference document showing risk parameters and termsheet fields for a specific trade.

**State**: `trade` data loaded from workstation context or direct trade lookup

**Styling**: Inline styles — document-like layout

---

## Socket.io Pattern

Standard socket setup used in workstation and communication pages:

```js
const socketRef = useRef(null);

useEffect(() => {
  const uid = loadUserId();
  if (!uid) return;

  const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const socket = io(socketUrl, { auth: { token: getToken() } });
  socketRef.current = socket;

  socket.emit("join_desk", desk);

  socket.on("trade_update", ({ tradeRef, currentStatus }) => {
    refreshQueueSilent(desk);
  });

  socket.on("new_email", () => {
    loadConversations();
  });

  return () => socket.disconnect();
}, [desk]);
```

---

## Auth Guard Pattern

Every page that requires authentication checks on mount:

```js
useEffect(() => {
  const uid = loadUserId();
  if (!uid || !getToken()) {
    toast.error("Session expired. Please log in again.");
    router.push("/");
    return;
  }
  setUserId(uid);
  // proceed with authenticated operations
}, []);
```

---

## Session Timer Pattern

Used in workstation to show countdown and trigger alerts:

```js
useEffect(() => {
  if (!sessionExpiry || !sessionStart) return;
  
  const interval = setInterval(() => {
    const diff = new Date(sessionExpiry) - new Date();
    if (diff <= 0) {
      toast.error("🚨 Session expired (3 hours). Logging off.");
      logout();
      return;
    }
    
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    setSessionTimerStr(`${hrs}h ${mins}m ${secs}s`);
    
    // One-shot alerts
    if (diff <= 60 * 60 * 1000 && !alert1hrShown.current) {
      alert1hrShown.current = true;
      toast("⏰ 1 hour remaining in your session", { duration: 6000 });
    }
    if (diff <= 10 * 60 * 1000 && !alert10minShown.current) {
      alert10minShown.current = true;
      toast.error("🚨 10 minutes remaining!", { duration: 6000 });
    }
  }, 1000);

  return () => clearInterval(interval);
}, [sessionExpiry, sessionStart]);
```

---

## Silent Queue Refresh Pattern

Used when a socket event arrives — refreshes queue without resetting selected trade:

```js
const refreshQueueSilent = (currentDesk) => {
  fetch(`/api/queue/my?desk=${encodeURIComponent(currentDesk)}`, { headers: authHeaders() })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        setQueue(data.trades || []);
        // Sync selectedTrade by key fields only
        setSelectedTrade(prev => {
          if (!prev) return prev;
          const updated = data.trades?.find(t => t.tradeRef === prev.tradeRef);
          if (!updated) return prev;
          if (updated.currentStatus !== prev.currentStatus ||
              updated.pendingAmendments?.length !== prev.pendingAmendments?.length) {
            return updated;
          }
          return prev;
        });
      }
    })
    .catch(() => {}); // Silent failure — network drops expected
};
```
 file_path: /workspace/ilabs1/ai/COMPONENT_GUIDELINES.md