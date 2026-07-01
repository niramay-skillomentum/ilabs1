content: # Testing

> Last updated: 2026-06-27

---

## Current Test State

| Area | Framework | Location | Status | Count |
|------|-----------|----------|--------|-------|
| Backend auth | Jest + Supertest | `tests/backend/auth.test.js` | ✅ Exists | 1 file |
| Backend routes (queue, trade, conversation, FO) | Jest + Supertest | `tests/backend/` | ❌ Missing | 0 files |
| Engine unit tests | Jest | — | ❌ Missing | 0 files |
| Frontend components | Jest + React Testing Library | `frontend/__tests__/` | ❌ Missing | 0 files |
| E2E | — | — | ❌ Not configured | — |

---

## Running Tests

### Backend

```bash
# From project root
npm run test:backend
# Runs: jest tests/backend
```

- Jest runs without a `jest.config.js` at root — uses package.json defaults
- `server.js` guards startup with `if (process.env.NODE_ENV !== "test")` — the HTTP server does NOT start during tests; only the Express `app` is exported
- Tests import `app` directly: `const app = require("../../server")`

### Frontend

```bash
cd frontend
npm test
# Runs: jest (reads frontend/jest.config.js)
```

**Frontend Jest config** (`frontend/jest.config.js`):
- Environment: `jest-environment-jsdom`
- Transform: Next.js Jest transform via `next/jest`
- Setup file: `jest.setup.js` (imports `@testing-library/jest-dom`)

---

## Backend Test Architecture

### Existing: `tests/backend/auth.test.js`

Uses Supertest to make real HTTP requests against the Express `app`. Tests:
- `POST /api/auth/register` — valid registration
- `POST /api/auth/login` — valid credentials, invalid credentials

**Important**: This test connects to the real MongoDB Atlas database. Test-created users persist unless cleaned up in `afterAll`. A separate `MONGO_URI_TEST` environment variable should be used in CI.

### Pattern for New Backend Tests

```js
const request = require("supertest");
const app = require("../../server");
const Trade = require("../../src/models/Trade");
const Queue = require("../../src/models/Queue");

describe("Queue Routes", () => {
  let authToken;
  const testEmail = "test_" + Date.now() + "@test.com";

  beforeAll(async () => {
    // Register and login to get a valid JWT
    await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Test User", email: testEmail, password: "Password123" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "Password123" });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await Queue.deleteMany({ userId: testEmail });
    await Trade.updateMany({ assignedTo: testEmail }, { $set: { assignedTo: null } });
    // Delete test user (if User model is accessible)
  });

  it("generates a queue of 20 trades for MO desk", async () => {
    const res = await request(app)
      .post("/api/queue/generate")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ desk: "MO" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trades).toHaveLength(20);
    expect(res.body.desk).toBe("MO");
  });

  it("returns 400 when trying to generate a second queue", async () => {
    const res = await request(app)
      .post("/api/queue/generate")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ desk: "MO" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/complete your current queue/i);
  });
});
```

---

## Test Coverage Priorities

### Critical Route Integration Tests

| Route Group | Tests Needed |
|-------------|-------------|
| Auth | ✅ Exists — register, login, invalid credentials |
| Queue | Generate valid desk, invalid desk, duplicate queue, fetch active queue |
| Trade action | `MO_VALIDATE_PASS` (valid), missing comment → 400, wrong status → 400 |
| Trade action | `MO_RAISE_BREAK`, `CONFIRM_RAISE_BREAK` gate (contact count check) |
| Conversation | Send email (MO → FO routing, CONF → CPTY routing), fetch thread |
| Session | Info endpoint (with and without active session), logout |
| Audit | Fetch audit trail for valid trade, non-existent trade |

### Engine Unit Tests

| Engine | Function | What to Test |
|--------|----------|-------------|
| `truthEngine.js` | `getMismatchFields(trade)` | Clean trade → `[]`, amount mismatch → `["amount"]`, etc. |
| `truthEngine.js` | `getConfirmationMismatches(trade)` | Confirmation break types; no counterparty mismatch |
| `amendmentEngine.js` | `extractAmendments(text)` | Parses LLM amendment text to structured objects |
| `amendmentEngine.js` | `applyAllAccepted(trade)` | Accepted amendments update trade fields correctly |
| `queueComposer.js` | `calculateDbAllocation(pool)` | pool=0→0, pool=50→≥0, pool=1000→≤20 |
| `queueComposer.js` | `isBreakTrade(trade, desk)` | True when mismatch exists, false when clean |
| `lifecycle.js` | `canTransition(from, to)` | Valid transitions return true; invalid throw `InvalidTransitionError` |
| `tradeGenerator.js` | `generateSingleTrade(desk, isBreak)` | Returns trade with all required fields and consistent truths |
| `clock.js` | Sim time calculation | Correct mapping of elapsed session time to 9 AM–6 PM |

