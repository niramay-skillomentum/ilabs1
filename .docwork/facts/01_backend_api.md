# GROUND TRUTH — Backend HTTP/Socket API (verified against code)

Stack: Express 5, Mongoose 9 (MongoDB Atlas), Socket.io 4, JWT (jsonwebtoken), bcryptjs, express-rate-limit, sanitize-html, Agenda 5. App is the **SGB Operations Simulator** (trade back-office training sim). Backend entry: `server.js`. Default port **3002** (`PORT`).

## Server bootstrap (server.js)
- Global `cors()` (server.js:104), `express.json()` (server.js:105).
- Port `process.env.PORT || 3002` (server.js:17).
- Fails fast if `JWT_SECRET` missing (server.js:95-99).
- `connectDB()` from src/db.js (Mongoose; memory-only fallback if MONGO_URI unset; serverSelectionTimeout 10s, socketTimeout 45s).
- `startAgenda()` from src/engine/agendaJobs (session-cleanup + daily-age-update every 1 min).
- `initSocket(server)` from src/engine/socketEngine.js.
- Background setInterval loops in server.js:
  - Communication (CPTY) reply processor — every 3s (server.js:25-40)
  - FO reply processor — every 3s (server.js:43-59)
  - FO internal channel processor — every 3s (server.js:62-74)
  - Trade cache refresh — every 2s (server.js:77-90)

### Router mount paths (server.js:107-118)
| Base | Router file |
|---|---|
| /api/auth | authRoutes.js |
| /api/session | sessionRoutes.js |
| /api/clock | clockRoutes.js |
| /api/queue | queueRoutes.js |
| /api/trade | tradeRoutes.js |
| /api/conversation AND /api/conversations | conversationRoutes.js (dual mount) |
| /api/fo-channel | foChannelRoutes.js |
| /api/audit | auditRoutes.js |
| /api/settlement | settlementRoutes.js |
| /api/ssi | ssiRoutes.js |
| /api/chat | chatRoutes.js |

## Auth middleware (src/middleware/auth.js)
- Token from `Authorization: Bearer <t>` (auth.js:11-12) OR cookie `auth_token` (auth.js:14-22).
- `jwt.verify` with `JWT_SECRET`; attaches `req.user = { userId, fullName }` (auth.js:30).
- No token → 401 `{ error: "Authentication required" }`. Invalid/expired → 403 `{ error: "Invalid or expired token" }`.
- No role checks in middleware; authorization is per-trade-status in the state machine (tradeRoutes).

## REST endpoints (base + subpath, auth, purpose)
### /api/auth (authRoutes.js) — rate limited 15 req/IP/15min (authRoutes.js:12-18)
- POST /register — no auth — `{fullName,email,password}` → `{success,message}` (400 if email exists)
- POST /login — no auth — `{email,password}` → `{success, token, user:{email,fullName}}`. Sets `auth_token` cookie HttpOnly, Max-Age 3h, SameSite=Lax, Secure in prod (authRoutes.js:76-81). Token expiry 3h.

### /api/session (sessionRoutes.js) — auth required
- GET /info → `{success, hasActiveSession, userId, fullName, [desk, queueSize, sessionStart, sessionExpiry]}`
- POST /logout → `{success:true}` (clears cookie)

### /api/clock (clockRoutes.js) — NO auth
- GET / → `{ simTime:"HH:MM", timeLeftMinutes }` (minutes remaining until 18:00)

### /api/queue (queueRoutes.js) — auth required
- POST /generate — `{desk:"MO"|"CONFIRMATION"|"SETTLEMENT"}` → `{success,desk,queueSize,trades[],sessionStart,sessionExpiry}` or `{success:false,error:"Complete your current queue first"}`
- GET /my — `?desk` optional → active queue or 400 if none

### /api/trade (tradeRoutes.js) — auth required
- GET /all → `{success, trades[]}` (selected fields incl. tradeRef, currentStatus, nextDesk, amount, currency, counterparty, direction, entity, foRegion, product, tradeType, settlementType, age, truths, pendingAmendments)
- POST /action — `{trade, action, issueType, comment}` → `{success, queueSize, trades[]}` (400/404 on invalid).
  - Trade is re-fetched from DB, not trusted from client (tradeRoutes.js:38-41). Comment mandatory (47-51). Session touched (54). Persist (350). Audit recorded (375-380). Emits socket `trade_update` to `user_${userId}` (365-372).
  - **Action → transition map** (tradeRoutes.js:58-341):
    - MO_VALIDATE_PASS: MO_PENDING → CONFIRMATION_PENDING (applies accepted amendments). In PENDING_FO_RESPONSE requires foResponseReceived=true (83-88). If pendingAmendments exist, conversation must be RESOLVED (97-103).
    - MO_RAISE_BREAK: MO_PENDING → MO_BREAK_OPEN
    - MO_SEND_TO_FO: MO_BREAK_OPEN → PENDING_FO_RESPONSE
    - CONFIRM_TRADE: LIASING_WITH_CPTY → SETTLEMENT_PENDING
    - CONFIRM_RAISE_BREAK: LIASING_WITH_CPTY → CONFIRMATION_BREAK (only once after first CPTY contact, 137-141)
    - CONFIRM_REJECT_CLAIM: CONFIRMATION_BREAK → CONFIRMATION_PENDING (applies truth if FO supports & booking matches universal)
    - CONFIRM_REQUEST_EVIDENCE: CONFIRMATION_BREAK → CONFIRMATION_BREAK (logs evidence request)
    - CONFIRM_ESCALATE_TO_FO: CONFIRMATION_BREAK → LIASING_WITH_FO (opens FO internal channel)
    - CONFIRM_RAISE_AMENDMENT: CONFIRMATION_BREAK → CONFIRMATION_BREAK
    - CONFIRM_APPROVE_AMENDMENT: CONFIRMATION_BREAK → CONFIRMATION_PENDING (applies accepted amendments)
    - CONFIRM_RESEND: CONFIRMATION_PENDING → LIASING_WITH_CPTY
    - CONFIRM_SEND_TO_CPTY: CONFIRMATION_PENDING|CONFIRMATION_BREAK|LIASING_WITH_FO|LIASING_WITH_CPTY → LIASING_WITH_CPTY (increments cptyContactCount)
    - SETTLEMENT_APPROVE: SETTLEMENT_PENDING|LIASING_WITH_CPTY|SETTLEMENT_BREAK → SETTLED (validates SSI match)
    - SETTLEMENT_RAISE_BREAK: SETTLEMENT_PENDING|READY_FOR_APPROVAL|LIASING_WITH_CPTY → SETTLEMENT_BREAK
    - SETTLEMENT_FOLLOW_UP_CPTY: SETTLEMENT_PENDING|SETTLEMENT_BREAK|LIASING_WITH_CPTY → LIASING_WITH_CPTY

