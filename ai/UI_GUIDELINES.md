content: # UI Guidelines

> Last updated: 2026-06-27

---

## Technology

| Tool | Usage |
|------|-------|
| TailwindCSS v4 | Login/Register page — full utility class styling |
| Inline `<style dangerouslySetInnerHTML>` | Workstation, Dashboard — complex custom CSS |
| `page.css` import | Communication page — dedicated stylesheet |
| `globals.css` | Global resets + CSS custom properties |
| Next.js font loader | Geist Sans + Geist Mono — `--font-geist-sans`, `--font-geist-mono` |
| react-hot-toast | Toast notifications — all user feedback messages |

---

## Notification Rules

**Always use `react-hot-toast`** — never `alert()`, `confirm()`, or `prompt()`.

```js
import toast from "react-hot-toast";

// Success action
toast.success("Trade validated. Moving to Confirmation desk.");

// Error / warning
toast.error("Session expired. Please log in again.");

// Neutral info
toast("Email sent to counterparty.");

// With duration
toast("⏰ 1 hour remaining in your session", { duration: 6000 });
toast.error("🚨 10 minutes remaining!", { duration: 6000 });
```

---

## Color Conventions

Statuses are always indicated by consistent color coding across all pages:

| Status Family | Color | CSS Class / Approach |
|---------------|-------|---------------------|
| MO statuses | Blue tones | `color: #1a73e8` or `background: rgba(26,115,232,0.1)` |
| Confirmation statuses | Orange/amber | `color: #f57c00` or `background: rgba(245,124,0,0.1)` |
| Settlement statuses | Purple | `color: #7b1fa2` or `background: rgba(123,31,162,0.1)` |
| Break / error statuses | Red | `color: #d32f2f` or `background: rgba(211,47,47,0.1)` |
| Clean / pass | Green | `color: #2e7d32` or `background: rgba(46,125,50,0.1)` |
| Pending / neutral | Grey | `color: #616161` |

---

## Status Display Labels

Map raw status codes to human-readable labels in the UI:

| Status Code | Display Label |
|-------------|--------------|
| `MO_PENDING` | MO Pending |
| `MO_BREAK_OPEN` | Break Open |
| `PENDING_FO_RESPONSE` | Awaiting FO |
| `CONFIRMATION_PENDING` | Confirmation Pending |
| `LIASING_WITH_CPTY` | Liaising with CPTY |
| `CONFIRMATION_BREAK` | Confirmation Break |
| `LIASING_WITH_FO` | Escalated to FO |
| `SETTLEMENT_PENDING` | Settlement Pending |
| `READY_FOR_APPROVAL` | Ready for Approval |
| `SETTLEMENT_BREAK` | Settlement Break |

---

## Layout Architecture

### Workstation Page

```
┌────────────────────────────────────────────────────┐
│  Header: Desk name | Simulation clock | Session timer│
├──────────────────┬─────────────────────────────────┤
│  Trade Queue     │  Action Panel                   │
│  Table (left)    │  (right side)                   │
│                  │  ┌─────────────────────────────┐ │
│  20 rows         │  │ Selected Trade Details      │ │
│  Selectable      │  │ Available actions           │ │
│                  │  │ Comment textarea            │ │
│                  │  │ Submit button               │ │
│                  │  └─────────────────────────────┘ │
├──────────────────┴─────────────────────────────────┤
│  Toolbar: CSV Export | Audit Popup | Truth Viewer   │
└────────────────────────────────────────────────────┘
```

### Communication Page

```
┌─────────────────────────────────────────────────────┐
│  Header: Back to Workstation | Folder tabs           │
├──────────────┬──────────────────────────────────────┤
│  Inbox List  │  Message Thread                      │
│  (left col)  │  (right col)                         │
│              │  ┌──────────────────────────────────┐ │
│  Conversation│  │ Subject + participants           │ │
│  cards with  │  │ Message bubbles (USER / CPTY/FO) │ │
│  subject,    │  │ Reply textarea                   │ │
│  timestamp,  │  │ Send button                      │ │
│  sender      │  └──────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────┘
```