### Example Engine Unit Test

```js
const truthEngine = require("../../src/engine/truthEngine");

describe("truthEngine.getMismatchFields", () => {
  const baseTrade = {
    truths: {
      universal: { amount: 1000000, currency: "USD", counterparty: "CITI", valueDate: new Date("2026-06-29") }
    },
    booking: { amount: 1000000, currency: "USD", counterparty: "CITI", valueDate: new Date("2026-06-29") }
  };

  it("returns empty array for clean trade", () => {
    expect(truthEngine.getMismatchFields(baseTrade)).toEqual([]);
  });

  it("detects amount mismatch", () => {
    const trade = { ...baseTrade, booking: { ...baseTrade.booking, amount: 900000 } };
    expect(truthEngine.getMismatchFields(trade)).toContain("amount");
  });

  it("detects currency mismatch", () => {
    const trade = { ...baseTrade, booking: { ...baseTrade.booking, currency: "EUR" } };
    expect(truthEngine.getMismatchFields(trade)).toContain("currency");
  });
});
```

---

## Frontend Component Testing

### Setup (already configured)

- `frontend/jest.config.js` — jsdom environment, Next.js transform
- `frontend/jest.setup.js` — imports `@testing-library/jest-dom`
- Dependencies installed: `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`

### Required Mocks for All Pages

```js
// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: (key) => ({ desk: "MO" })[key] || null })
}));

// Mock socket.io-client
jest.mock("socket.io-client", () => () => ({
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn()
}));

// Mock auth module
jest.mock("../../lib/auth", () => ({
  loadUserId: () => "test@test.com",
  getToken: () => "mock-token",
  authHeaders: () => ({ "Content-Type": "application/json", "Authorization": "Bearer mock-token" }),
  clearSession: jest.fn(),
  saveSession: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({ success: true, trades: [], desk: "MO" }) })
);
```

### Example Component Test

```js
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "../src/app/dashboard/page";

test("renders desk selection buttons", async () => {
  render(<DashboardPage />);
  await waitFor(() => {
    expect(screen.getByText(/Middle Office/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Settlement/i)).toBeInTheDocument();
  });
});
```

---

## Test Database Strategy

**Current problem**: Tests run against the live Atlas database — risk of polluting real data.

**Recommended fix**:

1. Create a separate `ailabs_test` database on Atlas (or use an in-memory MongoDB via `mongodb-memory-server`)
2. Set `MONGO_URI_TEST` in CI secrets
3. Override in Jest setup:

```js
// tests/backend/setup.js
const mongoose = require("mongoose");

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Wipe test-generated data
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});
```

---

## E2E Testing (Future — Phase 7)

**Recommended tool**: Playwright

**Key flows to cover**:

1. **Full happy path (MO)**: Register → Login → Select MO desk → Generate queue → Select trade → `MO_VALIDATE_PASS` → Logout
2. **MO break workflow**: Generate queue → Select break trade → `MO_RAISE_BREAK` → Send email to FO → FO replies → Resolve conversation → `MO_VALIDATE_PASS`
3. **Confirmation workflow**: Trade at `CONFIRMATION_PENDING` → `CONFIRM_SEND_TO_CPTY` → CPTY disputes → `CONFIRM_RAISE_BREAK` → `CONFIRM_ESCALATE_TO_FO` → FO supports → `CONFIRM_REJECT_CLAIM` → `CONFIRM_TRADE`
4. **Session expiry**: Verify auto-logout toast appears when timer reaches zero

```bash
# Install Playwright (when implementing)
npm init playwright@latest
npx playwright test
```

---

## CI Configuration (Future)

Recommended GitHub Actions workflow:

```yaml
name: Test
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm ci
      - run: npm run test:backend
        env:
          MONGO_URI_TEST: ${{ secrets.MONGO_URI_TEST }}
          JWT_SECRET: test_secret_for_ci

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --ci --coverage
```
 file_path: /workspace/ilabs1/ai/TESTING.md