# 21 · Developer Guide

[← 20 Security](20_Security_Analysis.md) | [INDEX](INDEX.md) | Next: [22 Glossary →](22_Glossary.md)

---

Practical "how to extend this project" recipes, matched to its actual conventions.

## 21.0 Local setup & run

### Backend
```bash
# from repo root
cp .env.example .env         # fill MONGO_URI, JWT_SECRET, GEMINI_API_KEY, OPENROUTER_API_KEY
npm install
node seedConfig.js           # seed SETTLEMENT_INITIAL_STATE (optional but recommended)
npm run dev                  # nodemon server.js → http://localhost:3002
```
### Frontend
```bash
cd frontend
npm install
# optionally set NEXT_PUBLIC_BACKEND_URL=http://localhost:3002 in .env.local
npm run dev                  # next dev --webpack → http://localhost:3000
```
### Tests
```bash
npm run test:backend         # jest tests/backend (root)
cd frontend && npm test      # jest (RTL)
```
### Docker
```bash
docker compose up --build    # mongodb + backend(:3002) + frontend(:3001)
```
### Handy dev scripts
`node checkDB.js` (dump conversations), `node cleanDB.js` (wipe all), `node migrateDB.js` (backfill desks), `node test-tutor.js` (tutor smoke).

---

## 21.1 How to add a new API endpoint

1. Pick/create a router in `src/routes/`. Import `authenticateToken` and required models/engines.
2. Add the handler; **guard with `authenticateToken`**:
   ```js
   const { authenticateToken } = require("../middleware/auth");
   router.post("/thing", authenticateToken, async (req, res) => {
     try {
       const userId = req.user.userId;            // = email
       // validate req.body
       // scope by ownership: Trade.findOne({ tradeRef, assignedTo: userId })
       // call engine(s)
       res.json({ success: true, ... });
     } catch (err) {
       res.status(500).json({ error: "..." });    // avoid leaking err.message in prod
     }
   });
   ```
3. If it's a new router file, **mount it in [server.js](../server.js)**: `app.use("/api/thing", require("./src/routes/thingRoutes"));`
4. If it changes `currentStatus`, go through `LifecycleEngine.transition(trade, next)` and add the transition to [transitions.js](../src/engine/transitions.js).
5. To notify the UI in real time, `getIo().to("user_" + userId).emit("trade_update", {...})` (wrap in try/catch).
6. Audit it: `auditEngine.recordEvent(tradeRef, userId, "ACTION", "details")`.
7. Update [09 API Reference](09_API_Reference.md).

## 21.2 How to add a new trade action (desk button)

