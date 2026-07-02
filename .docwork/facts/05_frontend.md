# GROUND TRUTH — Frontend (Next.js 16 App Router, React 19, Tailwind v4)

Frontend root: `frontend/`. Deps: next 16.2.9, react 19.2.4, socket.io-client, react-hot-toast, react-markdown, js-cookie, @tailwindcss/typography. Path alias `@/*` → `./src/*` (jsconfig.json). Dev: `next dev --webpack` (port 3000). Docker prod port 3001.

## Route map (App Router)
| Path | File | Purpose | Protected |
|---|---|---|---|
| / | src/app/page.js | Login/Register | No |
| /dashboard | src/app/dashboard/page.js | Desk selector (MO, CONFIRMATION, SETTLEMENT, TLM, REPORTING) | Yes |
| /workstation | src/app/workstation/page.js | Main trade queue + action hub; socket updates | Yes (query `desk=`) |
| /mo-risk | src/app/mo-risk/page.js | MO termsheet/FO reference viewer | Yes |
| /communication | src/app/communication/page.js | Folder mailbox + FO channel | Yes (params desk, tradeRef, channel, composeFor, composeTo) |
| /settlement/electronic | src/app/settlement/electronic/page.js | Electronic settlement dashboard | Yes (query tradeRef) |
| /settlement/bilateral | src/app/settlement/bilateral/page.js | Bilateral settlement dashboard (+ Mail CPTY) | Yes (query tradeRef) |
| /ssi-database | src/app/ssi-database/page.js | SSI lookup by ID | Yes |

## Auth (src/lib/auth.js)
- Token in `sessionStorage["auth_token"]` (JWT from /api/auth/login). userId, fullName also in sessionStorage.
- authHeaders() → {Content-Type: application/json, Authorization: Bearer <token>}.
- Backend base URL = `process.env.NEXT_PUBLIC_BACKEND_URL` (default http://localhost:3002).
- Login/register → save token+userId → redirect /dashboard. clearSession() + POST /api/session/logout on logout.
- Each protected page checks getToken()/loadUserId() in useEffect → redirect / if missing.

## next.config.mjs
- Rewrites proxy `/api/:path*` and `/socket.io/:path*` to `NEXT_PUBLIC_BACKEND_URL` (or server BACKEND_URL), default http://localhost:3002.
- Dev indicators disabled.

## Pages
### / (login) — POST /api/auth/login `{email,password}`, POST /api/auth/register `{fullName,email,password}`. Toggle login/register. react-hot-toast.
### /dashboard — 5 desk buttons → push /workstation?desk=<desk>. No backend calls.
### /workstation (783 lines) — main hub.
- Topbar: desk title, session timer (real 3h + sim time from clock), refresh/logoff.
- Trade table: Ref, Status, NextDesk, Age, Dates, Counterparty, Currency, Amount. CSV export.
- Desk-specific action bar; modals: action comment, settlement type selector, email, audit trail, SSI viewer/editor, truth viewer.
- Endpoints: GET /api/queue/my?desk, POST /api/queue/generate, POST /api/trade/action `{trade,action,comment}`, GET /api/audit/:tradeRef, POST /api/settlement/edit-ssi, POST /api/settlement/select-type, POST /api/session/logout.
- Socket: io(BACKEND, {auth:{token}}); emit join_desk; listen trade_update + new_email → refresh queue. 15s polling fallback.
- Child: InstructionPanel, TutorialPanel.
- Frontend action→allowed-status map mirrors backend (MO_VALIDATE_PASS from [MO_PENDING, PENDING_FO_RESPONSE], etc.). CONFIRM_RAISE_BREAK only when cptyContactCount==1 && foContactCount==0.
### /mo-risk (178 lines) — GET /api/trade/all, GET /api/session/info fallback. Left: search/list; right: termsheet table. TermsheetViewer inline.
### /communication (601 lines + components) — 3-panel mailbox.
- Folders: Inbox (📥 personal), Group Inbox (👥 shared, hidden in FO channel), Sent/Drafts/Deleted (placeholders, no data), FO Channel (when channel=FO, replaces Group).
- Endpoints: GET /api/conversations/personal?userId&desk, GET /api/conversations/shared?desk, GET /api/fo-channel/list?desk, GET /api/conversation/:tradeRef, GET /api/fo-channel/:tradeRef, POST /api/conversation/send, POST /api/fo-channel/send, POST /api/conversation/resolve, GET /api/queue/my (compose trade list), POST /api/trade/action (compose w/ composeAction).
- Socket: listen new_email → refresh folder + reload current thread. 5s polling fallback.
- Components: FolderNav, InboxList (search by Ref/Subject/Counterparty/Body/Sender), MessageThread (reply/resolve), ComposeModal, ReplyModal, utils.js (formatters).
- Compose pre-drafts: Confirmation→COUNTERPARTY verification template; Settlement→COUNTERPARTY SSI request template; else empty.
- Subject built as `<Ref> | <Currency> <Amount> | <Value Date>`.
- Resolve state (getResolveState): CONFIRMATION+FO waits foResponseReceived; CONFIRMATION+personal waits cptyResponseReceived; MO waits foResponseReceived.
### /settlement/electronic (265) & /bilateral (277)
- Two-column: System Details (booking/settlementDetails, editable only when SETTLEMENT_BREAK for electronic; bilateral editable unless SETTLED) vs Truth Details (mismatch highlighted red).
- 9 SSI fields: beneficiaryName, beneficiaryBank, beneficiaryBIC, accountNumber, accountType, currency, settlementMethod, correspondentBank, paymentReference.
- Endpoints: GET/POST /api/settlement/{electronic|bilateral}/:tradeRef + /action `{tradeRef, action, editData}`. Bilateral adds MAIL_CPTY → redirect /communication?desk=SETTLEMENT&tradeRef=.
- SETTLED shows green checkmark.
### /ssi-database (203) — GET /api/ssi/search?id=<id> → SsiViewer table.

## Shared components (src/components)
- InstructionPanel.js — collapsible desk guide; getDeskInstructions(desk) from instructionsData.js (steps + Pro Tip).
- TutorialPanel.js — floating AI tutor chatbot; POST /api/chat/tutor `{message,desk,tradeContext,history[]}`; react-markdown; footer "Powered by Nvidia Nemotron 3".
- instructionsData.js — getDeskInstructions(desk): MO/CONFIRMATION/SETTLEMENT (3 steps each), TLM/REPORTING (1 step placeholder), default fallback.

## Styling/config
- Tailwind v4 via globals.css `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"`, `@theme inline`, Geist fonts, dark mode via prefers-color-scheme.
- jest.config.js uses next/jest, jsdom, jest.setup.js imports @testing-library/jest-dom.
