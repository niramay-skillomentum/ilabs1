# Coding Standards

> Conventions, patterns, and standards followed in the SGB Operations Simulator codebase.

---

## 1. General Principles

- **Production-grade code** — All code must be production-ready
- **Modular architecture** — Each concern in its own module
- **Composition over inheritance** — Reuse through function composition
- **Single Responsibility** — Each module/function does one thing well
- **No magic numbers** — Use named constants
- **Explicit over implicit** — Code should be self-documenting

---

## 2. Backend Standards (Node.js / Express)

### 2.1 Module Structure

```javascript
// Each engine module exports functions
const something = require("./dependency");

function doSomething(params) {
  // Implementation
}

module.exports = { doSomething };
```

### 2.2 Route Pattern

```javascript
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth").authenticateToken;

router.get("/endpoint", authenticateToken, async (req, res) => {
  try {
    // Business logic
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 2.3 Error Handling Pattern

```javascript
// Always wrap route handlers in try/catch
try {
  // Business logic
} catch (error) {
  console.error("Error description:", error);
  res.status(500).json({ error: "Descriptive error message" });
}
```

### 2.4 Async/Await

- Always use `async/await` — never raw promises or callbacks
- Always `try/catch` async operations

### 2.5 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `tradeRef`, `currentStatus` |
| Constants | UPPER_SNAKE_CASE | `TRANSITIONS`, `JWT_SECRET` |
| Functions | camelCase | `generateTrades()`, `processReplies()` |
| Files (engine) | camelCase | `tradeGenerator.js`, `socketEngine.js` |
| Files (model) | PascalCase | `Trade.js`, `User.js` |
| Files (route) | PascalCase + suffix | `tradeRoutes.js`, `authRoutes.js` |
| Files (middleware) | camelCase | `auth.js` |
| Mongoose models | PascalCase | `Trade`, `User`, `Queue` |
| DB collections | lowercase plural | `trades`, `users`, `queues` |

### 2.6 File Organization

```
src/
├── db.js                    # Database connection
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── Trade.js             # One file per model
│   └── ...
├── routes/
│   ├── tradeRoutes.js       # One file per route group
│   └── ...
└── engine/
    ├── transitions.js       # One file per concern
    ├── tradeGenerator.js
    └── ...
```

### 2.7 Response Format

```javascript
// Success
res.status(200).json({ message: "...", data: ... });
res.status(201).json({ message: "Created", ... });

// Error
res.status(400).json({ error: "Validation failed" });
res.status(401).json({ error: "Authentication required" });
res.status(403).json({ error: "Invalid or expired token" });
res.status(404).json({ error: "Not found" });
res.status(500).json({ error: "Internal server error" });
```

### 2.8 Environment Variables

- All secrets in `.env` (never committed)
- `.env.example` documents all required variables
- Access via `process.env.VARIABLE_NAME`
- Startup validation for critical variables (e.g., `JWT_SECRET`)

---

## 3. Frontend Standards (Next.js / React)

### 3.1 Component Pattern

```javascript
"use client";  // Required for client components

export default function PageName() {
  // State
  const [data, setData] = useState(null);

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Handlers
  const handleAction = () => { /* ... */ };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### 3.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `InstructionPanel`, `FolderNav` |
| Page files | `page.js` | `page.js` in each route folder |
| Component files | PascalCase | `FolderNav.js`, `ComposeModal.js` |
| Utility files | camelCase | `auth.js`, `utils.js` |
| State variables | camelCase | `selectedTrade`, `inboxData` |
| Event handlers | `handle` prefix | `handleAction`, `handleSubmit` |
| Data loaders | `load` prefix | `loadQueue`, `loadInbox` |
| Boolean state | `is` prefix | `isLoading`, `isOpen` |

### 3.3 Styling Approach

| Method | Used In | Notes |
|--------|---------|-------|
| Tailwind CSS | Login, InstructionPanel, TutorialPanel | Preferred for new components |
| Page-level CSS | Communication (`page.css`) | Complete design system |
| Inline `<style>` | Dashboard, Workstation | Avoid for new code |
| Inline `style={}` | MO Risk, SSI Database | Avoid for new code |

### 3.4 API Calls

```javascript
// Always use authHeaders() for authenticated endpoints
import { authHeaders } from "@/lib/auth";

const res = await fetch(`${backendUrl}/api/trade/action`, {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify(payload)
});
const data = await res.json();
```

### 3.5 Toast Notifications

```javascript
import toast from "react-hot-toast";

toast.success("Action completed");
toast.error("Something went wrong");
toast.loading("Processing...");
```

**Never use `alert()`, `prompt()`, or `confirm()`.**

---

## 4. Database Standards (Mongoose)

### 4.1 Schema Pattern

```javascript
const mongoose = require("mongoose");

const SchemaName = new mongoose.Schema({
  field: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  data: [{ type: String }],
  nested: {
    subField: String
  }
}, { timestamps: true });  // Always use timestamps

module.exports = mongoose.model("CollectionName", SchemaName);
```

### 4.2 Index Usage

- Add indexes for frequently queried fields
- Use `unique` for natural keys (`tradeRef`, `email`)
- Use `index: true` for common query filters (`assignedTo`, `isActive`)

---

## 5. Comment Standards

### 5.1 Section Headers
```javascript
// ======================================
// SECTION NAME
// ======================================
```

### 5.2 Inline Comments
```javascript
// Brief explanation of non-obvious logic
communicationEngine.processReplies(/* callback */);
```

### 5.3 JSDoc (for public functions)
```javascript
/**
 * Generate a batch of trades with realistic financial data.
 * @param {number} count - Number of trades to generate
 * @param {string} desk - Target desk for trade generation
 * @returns {Promise<Trade[]>} Array of generated trades
 */
async function generateTrades(count, desk) { /* ... */ }
```

---

## 6. Git Conventions

| Convention | Format |
|-----------|--------|
| Feature branch | `feature/description` |
| Fix branch | `fix/description` |
| Commit messages | Imperative mood: "feat: add settlement desk" |
| Conventional commits | `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` |