Actions flow through `POST /api/trade/action`. To add one:
1. **Backend** ([tradeRoutes.js](../src/routes/tradeRoutes.js)): add the action to the `allowedActions` map (with the statuses it's legal in) and a `case` in the `switch` setting `nextStatus`/`nextDesk` + side effects.
2. **Transition**: ensure `transitions.js` permits `currentStatus → nextStatus`.
3. **Frontend** ([workstation/page.js](../frontend/src/app/workstation/page.js)): add the same entry to the `allowed` map and a button that calls `handleOpenAction('YOUR_ACTION')`.
4. Keep the two `allowedActions`/`allowed` maps in sync (they are duplicated — see [18](18_Unused_And_Dead_Code.md)).

## 21.3 How to add a new database collection (model)

1. Create `src/models/YourModel.js`:
   ```js
   const mongoose = require("mongoose");
   const YourSchema = new mongoose.Schema({
     tradeRef: { type: String, index: true },
     // fields...
   }, { timestamps: true });
   module.exports = mongoose.model("YourModel", YourSchema);
   ```
2. `require` it where needed (routes/engines).
3. Add indexes for query fields (`index: true` / `unique: true`).
4. Document it in [11 Database Schema](11_Database_Schema.md).
5. If it needs seeding, follow [seedConfig.js](../seedConfig.js)'s upsert pattern.

## 21.4 How to add a new frontend page (route)

1. Create `frontend/src/app/yourpage/page.js` with `'use client'`.
2. If it uses `useSearchParams`, wrap the inner component in `<Suspense>` (see existing pages).
3. Auth-gate in `useEffect`:
   ```js
   import { getToken, loadUserId } from "../../lib/auth";
   useEffect(() => {
     if (!getToken() || !loadUserId()) { router.push("/"); return; }
     // fetch initial data with authHeaders()
   }, []);
   ```
4. Call the backend with relative `/api/...` (proxied) and `authHeaders()` from `lib/auth.js`.
5. For real-time, `io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002', { auth: { token: getToken() } })` and `emit("join_desk", desk)`.
6. Add navigation to it from an existing page (`router.push` or `window.open`).
7. Document it in [07 Navigation](07_Navigation_And_Routing.md) + [08 Components](08_Frontend_Components.md).

## 21.5 How to add a new React component

1. Put shared components in `frontend/src/components/`, route-local ones next to the page (e.g. `communication/components/`).
2. Plain function component; only add `'use client'` if it uses hooks/browser APIs at the top of a new client tree (route-local children inherit the page's client boundary).
3. Pass data via props; there is no global store. Reuse helpers from `communication/components/utils.js` where relevant.

## 21.6 How to add a new engine / background processor

1. Create `src/engine/yourEngine.js`. Export functions or a singleton (`module.exports = new YourEngine()`), matching the existing style.
2. If it needs delayed processing, follow the **PendingReply / SystemJob pattern**: persist a job with a future `sendAt`, and add a `setInterval` in `server.js` that drains due jobs and **claims them via `findByIdAndDelete`** (at-most-once).
3. Guard DB writes with `getIsConnected()` if the engine should tolerate memory-only mode.
4. Emit via `getIo()` (lazy require to avoid init-order issues).

## 21.7 How to add authentication to a new route
Just add `authenticateToken` as middleware. `req.user.userId` (email) and `req.user.fullName` are then available. For ownership, always filter by `assignedTo: req.user.userId` (see [20 Security](20_Security_Analysis.md) — several existing routes omit this and should be fixed).

## 21.8 How to add a new desk

Desks are strings threaded via `?desk=`. To add one:
1. Add a button in [dashboard/page.js](../frontend/src/app/dashboard/page.js) `goDesk('YOURDESK')`.
2. Add desk-specific status pools in `queueComposer.buildQueue` and status defaults in `tradeGenerator`.
3. Add aging rules in `ageCalculator.calculateAge`.
4. Add an action bar + `allowed` entries in `workstation/page.js` and backend `allowedActions`.
5. Add SOP text in [instructionsData.js](../frontend/src/components/instructionsData.js).

## 21.9 How to add an "admin" page
There is no admin subsystem today. To add one you would: create a role field on `User`, extend `authenticateToken` (or a new `requireRole` middleware) to check it, gate admin routes/pages accordingly, and surface `UserScore`/`AuditLog` data (both already collected). This is greenfield — plan it against [11 Database](11_Database_Schema.md) and [20 Security](20_Security_Analysis.md).

## 21.10 Conventions cheat-sheet

| Convention | Value |
|---|---|
| Module system | CommonJS (`require`/`module.exports`) backend; ESM in frontend |
| `userId` | always the user's **email** |
| Status change | always via `LifecycleEngine.transition` + `save()` |
| Ownership | filter `assignedTo: userId` |
| Real-time | `getIo().to("user_"+userId).emit(...)` (wrap in try/catch) |
| Audit | `auditEngine.recordEvent(...)` (fire-and-forget) |
| Delayed work | `PendingReply` / `SystemJob` + interval drainer with `findByIdAndDelete` |
| Email bodies | always through `conversationEngine.createMessage` (sanitized) |
| Frontend auth | `sessionStorage` via `lib/auth.js` |
| API calls | relative `/api/*` + `authHeaders()` |

---
[← 20 Security](20_Security_Analysis.md) | [INDEX](INDEX.md) | Next: [22 Glossary →](22_Glossary.md)
