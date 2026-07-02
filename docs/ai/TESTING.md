# Testing

> **Purpose:** Describe the current automated tests, how to run them, and where the coverage gaps are.
> **Audience:** Engineers.
> **Last verified:** 2026-07-01 against `tests/backend/*`, `frontend/__tests__/*`, `frontend/jest.config.js`, `.github/workflows/ci.yml`.
> **Related:** [Deployment](DEPLOYMENT.md) · [Architecture](ARCHITECTURE.md)

---

## Current state

| Area | Framework | Location | Status |
|------|-----------|----------|--------|
| Backend auth | Jest + Supertest | `tests/backend/auth.test.js` | ✅ Present |
| Backend trade actions | Jest + Supertest | `tests/backend/tradeActions.test.js` | ✅ Present |
| Backend other routes/engines | — | — | ❌ Not covered |
| Frontend login page | Jest + RTL | `frontend/__tests__/page.test.js` | ✅ Present |
| Frontend workstation | Jest + RTL | `frontend/__tests__/Workstation.test.js` | ✅ Present |
| E2E | — | — | ❌ None |

## Running tests

**Backend** (repo root):
```bash
npm run test:backend      # jest tests/backend
```
`server.js` only starts the HTTP listener when `NODE_ENV !== "test"`, so tests import the Express `app` directly. The auth and trade-action suites **mock the Mongoose models** (`User`, `bcrypt`, `Trade`) rather than hitting a live database.

**Frontend** (`frontend/`):
```bash
npm test                  # jest (jsdom)
```
`frontend/jest.config.js` uses `next/jest`, `jest-environment-jsdom`, and `jest.setup.js` (which imports `@testing-library/jest-dom`). Tests mock `next/navigation`, the `auth` lib, `socket.io-client`, and `fetch`.

## What the existing tests cover
- **auth.test.js** — register (success + duplicate email), login (correct + incorrect password), JWT issuance.
- **tradeActions.test.js** — trade-action state-transition guards (e.g. `CONFIRM_TRADE` rejected from `CONFIRMATION_BREAK`, allowed from `LIASING_WITH_CPTY`).
- **page.test.js** — login page renders heading + email/password inputs.
- **Workstation.test.js** — workstation renders the MO header and the "Generate Test Queue" control.

## CI
`.github/workflows/ci.yml` runs `test-backend` and `test-frontend` on every push/PR to `main`, then a `build-docker` job. See [Deployment](DEPLOYMENT.md).

## Coverage gaps
No automated coverage yet for: queue generation, the lifecycle/transition engine, break engines (settlement/confirmation/recon), settlement SSI validation, the async reply loops, socket events, the auth middleware, or the AI/offline engines. There are no integration tests spanning register → queue → action → reply, and no browser E2E.

## Recommended patterns

**Backend integration (with a test DB):** register+login to obtain a JWT, then exercise routes with Supertest. Use a dedicated `MONGO_URI_TEST` (or `mongodb-memory-server`) and wipe between runs rather than pointing at a shared database.

```js
const request = require("supertest");
const app = require("../../server");
// register → login → capture token → call protected routes → assert status/body
```

**Engine unit tests (pure, no DB):**
```js
const truthEngine = require("../../src/engine/truthEngine");
// clean trade → getMismatchFields() === []
// amount-broken trade → includes "amount"
```

**Frontend component tests:** mock `next/navigation`, `../../lib/auth`, `socket.io-client`, and `global.fetch`, then render the page and assert on rendered structure.

**Suggested priorities:** queue-generation invariants (exactly 20 trades; duplicate-queue rejection), the action→status matrix guards, `truthEngine` mismatch detection, `queueComposer` allocation maths, and a happy-path E2E (Playwright) for the MO break workflow.