---

## Popup / Modal Guidelines

### Audit Popup (Workstation)

Triggered by "Audit Trail" button on a selected trade.

- Shows **both** XML audit trail AND structured `AuditLog` entries in the same popup
- XML is displayed in a `<pre>` block with horizontal scroll
- Structured trail is a table: timestamp | actor | action | details
- Popup is a fixed overlay with close button

### Action Confirmation Modal

For destructive or irreversible actions (e.g., `CONFIRM_TRADE`):
- Show trade summary before confirming
- Comment textarea (mandatory)
- Action-specific contextual hint (e.g., "Confirming will move to Settlement desk")

---

## Trade Queue Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Trade Ref | `trade.tradeRef` | Truncated display; full ref in tooltip |
| Status | `trade.currentStatus` | Color-coded badge |
| Product | `trade.product` | FX / Equity / Derivatives / Fixed Income |
| Direction | `trade.direction` | BUY / SELL |
| Amount | `trade.amount` | Formatted with currency code |
| Currency | `trade.currency` | — |
| Counterparty | `trade.counterparty` | — |
| Value Date | `trade.valueDate` | ISO date display `YYYY-MM-DD` |
| Age (days) | `trade.age` | Days since trade date |

---

## Responsive Design

Current state: designed for **desktop-first** (1280px+). Mobile layout is not implemented.

- Trade queue table overflows horizontally on small screens
- Action panel is hidden below a threshold width
- Future: add responsive breakpoints for mobile (see `ROADMAP.md` Phase 3)

---

## Accessibility Notes

- Toast notifications are rendered by `react-hot-toast` which includes ARIA live region announcements
- Native `<button>` elements used for actions (keyboard navigable)
- Color is not the only indicator — status labels accompany color coding
- `alert()` removed (was blocking, inaccessible) — now all via toast
- Missing: focus management on popup open/close; screen reader labels on icon buttons

---

## CSS Patterns

### Inline Style Block Pattern (Workstation / Dashboard)

```jsx
<>
  <style dangerouslySetInnerHTML={{ __html: `
    .trade-table { width: 100%; border-collapse: collapse; }
    .trade-row:hover { background: #f5f5f5; cursor: pointer; }
    .trade-row.selected { background: #e3f2fd; }
    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  ` }} />
  <div className="trade-table">...</div>
</>
```

This pattern is used where TailwindCSS utilities would be too verbose and page-scoped CSS is needed without a separate file.

### TailwindCSS Pattern (Login Page)

```jsx
<div className="min-h-screen flex items-center justify-center bg-gray-50">
  <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">SGB Operations Simulator</h1>
    ...
  </div>
</div>
```

### CSS File Pattern (Communication Page)

```css
/* frontend/src/app/communication/page.css */
.communication-layout { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 60px); }
.inbox-panel { border-right: 1px solid #e0e0e0; overflow-y: auto; }
.thread-panel { display: flex; flex-direction: column; }
```

---

## Do Not

- ❌ Use `alert()`, `confirm()`, `prompt()` — use `react-hot-toast`
- ❌ Use inline JavaScript event handlers (`onclick="..."`) — use React `onClick` props
- ❌ Hardcode backend URLs in JSX — use `/api/*` relative paths (proxied) or `process.env.NEXT_PUBLIC_BACKEND_URL` for socket
- ❌ Display raw status codes in UI (`MO_PENDING`) — always map to human-readable labels
- ❌ Show unformatted dates (`2026-06-27T09:00:00.000Z`) — format to `YYYY-MM-DD` or locale string
- ❌ Mix styling approaches on the same page — choose one (Tailwind, inline, or CSS file)
 file_path: /workspace/ilabs1/ai/UI_GUIDELINES.md