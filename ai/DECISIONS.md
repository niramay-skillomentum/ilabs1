# Decisions

## Architectural Decisions

---

### D-001 | MongoDB over SQL for trade data
**Date**: Pre-2026-06-26  
**Decision**: Use MongoDB (Atlas) as primary database instead of PostgreSQL  
**Rationale**: 
- Trade schema is complex and nested (truths, amendments, conversations all embedded)
- Schema evolves frequently during development
- MongoDB's flexible document model fits simulation trade data well
- Atlas provides easy cloud hosting without infrastructure overhead
**Tradeoffs**: Weak relational integrity; no joins; `DATABASE_URL` (PostgreSQL URL) exists in `.env` as a legacy artifact suggesting SQL was originally considered  
**Impact**: All models use Mongoose; data is documents not rows

---

### D-002 | JWT auth with dual storage (cookie + sessionStorage)
**Date**: Pre-2026-06-26  
**Decision**: Store JWT in both `js-cookie` and `sessionStorage`  
**Rationale**:
- Cookie allows auth middleware to work on page refresh
- sessionStorage allows JS code to access token without re-parsing cookies
- SameSite=Lax protects against CSRF for cookie-based requests
**Tradeoffs**: Not HttpOnly = XSS accessible; not ideal for high-security environments  
**Future**: Consider HttpOnly-only cookies with a server-side session refresh endpoint

---

### D-003 | Frontend proxies all `/api/*` to backend
**Date**: Pre-2026-06-26  
**Decision**: Use Next.js `rewrites()` to proxy API calls  
**Rationale**: 
- Avoids CORS issues between Next.js (3000) and Express (3002)
- Frontend code uses relative `/api/*` paths — no hardcoded backend URLs
- Works identically in dev and Docker
**Tradeoffs**: Extra hop through Next.js dev server; in production, a proper reverse proxy (nginx) or direct backend domain is better

---

### D-004 | 20 trades per session (12 clean + 8 breaks)
**Date**: Pre-2026-06-26  
**Decision**: Queue always has exactly 20 trades in a fixed clean/break ratio  
**Rationale**:
- Controlled training environment requires predictable challenge level
- 60% clean + 40% breaks provides realistic but manageable workload
- Fixed ratio ensures assessment consistency across users
**Tradeoffs**: Experienced users may find ratio predictable over time

---

### D-005 | No counterparty mismatch at confirmation level
**Date**: Pre-2026-06-26  
**Decision**: Confirmation breaks only include AMOUNT, VALUE_DATE, CURRENCY mismatches — never COUNTERPARTY  
**Rationale**: User feedback indicated counterparty mismatches at confirmation level are unrealistic for the business scenario being simulated  
**Impact**: `CONFIRMATION_BREAK_TYPES = ["AMOUNT", "VALUE_DATE", "CURRENCY"]` in `tradeGenerator.js`

---

### D-006 | In-memory pending reply queues with setInterval processing
**Date**: Pre-2026-06-26  
**Decision**: CPTY/FO simulated replies are queued in memory arrays and processed every 3 seconds  
**Rationale**:
- Simple, fast, no additional infrastructure needed
- 4–12 second simulated response delays feel realistic
- Processing randomizes which pending reply fires — adds unpredictability
**Tradeoffs**: Replies are lost on server restart; not suitable for production-grade persistence  
**Future**: Move to Agenda-based persistent job scheduling for restart survivability

---

### D-007 | Graduated DB allocation with exponential decay
**Date**: Pre-2026-06-26  
**Decision**: Use formula `20 * (1 - e^(-0.003 * pool))` for DB vs generated trade mix  
**Rationale**:
- Large pool → reuse real historical trades for richer simulation
- Depleting pool → gracefully generate new trades
- Exponential decay provides smooth, natural depletion curve
- Avoids cliff-edge behavior (no sudden shift from 100% DB to 0% DB)
**Impact**: `calculateDbAllocation()` in `queueComposer.js`

---

### D-008 | LLM provider chain (Gemini → Cerebras → offline)
**Date**: Pre-2026-06-26  
**Decision**: Use Google Gemini as primary LLM; fall back to Cerebras; then static offline responses  
**Rationale**:
- Gemini provides best quality responses for financial context
- Cerebras is faster/cheaper fallback
- Groq was considered but commented out (not yet in active chain)
- Offline responses ensure simulation never breaks due to API failure
**Impact**: `src/engine/llmService.js`, `cptyAI.js`, `foAI.js`, `offlineResponseEngine.js`

---

### D-009 | Webpack over Turbopack for frontend dev server
**Date**: 2026-06-26  
**Decision**: Use `next dev --webpack` instead of default Turbopack  
**Rationale**: Turbopack has Windows compatibility issues; `--webpack` is stable and well-tested  
**Impact**: `package.json` dev script: `"dev": "next dev --webpack"`

---

### D-010 | User email as userId throughout system
**Date**: Pre-2026-06-26  
**Decision**: JWT payload uses `userId = user.email`; email is used as primary user identifier everywhere  
**Rationale**: Simple; no need for UUID generation; email is already unique in User collection  
**Tradeoffs**:
- Email exposed in URL query params (`?userId=user@example.com`)
- Email changes would require data migration
- Email visible in browser history and logs
**Future**: Consider opaque user ID (UUID) for privacy

---

### D-011 | `uiRoutes.js` kept but deprecated
**Date**: Pre-2026-06-26  
**Status**: Legacy — should be removed  
**Notes**: `uiRoutes.js` contains unauthenticated routes using in-memory lifecycle engine (not DB-backed). These are NOT registered in `server.js` currently. They represent the v1 architecture and should be deleted in a cleanup pass.

---

### D-012 | Session touches on queue fetch (not on every action)
**Date**: Pre-2026-06-26  
**Decision**: `queueComposer.touchSession()` is called on `GET /api/queue/my` and on trade actions  
**Rationale**: Keeps session alive during active use; prevents premature expiry during normal operations

---

### D-013 | Socket.io rooms per user AND per desk
**Date**: Pre-2026-06-26  
**Decision**: Each connected socket joins two rooms: `user_<userId>` (targeted) and `desk_<deskName>` (broadcast)  
**Rationale**:
- `user_<userId>` for targeted trade-specific notifications
- `desk_<desk>` for desk-wide broadcasts (not currently used but available)
- Allows flexible notification routing without global broadcasts
