# Testing

> Test infrastructure, strategy, and guidelines for the SGB Operations Simulator.

---

## 1. Test Infrastructure

### 1.1 Backend Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Jest** | 30.x | Test runner and assertion framework |
| **Supertest** | 7.x | HTTP integration testing for Express |

**Configuration:**
- `jest.config.js` — Jest configuration
- `tests/backend/` — Backend test directory

**Run:**
```bash
npm run test:backend
# or
npx jest tests/backend
```

### 1.2 Frontend Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Jest** | 30.x | Test runner |
| **React Testing Library** | 16.x | Component testing |
| **@testing-library/jest-dom** | 6.x | DOM matchers |

**Configuration:**
- `frontend/jest.config.js` — Jest configuration
- `frontend/jest.setup.js` — Setup file
- `frontend/__tests__/` — Frontend test directory

**Run:**
```bash
cd frontend
npx jest
```

---

## 2. Existing Tests

### 2.1 Backend Integration Tests

| Test File | What It Tests |
|-----------|---------------|
| Trade action integration tests | Core `POST /api/trade/action` endpoint with state machine validation |

**Coverage:**
- ✅ MO desk actions (validate pass, raise break)
- ✅ Authentication middleware
- ✅ Invalid transition rejection
- ✅ Missing trade error handling

### 2.2 Frontend Component Tests

| Test File | What It Tests |
|-----------|---------------|
| Workstation component tests | Workstation page rendering and basic interaction |

---

## 3. Test Strategy

### 3.1 Testing Pyramid

```
        ┌──────────┐
        │   E2E    │  ← Future: Playwright/Cypress
        │  (Few)   │
       ┌┴──────────┴┐
       │Integration │  ← Current: Supertest (backend), RTL (frontend)
       │  (Some)    │
      ┌┴────────────┴┐
      │   Unit Tests  │  ← Future: Individual functions and engines
      │   (Many)     │
      └──────────────┘
```

### 3.2 Test Categories

| Category | Scope | Tool | Status |
|----------|-------|------|--------|
| **Unit** | Individual functions, engines, utilities | Jest | 🔲 Not started |
| **Integration** | API endpoints, route handlers | Supertest | 🟨 Partial |
| **Component** | React component rendering and interaction | RTL | 🟨 Partial |
| **E2E** | Full user flows | — | 🔲 Not started |

---

## 4. Test Guidelines

### 4.1 Writing Backend Tests

```javascript
const request = require("supertest");
const app = require("../../server");
const mongoose = require("mongoose");

describe("POST /api/trade/action", () => {
  beforeAll(async () => {
    // Connect to test database
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("should validate MO trade successfully", async () => {
    const res = await request(app)
      .post("/api/trade/action")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        tradeRef: "TRD-20260704-0001",
        action: "MO_VALIDATE_PASS",
        desk: "MO",
        userId: "test@example.com"
      });

    expect(res.status).toBe(200);
    expect(res.body.trade.currentStatus).toBe("CONFIRMATION_PENDING");
  });
});
```

### 4.2 Writing Frontend Tests

```javascript
import { render, screen, fireEvent } from "@testing-library/react";
import Workstation from "../app/workstation/page";

// Mock sessionStorage and fetch
beforeAll(() => {
  Storage.prototype.getItem = jest.fn();
  global.fetch = jest.fn();
});

describe("Workstation", () => {
  test("renders trade table", () => {
    render(<Workstation />);
    // Assertions
  });
});
```

---

## 5. Test Environment

| Requirement | Setup |
|-------------|-------|
| **Test database** | Separate MongoDB instance or database (`ilabs_test`) |
| **Test environment variable** | `NODE_ENV=test` — prevents server auto-start |
| **Test secrets** | Use `.env.test` with test values |
| **Cleanup** | Clear test collections between test suites |

> **Note**: The server.js includes `if (process.env.NODE_ENV !== "test") { startServer(); }` to prevent auto-start during tests.

---

## 6. Testing TODOs

| Priority | Test Area | Status |
|----------|-----------|--------|
| 🔴 P0 | All route endpoints (13 route modules) | 🔲 Not covered |
| 🔴 P0 | State machine transitions | 🟨 Partial |
| 🔴 P0 | Authentication flow (login, register, token validation) | 🟨 Partial |
| 🟡 P1 | Communication engine (send, AI reply processing) | 🔲 Not covered |
| 🟡 P1 | System workflow engine (amendment, verification) | 🔲 Not covered |
| 🟡 P1 | Trade generator | 🔲 Not covered |
| 🟡 P1 | Socket.io events | 🔲 Not covered |
| 🟢 P2 | Frontend: Communication page | 🔲 Not covered |
| 🟢 P2 | Frontend: Login/Register | 🔲 Not covered |
| 🟢 P2 | Frontend: SSI Database | 🔲 Not covered |
| 🟢 P2 | E2E: Full trade lifecycle flow | 🔲 Not covered |
| 🟢 P2 | E2E: Communication flow | 🔲 Not covered |
