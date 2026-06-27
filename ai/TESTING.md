# Testing

## Current Test State

| Area | Framework | Location | Status |
|------|-----------|----------|--------|
| Backend auth | Jest + Supertest | `tests/backend/auth.test.js` | ✅ 1 file |
| Backend other routes | Jest + Supertest | `tests/backend/` | ❌ None |
| Frontend components | Jest + React Testing Library | `frontend/__tests__/` | ❌ None |
| E2E | — | — | ❌ Not set up |

---

## Running Tests

### Backend Tests
```bash
# From root
npm run test:backend

# Runs: jest tests/backend
```

**Config**: No `jest.config.js` at root — uses Jest defaults with `"test:backend"` script pointing to `tests/backend`.

**Note**: `server.js` exports `app` and guards `startServer()` with `if (process.env.NODE_ENV !== "test")` — so the server doesn't start when testing.

### Frontend Tests
```bash
cd frontend
npm test

# Runs: jest (with jest.config.js in frontend/)
```

**Config**: `frontend/jest.config.js` with `jest-environment-jsdom` and `@testing-library/jest-dom`.

---

## Backend Test Architecture

### `tests/backend/auth.test.js`
- Uses `supertest` to make HTTP requests against Express `app`
- Tests register and login endpoints
- Does NOT start a real server (imports `app` directly)
- Requires `MONGO_URI` in environment — connects to real DB (consider test DB isolation)

### Test Patterns to Follow

```javascript
const request = require('supertest');
const app = require('../../server');

describe('Route Group', () => {
  beforeAll(async () => {
    // Setup: login and get token
  });

  afterAll(async () => {
    // Cleanup: delete test data
  });

  it('should do X', async () => {
    const res = await request(app)
      .post('/api/route')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'value' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## Test Coverage Priorities

### Must Test (Critical Business Logic)

| Area | Tests Needed |
|------|-------------|
| Queue generation | `POST /api/queue/generate` — valid desk, invalid desk, duplicate queue |
| Trade actions | All 15 action types, invalid state transitions, missing comment |
| Auth | Register, login, invalid credentials, expired token |
| Conversation | Send email, resolve break, shared inbox |
| FO channel | Open, send message, FO reply scheduling |

### Engine Unit Tests

| Engine | What to Test |
|--------|-------------|
| `truthEngine` | `getMismatchFields()`, `getConfirmationMismatches()` |
| `amendmentEngine` | `extractAmendments()`, `attachAmendments()`, `applyAllAccepted()` |
| `queueComposer` | `calculateDbAllocation()`, `isBreakTrade()`, queue size = 20 |
| `lifecycle` | Valid transitions, invalid transition rejection |
| `tradeGenerator` | Generated trade has valid structure, truths are consistent |

---

## Test Database Strategy

**Current**: Tests use the live Atlas DB — risk of polluting real data.

**Recommended**: 
1. Create a separate `ailabs_test` DB on Atlas
2. Set `MONGO_URI_TEST` in CI environment
3. Override `MONGO_URI` with test URI in Jest setup
4. `afterAll`: clean up test-created documents

```javascript
// jest.setup.js (backend)
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterAll(async () => {
  // Clean up test data
  await Trade.deleteMany({ tradeRef: /^TEST_/ });
  await mongoose.disconnect();
});
```

---

## Frontend Testing Setup

**Config** (`frontend/jest.config.js`):
- Environment: `jsdom`
- Transform: `next/jest` transform via `jest.config.js`
- Setup: `jest.setup.js` (imports `@testing-library/jest-dom`)

### Component Test Pattern

```javascript
// frontend/__tests__/workstation.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import WorkstationPage from '../src/app/workstation/page';

// Mock Next.js router and cookies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: (key) => ({ userId: 'test@test.com', desk: 'MO' })[key] })
}));

jest.mock('js-cookie', () => ({
  get: () => 'mock-token',
  set: jest.fn(),
  remove: jest.fn()
}));

test('renders workstation page', () => {
  render(<WorkstationPage />);
  expect(screen.getByText('Generate Queue')).toBeInTheDocument();
});
```

---

## E2E Testing (Future)

Recommended tool: **Playwright**

Key E2E flows to test:
1. Register → Login → Select desk → Generate queue → Select trade → Take action → Logout
2. Send email to CPTY → Wait for response → Confirm trade
3. Raise MO break → Email FO → FO responds → Resolve conversation → Validate pass
4. Session expiry at 3 hours

```bash
# Install Playwright (future)
npm init playwright@latest
npx playwright test
```
