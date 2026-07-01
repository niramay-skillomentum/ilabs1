content: # Architectural Decisions

> Last updated: 2026-06-27

---

### D-001 | MongoDB over SQL for trade data

**Date**: Pre-2026-06-26 (confirmed by `DATABASE_URL` PostgreSQL legacy in `.env`)

**Decision**: Use MongoDB Atlas (Mongoose ODM) as the primary database.

**Rationale**:
- Trade documents are deeply nested (`truths`, `booking`, `confirmationScenario`, `foEscalation`, `amendmentHistory`, `pendingAmendments`, `conversation` sub-documents) — relational tables would require many JOINs for a single trade read
- Schema evolves frequently during active development; Mongoose's flexible schema reduces migration overhead
- Atlas provides managed cloud hosting with zero infrastructure overhead
- The simulation's access patterns are document-oriented (read/write one full trade at a time), not relational

**Tradeoffs**: No referential integrity between documents; no multi-document transactions for complex operations; manual `markModified()` required for nested mutations.

---

### D-002 | JWT in sessionStorage (primary) + HttpOnly cookie (fallback)

**Date**: Revised 2026-06-26

**Decision**: Store JWT in `sessionStorage` (frontend) and `auth_token` HttpOnly cookie (set by backend).

**Rationale**:
- `sessionStorage` provides fast, synchronous token access in JS without cookie parsing
- `HttpOnly` cookie ensures the token survives page refreshes even if sessionStorage is cleared (e.g., new tab)
- `SameSite=Lax` on cookie protects against CSRF for cross-site navigated requests
- HttpOnly means the cookie cannot be read by JS — frontend uses sessionStorage for all programmatic access

**Previous state (KI-004)**: Cookie was not HttpOnly — both sessionStorage and `js-cookie` read it directly.

---

### D-003 | Frontend proxies `/api/*` to backend via Next.js rewrites

**Date**: Pre-2026-06-26

**Decision**: Use `next.config.mjs` `rewrites()` to forward all `/api/*` and `/socket.io/*` to `http://localhost:3002`.

**Rationale**:
- Eliminates CORS issues between Next.js (port 3000) and Express (port 3002)
- Frontend code uses relative `/api/*` paths — no environment-specific URL switching
- Identical behavior in dev and Docker without code changes
- Next.js `rewrites` are transparent to the browser — requests appear same-origin

**Tradeoffs**: Extra hop through Next.js dev server adds minor latency in development. In production, a proper reverse proxy (nginx) or backend-accessible domain is preferred.

---

### D-004 | 20 trades per session (12 clean + 8 break)

**Date**: Pre-2026-06-26

**Decision**: Queue is always exactly 20 trades with a fixed 60%/40% clean/break ratio.

**Rationale**:
- Controlled training environment requires predictable challenge level for fair assessment
- 40% breaks provides sufficient volume to practice break workflows without overwhelming
- Fixed ratio ensures every trainee gets the same distribution — consistent scoring baseline
- 20 trades fits within a 3-hour session without rushing

**Tradeoffs**: Experienced users learn to expect the break count. Could be made configurable per difficulty level in a future phase.

---

### D-005 | No counterparty mismatch at confirmation level

**Date**: Pre-2026-06-26

**Decision**: `CONFIRMATION_BREAK_TYPES = ["AMOUNT", "VALUE_DATE", "CURRENCY"]` — counterparty mismatch is excluded.

