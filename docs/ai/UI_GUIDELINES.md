# UI Guidelines

> User interface design principles, patterns, and visual standards.

---

## 1. Design Philosophy

- **Dark theme** — Primary visual identity (dark backgrounds, light text)
- **Functional over decorative** — UI serves operational purpose
- **Outlook-inspired** — Communication module follows Microsoft Outlook patterns
- **Information-dense** — Trade tables show maximum relevant data
- **Action-oriented** — Clear CTAs for each desk's primary actions

---

## 2. Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Background (primary) | `#1a1a2e` / `#16213e` | Main page backgrounds |
| Background (secondary) | `#0f3460` | Cards, panels, modals |
| Background (accent) | `#533483` | Active states, highlights |
| Text (primary) | `#ffffff` | Headings, important text |
| Text (secondary) | `#a0aec0` / `#cbd5e0` | Body text, labels |
| Success | `#48bb78` / `#38a169` | Pass, approved, settled |
| Danger | `#fc8181` / `#e53e3e` | Fail, break, rejected, errors |
| Warning | `#f6ad55` / `#dd6b20` | Pending, escalated, alerts |
| Info | `#63b3ed` / `#3182ce` | Links, system notifications |
| Accent (desk buttons) | `#4299e1` / `#3182ce` | Dashboard desk selection buttons |

---

## 3. Typography

| Font | Source | Usage |
|------|--------|-------|
| **Geist Sans** | `next/font/google` | Primary UI font (body, labels) |
| **Geist Mono** | `next/font/google` | Code, trade references |
| **Inter** | Fallback | Referenced in some inline styles |
| **Segoe UI** | System fallback | Referenced in older components |

---

## 4. Layout Patterns

### 4.1 Page Layouts

| Page | Pattern | Key Elements |
|------|---------|-------------|
| Login | Centered card | Full-screen gradient, card form |
| Dashboard | Centered container | 5 desk selection buttons |
| Workstation | Top bar + table | Topbar (desk, timer, clock) → trade table → action bar |
| Communication | 3-panel split | Folder nav (200px) \| Inbox list (360px) \| Reading pane (flex) |
| MO Risk | 2-panel split | Trade list (40%) \| Termsheet viewer (60%) |
| SSI Database | 2-panel split | Search form (35%) \| SSI details (65%) |

### 4.2 Top Bar Pattern

```
┌──────────────────────────────────────────────────────────────┐
│ [Desk Name]     [Mailbox] [SSI DB] [MO Risk]   [Clock] [Timer] [Logoff] │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Component Patterns

### 5.1 Trade Table
- Full-width table with horizontal scroll
- Columns: TradeRef, Status, Amount, Currency, Counterparty, Value Date, Age, Actions
- Row highlighting for selected trade
- Status badge colors (green = cleared, red = break, yellow = pending)
- Fixed header with scrollable body

### 5.2 Action Buttons
- Desk-specific buttons in action bar below table
- Primary action: blue/highlighted
- Secondary actions: standard
- Confirmation modals for destructive actions

### 5.3 Modals
- Centered overlay with dark background
- Close button (X) in top-right
- Form fields inside modal body
- Submit and Cancel buttons at bottom
- Used for: Compose, Reply, Trade Action confirmation, SSI viewer

### 5.4 Notification Toasts
- Position: top-center
- Auto-dismiss (configurable duration)
- Types: success (green), error (red), loading (spinner)
- Library: `react-hot-toast`

### 5.5 Instruction Panel
- Expandable inline panel below trade table
- Toggle via "View Desk Guide" button
- Shows desk-specific SOP steps and pro tips
- Uses Tailwind CSS styling

### 5.6 Tutorial Panel (AI Tutor)
- Floating chatbot button (bottom-right corner)
- Opens chat popup with message history
- Pre-loaded with desk instructions
- Renders markdown responses via `react-markdown`

---

## 6. Status Badge Colors

| Status Category | Color | Examples |
|-----------------|-------|---------|
| Cleared / Complete | Green | SETTLED, CLOSED, RECON_CLEARED, APPROVED |
| Pending / In Progress | Yellow | MO_PENDING, CONFIRMATION_PENDING, SETTLEMENT_PENDING |
| Break / Error | Red | MO_BREAK_OPEN, CONFIRMATION_BREAK, SETTLEMENT_BREAK |
| Communication | Blue | LIASING_WITH_CPTY, LIASING_WITH_FO, PENDING_FO_RESPONSE |
| Amendment | Orange | PENDING_AMENDMENT, AMENDED, PENDING_APPROVAL |

---

## 7. Responsive Design

- Current implementation targets **desktop** (1280px+)
- No mobile/tablet responsive breakpoints implemented yet
- Trade tables use horizontal scroll on smaller viewports
- Communication panels have fixed widths that may overflow

---

## 8. Accessibility (Current State)

| Feature | Status |
|---------|--------|
| Semantic HTML | Partial (some pages use proper elements) |
| ARIA labels | Not implemented |
| Keyboard navigation | Not explicitly implemented |
| Color contrast | Dark theme — varies by component |
| Screen reader support | Not tested |

> **Note**: Accessibility improvements are planned for a future sprint.