### /api/conversation AND /api/conversations (conversationRoutes.js) — auth required
- POST /send — `{tradeRef, sender, message, desk}` → `{success}`. Parses via aiParser.parseEmail(). If trade in MO/PENDING_FO_RESPONSE: schedules FO reply, MO_BREAK_OPEN→PENDING_FO_RESPONSE. Else schedules CPTY reply. Emits `new_email` (io.emit, global).
- POST /resolve — `{tradeRef}` → `{success, message, newStatus:"MO_PENDING"}`. Requires foResponseReceived=true (130-134). Marks conversation RESOLVED, accepts+applies pendingAmendments, transitions to MO_PENDING.
- GET /shared — `?desk` → `{success, conversations:[{trade, conversation:{subject,status,messages[]}}]}`
- GET /personal → conversations where user sent messages
- GET /:tradeRef → `{success, subject, messages[]}`

### /api/fo-channel (foChannelRoutes.js) — auth required
- GET /list — `?desk` → `{success, conversations[]}`
- GET /:tradeRef → `{channel, messages[]}` or `{channel:null, messages:[]}`
- POST /send — `{tradeRef, message}` → `{success}`. Opens channel via foInternalChannel.openChannel, sends, transitions to LIASING_WITH_FO/PENDING_FO_RESPONSE if needed, increments foContactCount, schedules FO reply.

### /api/audit (auditRoutes.js) — auth required
- GET /:tradeRef → `{trail:[...], xmlAudit: null|"<xml>"}` (manual AuditLog + optional Trade.auditXml)

### /api/settlement (settlementRoutes.js) — auth required
- POST /select-type — `{tradeRef, selectedType}` → `{success, redirect:"/settlement/<type>"}`. Compares vs truths.settlement.settlementType; mismatch → 10-pt penalty + 400.
- POST /edit-ssi — `{tradeRef, ssiData}` → `{success}`
- GET /bilateral/:tradeRef → `{success, trade}`
- POST /bilateral/action — `{tradeRef, action:"APPROVE_SETTLEMENT"|"RAISE_BREAK"|"EDIT_SETTLEMENT"|"MAIL_CPTY", editData}`. APPROVE compares settlementDetails vs truth.settlement across 9 fields (beneficiaryName, beneficiaryBank, beneficiaryBIC, accountNumber, accountType, currency, settlementMethod, correspondentBank, paymentReference); match→SETTLED, mismatch→10-pt penalty+400. MAIL_CPTY: SETTLEMENT_BREAK→LIASING_WITH_CPTY (emits socket).
- GET /electronic/:tradeRef → `{success, trade}`
- POST /electronic/action — same as bilateral minus MAIL_CPTY.

### /api/ssi (ssiRoutes.js) — auth required
- GET /search — `?id=<ssiId>` → `{success, ssi}` or 404. Searches CPTY_SSIS and ENTITY_SSIS from tradeGenerator.js.

### /api/chat (chatRoutes.js) — auth required
- POST /tutor — `{message, desk, tradeContext, history[]}` → `{reply}` (400 if message missing, 500 on failure). Uses generateTutorResponse() from src/engine/tutorAI.js.

## Socket.io (src/engine/socketEngine.js)
- CORS origin from `ALLOWED_ORIGINS` (comma-sep) else `NEXT_PUBLIC_BACKEND_URL || http://localhost:3000`; methods GET/POST; credentials true (socketEngine.js:13-27).
- Auth middleware: token from `socket.handshake.auth.token` OR cookie `auth_token`; on fail emits "Authentication error"; sets `socket.user={userId,fullName}` (31-52).
- Rooms: auto-join `user_${userId}` (59); dynamic `desk_${desk}` via `join_desk`/`leave_desk` (62-70).
- Server→Client emits: `trade_update` `{tradeRef,currentStatus}` to user room (tradeRoutes, settlementRoutes); `new_email` `{tradeRef,sender,subject,timestamp}` global (conversationRoutes).
- Client→Server: `join_desk`, `leave_desk`, `disconnect`.
- Exports: `initSocket(server)`, `getIo()`.

## Security config summary
- Global permissive `cors()` on REST; restricted CORS on socket via ALLOWED_ORIGINS.
- Auth rate limit 15/IP/15min on register+login.
- JWT 3h expiry; cookie HttpOnly/SameSite=Lax/Secure-in-prod.
- JWT_SECRET required at boot (no fallback).
