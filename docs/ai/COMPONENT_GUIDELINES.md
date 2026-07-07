# Component Guidelines

> Standards for building React components in the SGB Operations Simulator.

---

## 1. Component Philosophy

- **Page-level components** — Each page is a single "use client" component
- **Sub-components** — Complex pages (Communication) decompose into sub-components
- **Shared components** — Reusable across pages (InstructionPanel, TutorialPanel)
- **No global state** — Each component manages its own state
- **No HOCs or render props** — Keep it simple with hooks

---

## 2. Existing Component Catalog

### 2.1 Pages (App Router)

| Component | Route | Lines | Description |
|-----------|-------|-------|-------------|
| `page.js` | `/` | ~100 | Login / Register form |
| `page.js` | `/dashboard` | ~80 | Desk selection (5 buttons) |
| `page.js` | `/workstation` | ~728 | Main trade queue workstation |
| `page.js` | `/communication` | ~647 | 3-panel email client |
| `page.js` | `/mo-risk` | ~200 | Termsheet viewer |
| `page.js` | `/ssi-database` | ~150 | SSI code lookup |

### 2.2 Communication Sub-Components

| Component | File | Description |
|-----------|------|-------------|
| `FolderNav` | `communication/components/FolderNav.js` | Left sidebar folder navigation |
| `InboxList` | `communication/components/InboxList.js` | Middle panel email list with search |
| `MessageThread` | `communication/components/MessageThread.js` | Right panel reading pane with thread |
| `ComposeModal` | `communication/components/ComposeModal.js` | New email composition modal |
| `ReplyModal` | `communication/components/ReplyModal.js` | Reply modal with quoted messages |
| `utils` | `communication/components/utils.js` | Formatting utilities (dates, amounts, subjects) |

### 2.3 Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `InstructionPanel` | `components/InstructionPanel.js` | Expandable desk SOP guide |
| `TutorialPanel` | `components/TutorialPanel.js` | AI Tutor chatbot widget |
| `instructionsData` | `components/instructionsData.js` | Static desk instruction data |

### 2.4 Library

| Module | File | Description |
|--------|------|-------------|
| `auth` | `lib/auth.js` | Token/session storage utilities |

---

## 3. Building a New Component

### 3.1 Page Component Template

```javascript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, loadUserId, authHeaders } from "@/lib/auth";
import toast from "react-hot-toast";

export default function NewPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auth check
    if (!getToken() || !loadUserId()) {
      toast.error("Session expired");
      router.push("/");
      return;
    }

    // Load data
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/endpoint`, {
        headers: authHeaders()
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### 3.2 Sub-Component Template

```javascript
"use client";

export default function SubComponent({ prop1, prop2, onAction }) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### 3.3 Utility Module Template

```javascript
export function formatValue(input) {
  if (!input) return "—";
  // Formatting logic
  return formatted;
}
```

---

## 4. Props Pattern

- Use **named props** (never positional)
- Provide **default values** where appropriate
- Destructure props in function signature:
```javascript
export default function Component({ title, items = [], onSelect, isActive = false }) {
```

---

## 5. State Pattern

| State Type | Hook | Example |
|-----------|------|---------|
| Primitive value | `useState` | `const [isOpen, setIsOpen] = useState(false)` |
| Array/List | `useState` | `const [trades, setTrades] = useState([])` |
| Object | `useState` | `const [selectedTrade, setSelectedTrade] = useState(null)` |
| Socket instance | `useRef` | `const socketRef = useRef(null)` |
| Previous values | `useRef` | `const prevDataRef = useRef(data)` |
| Memoized callbacks | `useCallback` | `const loadInbox = useCallback(async () => {...}, [desk])` |

---

## 6. Effect Pattern

```javascript
// Auth gate pattern
useEffect(() => {
  if (!getToken()) {
    router.push("/");
    return;
  }
  loadData();
}, []);

// Socket connection pattern
useEffect(() => {
  const socket = io(backendUrl, { auth: { token: getToken() } });
  socket.emit("join_desk", desk);
  socket.on("event_name", handler);
  socketRef.current = socket;

  return () => socket.disconnect();
}, [desk]);

// Polling fallback pattern
useEffect(() => {
  const interval = setInterval(loadData, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## 7. Styling Guidelines for Components

1. **Prefer Tailwind CSS** for new components
2. **Extract shared styles** to CSS modules if reused across components
3. **Avoid inline `<style>` tags** in JSX (existing in dashboard/workstation — do not replicate)
4. **Avoid inline `style={}` attributes** for complex styling
5. **Use `className`** consistently

---

## 8. Component Tree Diagram

```
layout.js (Root)
├── Toaster (react-hot-toast)
├── page.js (Login)
├── dashboard/page.js
├── workstation/page.js
│   ├── InstructionPanel
│   ├── TutorialPanel
│   └── Popups (Action, Email, Audit, Truth, SSI Viewer)
├── communication/page.js
│   ├── FolderNav
│   ├── InboxList
│   ├── MessageThread
│   ├── ComposeModal
│   └── ReplyModal
├── mo-risk/page.js
└── ssi-database/page.js
```
