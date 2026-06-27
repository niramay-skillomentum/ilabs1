# 14. Code Analysis (Performance & Security)

This document provides a technical analysis of the SGB Operations Simulator codebase.

## 1. Unused Code & Dead Code
- **`migrateDB.js`, `checkDB.js`**: These are utility scripts stored at the root, likely used during development. They are not part of the runtime server loop and can be ignored or moved to a `/scripts` directory.
- **Root `llmService.js`**: There is an `llmService.js` at the root, but the actively used one is in `src/engine/llmService.js`. The root one might be deprecated.
- **Redundant State Checks**: The frontend `WorkstationComponent` has some complex `useEffect` dependency arrays that could be streamlined.

## 2. Performance Analysis

### Areas for Optimization
1. **Frontend `WorkstationComponent` Rendering**: The `page.js` file for the Workstation is nearly 600 lines long. It handles the data table, multiple modals (actions, emails, audit), and socket connections.
   - *Recommendation*: Split modals (`ActionModal`, `AuditModal`) into separate components to prevent the entire massive table from re-rendering every time the user types in a comment box.
2. **Backend Polling Intervals**: `server.js` runs `setInterval` every 2-3 seconds for `communicationEngine.processReplies()`. 
   - *Recommendation*: As the database grows, querying `Conversation.find({ status: "OPEN" })` every 3 seconds could become a bottleneck. Convert this from a pull-based polling mechanism to an event-driven push mechanism (e.g., using Agenda or a Redis queue when a message is inserted).
3. **Cache Synchronization**: The 2-second interval refreshing `_cachedTrades` in `server.js` pulls all assigned trades into memory. 
   - *Recommendation*: This is inefficient at scale. Use a dedicated cache layer like Redis, and invalidate specific keys only when a trade is updated.

## 3. Security Analysis

### Strengths
- **Rate Limiting**: `authRoutes.js` implements `express-rate-limit` to prevent brute forcing passwords.
- **Password Hashing**: Passwords are properly hashed using `bcryptjs`.
- **JWT Protection**: The backend correctly verifies JWTs for API and Socket.io endpoints.

### Vulnerabilities / Risks
1. **JWT Storage (XSS Risk)**: The backend sets an `HttpOnly` cookie, which is great for mitigating XSS. However, the API *also* returns the token in the JSON response, and the frontend stores it in `sessionStorage` and manually injects it into `Authorization: Bearer <token>` headers.
   - *Risk*: If the app suffers an XSS attack, the malicious script can read `sessionStorage` and steal the token.
   - *Fix*: Rely solely on the `HttpOnly` cookie for API authentication. Remove token from `sessionStorage` and remove explicit `Authorization` headers. Configure `fetch` to include `credentials: "include"`.
2. **Missing Input Validation / Sanitization**: There is minimal validation on `comment` or `emailText` inputs when submitting actions. 
   - *Risk*: Users can submit excessively large strings, or potentially malicious payloads if not handled correctly by the React frontend (React escapes by default, but it's bad practice on the backend).
3. **CORS Configuration**: The `getAllowedOrigins()` function falls back to `http://localhost:3000`. Ensure `ALLOWED_ORIGINS` is strictly configured in production to prevent Cross-Site WebSocket Hijacking (CSWSH).