**Rationale**: Explicit user feedback that counterparty mismatches at confirmation level are not realistic for the scenario being simulated (both sides of the trade know who they're dealing with by the time it reaches Confirmation).

**Implementation**: `tradeGenerator.js` uses `CONFIRMATION_BREAK_TYPES` array, excluding `"COUNTERPARTY"`. The `truths.confirmation` sub-document also has no `counterparty` field.

---

### D-006 | In-memory pending reply queues + setInterval processing

**Date**: Pre-2026-06-26

**Decision**: CPTY/FO simulated replies are pushed to in-memory arrays and processed every 3 seconds.

**Rationale**:
- Simple implementation — no additional infrastructure required
- 4–12 second randomized delay makes responses feel realistic without complex scheduling
- In a single-process dev environment, memory is sufficient

**Known tradeoff**: All pending replies are lost on server restart (see `KNOWN_ISSUES.md` KI-007). This is acceptable for development but not for production.

**Future**: Migrate to Agenda-based persistent job scheduling. `startAgenda()` is already called in `server.js` — the infrastructure exists; delayed reply jobs need to be defined there.

---

### D-007 | Graduated DB allocation with exponential decay

**Date**: Pre-2026-06-26

**Decision**: Use `dbCount = floor(20 * (1 - e^(-0.003 * availablePool)))` to decide how many trades to pull from DB vs generate fresh.

**Rationale**:
- Large pool (1000+ trades): nearly all 20 from DB → rich historical trades for richer simulation
- Depleting pool: graceful fallback to generated trades — no cliff-edge behavior
- Exponential decay is a natural curve for resource depletion
- `k = 0.003` gives:
  - Pool 1000 → ~19 DB, ~1 generated
  - Pool 500  → ~15 DB,  ~5 generated  
  - Pool 100  →  ~5 DB, ~15 generated
  - Pool <50  →  0 DB,  20 generated

**Implementation**: `calculateDbAllocation()` in `src/engine/queueComposer.js`

---

### D-008 | LLM provider chain: Gemini → Cerebras → offline

**Date**: Pre-2026-06-26

**Decision**: Use Google Gemini as primary LLM, Cerebras as secondary, static offline responses as final fallback.

**Rationale**:
- Gemini provides highest quality contextual financial email responses
- Cerebras is faster and cheaper — good secondary for cost/latency
- Groq was evaluated but commented out (not in active chain)
- Static offline responses guarantee simulation never breaks due to LLM API failure
- All three are cold-start — no warm connection needed; each call is independent

**Implementation**: `src/engine/llmService.js` handles the provider chain. `cptyAI.js` and `foAI.js` call `llmService.generateText()`.

---

### D-009 | Webpack over Turbopack for frontend dev server

**Date**: 2026-06-26

**Decision**: `package.json` dev script uses `next dev --webpack` instead of the default Turbopack.

**Rationale**: Turbopack has documented compatibility issues on Windows. Webpack is the stable, well-tested bundler with consistent behavior across OS.

**Impact**: Slower hot-reload than Turbopack but reliable cross-platform behavior.

---

### D-010 | User email as userId throughout the system

**Date**: Pre-2026-06-26

**Decision**: JWT payload uses `{ userId: user.email, fullName }`. Email is the primary user identifier in `Queue.userId`, `Trade.assignedTo`, `AuditLog.userId`, `UserScore.userId`.

**Rationale**: Email is already unique in the `users` collection; no need for a separate UUID generation step; simplifies debugging (IDs are human-readable in DB).

**Known tradeoff**: Email previously appeared in URL query params (`?userId=user@email.com`) — privacy issue resolved by `auth.js` module (KI-002). Email changing would require data migration across all collections.

---

### D-011 | Session touches on queue fetch, not every action

**Date**: Pre-2026-06-26

**Decision**: `queueComposer.touchSession()` is called on `GET /api/queue/my` and after trade actions.

**Rationale**: Keeps session alive during normal use. Queue is fetched frequently (15s polling + socket triggers) so `lastActivity` stays current without touching on every single API call.

---

### D-012 | Socket.io dual-room architecture

**Date**: Pre-2026-06-26

**Decision**: Each connected socket joins two rooms — `user_<userId>` (personal) and `desk_<deskName>` (shared).

**Rationale**:
- `user_<userId>` for targeted per-user notifications (trade updates specific to that user's queue)
- `desk_<deskName>` for desk-wide broadcasts (available but not heavily used yet)
- Avoids global `io.emit()` that would flood all connected clients with irrelevant updates

---

### D-013 | ~30% hidden confirmation break on MO-clean trades

**Date**: Pre-2026-06-26

**Decision**: When generating MO-clean trades for the MO desk, 30% have a `confirmationScenario.disputeType` set — creating a hidden confirmation-level discrepancy invisible to MO.

**Rationale**: Mirrors real-world ops — a trade can pass MO validation cleanly but still have a CPTY discrepancy discovered later. This trains trainees to understand that MO pass ≠ all-clear.

**Implementation**: `CONFIRMATION_BREAK_RATIO = 0.3` in `tradeGenerator.js`. Applied only to MO-desk trades.
 file_path: /workspace/ilabs1/ai/DECISIONS.md