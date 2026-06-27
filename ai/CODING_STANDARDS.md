# Coding Standards

## Language & Runtime

- **Backend**: Node.js, CommonJS modules (`require`/`module.exports`)
- **Frontend**: Next.js 16 App Router, React 19, ES Modules (`import`/`export`)
- **Style**: JavaScript only (no TypeScript currently — considered for future)

---

## Backend Standards

### File Organization
- One concern per file
- Engines go in `src/engine/` — no business logic in routes
- Routes only orchestrate: validate input → call engine → return response
- Models go in `src/models/` — pure Mongoose schema definitions

### Naming Conventions
- **Files**: `camelCase.js` (e.g., `communicationEngine.js`, `tradeGenerator.js`)
- **Classes**: `PascalCase` (e.g., `QueueComposer`, `LifecycleEngine`)
- **Functions**: `camelCase` (e.g., `buildQueue`, `processReplies`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `TOTAL_TRADES`, `SESSION_DURATION_MS`)
- **Route handlers**: inline async arrow functions

### Error Handling
- All route handlers wrapped in `try/catch`
- Return proper HTTP status codes (400, 401, 403, 404, 500)
- Error messages via `res.status(N).json({ error: message })`
- Fire-and-forget operations (audit logging) use `.catch()` with a warning
- Never swallow errors silently in critical paths

### Comments
- Section headers use `// ======================================` style
- Complex logic gets descriptive comments above the relevant code
- Magic numbers defined as named constants with comment explaining the value

### Async/Await
- Always use `async/await` — no raw promise chains
- Always `await` before accessing DB query results
- Background `setInterval` callbacks catch errors silently (by design — non-critical)

### Database Patterns
- Always `await` Mongoose operations
- Use `.lean()` for read-only queries (better performance)
- Use `markModified()` when mutating nested objects in Mongoose documents
- Never trust client-provided trade data — always re-fetch from DB with ownership check

---

## Frontend Standards

### File Organization
- Pages go in `frontend/src/app/<route>/page.js` (App Router convention)
- Page-specific CSS goes in `frontend/src/app/<route>/page.css`
- All pages use `"use client"` directive (no server components yet)
- Components wrapped in `<Suspense>` for `useSearchParams()` compliance

### Naming Conventions
- **Components**: `PascalCase` (e.g., `WorkstationComponent`, `CommunicationComponent`)
- **State variables**: `camelCase`, descriptive (e.g., `selectedTrade`, `sessionExpiry`)
- **Event handlers**: `handle*` prefix for user interactions (e.g., `handleOpenAction`)
- **Fetchers/loaders**: `load*` or `refresh*` prefix (e.g., `loadTrade`, `refreshQueueSilent`)

### Auth Pattern
```javascript
const getToken = () => sessionStorage.getItem("auth_token") || Cookies.get("auth_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": "Bearer " + getToken()
});
```
Use this pattern consistently on all protected fetch calls.

### Styling
- TailwindCSS v4 for utility classes (login page)
- Inline `<style dangerouslySetInnerHTML>` for complex page-specific CSS (workstation, dashboard)
- `page.css` imports for communication page
- Prefer consistent variable naming in CSS: `--font-geist-sans`, etc.

### State Management
- Local `useState` per component — no global state store
- Refs (`useRef`) for: socket instances, polling values, alert-shown guards
- `useEffect` cleanup returns (unmount socket.disconnect, clearInterval)
- Keep selected trade in sync with queue updates via `useEffect` comparison

### API Calls
- All calls to `/api/*` (proxied to backend)
- Always handle `data.success === false` before trusting response
- Silently fail on background polling errors (network drops are expected)

---

## General Principles

1. **Don't trust the client** — validate everything server-side
2. **Comments are documentation** — keep section headers and intent comments in place
3. **Prefer clarity over cleverness** — readable code > clever one-liners
4. **Backward compatibility** — don't remove working API fields without a migration plan
5. **Fire-and-forget audit** — never let audit failures block user-facing operations
6. **Graceful degradation** — if LLM fails, use offline responses; if DB fails, use memory mode
