# UI Guidelines

## Design Language

The iLabs1 UI uses a **professional, finance-grade aesthetic** inspired by Bloomberg Terminal and institutional banking systems. The design is functional-first with dark/muted tones for the core workstation and a clean gradient for the login portal.

---

## Color Palette

### Primary Colors (Workstation / Backend)
| Token | Hex | Usage |
|-------|-----|-------|
| Navy Dark | `#0B1F3A` | MO Desk topbar, primary buttons |
| Navy Medium | `#1E3A5F` | Confirmation desk topbar, table headers |
| Dark Red | `#3A1F1F` | Settlement desk topbar |
| Slate 900 | `#0f172a` | Main backgrounds (dark panels) |
| Slate 800 | `#1e293b` | Table headers, secondary backgrounds |
| Slate 700 | `#334155` | Border colors, hover states |
| Slate 200 | `#e2e8f0` | Light borders, secondary button background |
| White | `#ffffff` | Card backgrounds, cell backgrounds |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Amber 500 | `#f59e0b` | Warning/refresh buttons, Termsheet button |
| Blue 500 | `#3b82f6` | Focus rings, audit card accent |
| Purple 500 | `#8b5cf6` | "View Truth" button, automated audit cards |
| Green | `#107c10` | Counterparty sender color |
| Red | `#c4314b` | FO sender color |

### Login Page Colors
- Background: Gradient `from-slate-900 via-blue-900 to-slate-900`
- Card: White with blue-focused inputs
- Primary button: `from-blue-600 to-blue-700`

---

## Typography

- **Primary font**: Inter (sans-serif) — loaded via Google Fonts
- **Monospace font**: Consolas / Courier New — for numeric values, XML/audit content
- **Geist Sans / Geist Mono** — used in Next.js layout (global CSS vars)

### Font Sizes
| Context | Size |
|---------|------|
| Table cells | 12px |
| Buttons | 13–14px |
| Body text | 13–14px |
| Headers | 16–24px |
| Audit cards | 11–13px |

---

## Component Patterns

### Buttons
```css
.btn {
  padding: 10px 18px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
```

Button variants:
- `.primary` — `#0B1F3A` background, white text
- `.secondary` — `#e2e8f0` background, dark text
- `.warning` — `#f59e0b` background, white text

### Tables (Workstation)
- Sticky headers with dark background (`#1e293b`)
- Row hover: `#e0e7ff` (indigo tint)
- Alternating row tints (even rows: `#f8fafc`)
- Checkbox selection in first column
- Numeric columns right-aligned with monospace font

### Popups / Modals
- `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.95)` background
- `border-radius: 16px`
- Overlay: `rgba(15, 23, 42, 0.6)` with `backdrop-filter: blur(4px)`
- Width: 450px standard, 550px for audit/truth views

### Status Badges (Communication Page)
- `.badge-resolved` — green
- `.badge-responded` — blue
- `.badge-awaiting` — amber/orange
- `.badge-break` — red

---

## Layout Patterns

### Workstation Layout
```
[Top Bar: Desk name | Mailbox btn | Timer | Refresh | Clock | Logoff]
[Container: 96% width, max 1600px]
  [Generate Queue button]
  [Trade Table: 550px height, scrollable, min-width 1500px]
  [Action Bar: flex space-between
    [Left: Desk-specific action buttons]
    [Right: Download CSV | Audit | Mailbox | View Truth]
  ]
```

### Communication Page Layout
```
[Header bar: App name | Back | Status | Compose button]
[Three-panel layout:
  [Folder sidebar (narrow)]
  [Inbox list (medium)]
  [Message view (wide)]
]
```

---

## UX Principles

1. **Actions are always contextual** — desk-specific buttons shown only for current desk
2. **Selected trade drives available actions** — buttons check `selectedTrade.currentStatus`
3. **User feedback is immediate** — queue refreshes after every action
4. **Real-time awareness** — socket events trigger silent queue refresh (no page reload)
5. **Simulation clock is always visible** — top-right of workstation topbar
6. **Session timer is always visible** — next to simulation clock
7. **Mailbox is always accessible** — "📧 Mailbox" button in both topbar AND action bar

---

## Accessibility Gaps (Known)

- `alert()` modals are not screen-reader friendly (KI-014)
- No ARIA roles on table rows
- No keyboard navigation for trade selection
- No focus management in popups
