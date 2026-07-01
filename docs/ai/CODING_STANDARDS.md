content: # Coding Standards

> Last updated: 2026-06-27

---

## Language & Runtime

| Layer | Standard |
|-------|---------|
| Backend | Node.js, **CommonJS** (`require` / `module.exports`) |
| Frontend | Next.js 16 App Router, React 19, **ES Modules** (`import` / `export default`) |
| Types | JavaScript only (no TypeScript — considered for a future phase) |
| Node version | v18+ required |

---

## Backend Standards

### File Organization

- One concern per file — no mixing route logic with business logic
- **Routes** → `src/routes/` — only validate input, call engine, return response
- **Engines** → `src/engine/` — all business logic, no HTTP context
- **Models** → `src/models/` — pure Mongoose schema definitions, no methods
- **Middleware** → `src/middleware/` — Express middleware (currently only `auth.js`)

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files | `camelCase.js` | `communicationEngine.js`, `queueComposer.js` |
| Classes | `PascalCase` | `LifecycleEngine`, `QueueComposer` |
| Functions | `camelCase` | `buildQueue()`, `processReplies()`, `generateSingleTrade()` |
| Constants | `UPPER_SNAKE_CASE` | `TOTAL_TRADES`, `SESSION_DURATION_MS`, `FULL_POOL_SIZE` |
| Route handlers | inline `async (req, res) => {}` | — |
| Models | `PascalCase` | `Trade`, `Queue`, `AuditLog` |

### Error Handling

```js
// Standard route pattern
app.post("/api/route", authenticateToken, async (req, res) => {
  try {
    const result = await engine.doSomething(req.body, req.user.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof InvalidTransitionError) return res.status(400).json({ error: err.message });
    console.error("Route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

- Always wrap route handlers in `try/catch`
- Use specific HTTP codes: 400 (bad request), 401 (no auth), 403 (bad token), 404 (not found), 500 (unexpected)
- Fire-and-forget operations (audit logging) use `.catch(err => console.warn(...))` — never block the response
- Never swallow errors silently in critical execution paths

### Async/Await

- Always use `async/await` — no raw `.then().catch()` chains in route/engine code
- Always `await` DB operations before accessing results
- Background `setInterval` callbacks use silent catches: `setInterval(() => { engine.process().catch(() => {}) }, 3000)`

### Comments

```js
// ======================================
// SECTION HEADER (use for major divisions)
// ======================================

// ── Sub-section or step ──

// Single-line explanation for non-obvious logic
```

- Magic numbers must be defined as named constants with a comment explaining the value
- Public functions get a JSDoc-style comment block if their signature is non-trivial

### Database Patterns

```js
// Read-only queries: always use .lean() for performance
const trades = await Trade.find({ assignedTo: userId }).lean();

// Mutating nested objects: always markModified()
trade.pendingAmendments.push(newAmendment);
trade.markModified("pendingAmendments");
await trade.save();

// Never trust client trade data — always re-fetch
const trade = await Trade.findOne({ tradeRef: req.body.trade.tradeRef, assignedTo: req.user.userId });
if (!trade) return res.status(404).json({ error: "Trade not found" });
```

---

## Frontend Standards

### File Organization

- Pages → `frontend/src/app/<route>/page.js` (Next.js App Router)
- Page CSS → `frontend/src/app/<route>/page.css` (for communication page only)
- Shared utilities → `frontend/src/lib/` (currently only `auth.js`)
- **All pages use `"use client"`** directive — no Server Components implemented yet
- Each page component wrapped in `<Suspense>` for `useSearchParams()` compliance

### Page Component Pattern

Every page uses the inner/outer Suspense pattern:

```jsx
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadUserId, getToken, authHeaders, clearSession } from "../../lib/auth";
import toast from "react-hot-toast";

function DashboardComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... all state, effects, handlers
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardComponent />
    </Suspense>
  );
}
```

**Why Suspense**: Next.js App Router requires `useSearchParams()` to be inside a `<Suspense>` boundary. Without it, the build will show a warning and the page won't stream.

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Page components | `PascalCase` | `WorkstationComponent`, `CommunicationComponent` |
| State variables | `camelCase`, descriptive | `selectedTrade`, `sessionExpiry`, `simTime` |
| User-interaction handlers | `handle*` prefix | `handleOpenAction()`, `handleTradeSelect()` |
| Data fetchers/refreshers | `load*` or `refresh*` | `loadQueue()`, `refreshQueueSilent()` |
| Boolean state | `is*` or `has*` | `isLoading`, `hasActiveSession` |

### Auth Pattern

Always use the centralized `auth.js` helpers — never manually read/write auth state:

```js
import { loadUserId, getToken, authHeaders, clearSession, saveSession } from "../../lib/auth";

// On API call:
const res = await fetch("/api/queue/my?desk=MO", { headers: authHeaders() });

// On login success:
saveSession(data.token, data.user.email, data.user.fullName);

// On logout:
clearSession();
router.push("/");
```

### Notification Pattern

All user-facing notifications use `react-hot-toast`:

```js
import toast from "react-hot-toast";

toast.success("Trade validated successfully");
toast.error("Session expired. Login again.");
toast("Email sent to CPTY");  // neutral
```

Never use `alert()`, `confirm()`, or `prompt()`.

### State Management

- Local `useState` per component — no global state store
- `useRef` for: socket instances, polling interval IDs, alert-shown guards (`alert1hrShown`, `alert10minShown`)
- `useEffect` cleanup always returns a teardown: `return () => { socket.disconnect(); clearInterval(pollInterval); }`
- Trade sync: compare `selectedTrade` by key fields (`currentStatus`, `pendingAmendments.length`) not by `JSON.stringify`

### API Calls

```js
// Pattern for all protected API calls
const res = await fetch("/api/trade/action", {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify({ trade: { tradeRef }, action, comment })
});
const data = await res.json();
if (!data.success) {
  toast.error(data.error || "Action failed");
  return;
}
// proceed with data
```

- All calls to `/api/*` (proxied to backend via Next.js rewrites)
- Always check `data.success === false` before using response data
- Silently catch background polling errors (network drops are expected in dev)

### Styling

- **Login page**: TailwindCSS v4 utility classes exclusively
- **Workstation / Dashboard**: Inline `<style dangerouslySetInnerHTML={{ __html: cssString }}>` (complex dynamic styles)
- **Communication**: `page.css` import (page-specific CSS file)
- CSS variables: `--font-geist-sans`, `--font-geist-mono` (set by Next.js font loader)

---

## General Principles

1. **Never trust the client** — validate and re-fetch everything server-side
2. **Comments are architecture documentation** — section headers and intent comments must be maintained
3. **Prefer clarity over cleverness** — readable code beats clever one-liners
4. **Fire-and-forget audit** — audit failures must never block user-facing operations
5. **Graceful degradation** — LLM fails → offline responses; DB fails → memory mode
6. **Minimize prop drilling** — if a value is needed in many places, centralize it (like `auth.js`)
7. **No backwards-compatibility shims** — if something is removed, delete it completely; no `_deprecated` aliases
 file_path: /workspace/ilabs1/ai/CODING_STANDARDS.md