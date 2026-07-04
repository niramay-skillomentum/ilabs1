# 20 · Security Analysis

[← 19 Performance](19_Performance_Analysis.md) | [INDEX](INDEX.md) | Next: [21 Developer Guide →](21_Developer_Guide.md)

---

Security review of the codebase as-is. Severity: 🔴 high · 🟠 medium · 🟢 low / informational. This is a **training simulator** (no real money/PII beyond email+name), which lowers real-world risk, but the issues below matter if it is exposed publicly or extended.

## 20.1 Secrets management

| Severity | Finding | Location |
|---|---|---|
| 🔴 | **Hardcoded JWT secret in source** | [test-route.js:4](../test-route.js) — `const secret = "sgb_ops_simulator_secret_key_2026";`. If this is (or ever was) the real `JWT_SECRET`, all tokens are forgeable. Remove; never commit secrets. |
| 🔴 | **Hardcoded weak JWT secret in compose** | [docker-compose.yml](../docker-compose.yml) — `JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_CHANGE_ME`. Ships a guessable secret for the backend container. |
| 🟠 | `.env` committed? | `.gitignore` lists `.env`, but a real `.env` file exists in the working tree. Ensure it is never committed; rotate any exposed keys (Gemini/OpenRouter). |
| 🟢 | Fail-fast on missing secret | ✅ Good: server `process.exit(1)` if `JWT_SECRET` unset; no fallback secret in `middleware/auth.js`. |

## 20.2 Authentication & authorization

| Severity | Finding | Detail |
|---|---|---|
| 🔴 | **No authorization / IDOR risk** | There is **no role system** and several endpoints don't scope by the caller. `GET /api/trade/all` returns **all** trades globally. `POST /api/fo-channel/send` fetches `Trade.findOne({tradeRef})` with **no `assignedTo` filter**. `POST /api/conversation(s)/send` and `/resolve` fetch with `assignedTo:{$ne:null}` (any owner). A user could act on another user's trade by supplying its `tradeRef`. |
| 🟠 | **Client-side-only route protection** | Frontend auth is `useEffect` redirects reading `sessionStorage`; there is no `middleware.js`. Bypassable by calling the API directly (mitigated by JWT on the API, but the *pages* are not the boundary). |
| 🟠 | **Token in `sessionStorage`** | JS-readable → XSS can exfiltrate it. The backend also sets an HttpOnly cookie (safer) but the app relies on the sessionStorage copy. |
| 🟠 | **Generic vs specific errors** | Login returns the same `"Invalid email or password"` for both cases ✅ (good — no user enumeration). But `500 {error: err.message}` leaks internal error text on many routes. |
| 🟢 | JWT 3h expiry | Reasonable. No refresh token (acceptable for a 3h session). |
| 🟢 | Auth header parsing | Takes `split(" ")[1]` without validating the `Bearer` scheme — cosmetic, low risk. |

## 20.3 Injection & input validation

| Severity | Finding | Detail |
|---|---|---|
| 🟢 | **XSS mitigated on email bodies** | ✅ `conversationEngine.createMessage` runs `sanitize-html` (KI-017) before storing message bodies. Frontend renders them via `dangerouslySetInnerHTML`, so this sanitization is the key defense — **keep it**. |
| 🟠 | **Unsanitized `dangerouslySetInnerHTML`** | `MessageThread`/`ThreadEmail` render `msg.body` as HTML. This is only safe because of the server-side sanitize step; any other write path to `Conversation.messages` (e.g. tradeGenerator's proactive emails, AI replies) must also go through `createMessage` (they do). Do not add unsanitized write paths. |
| 🟠 | **NoSQL injection surface** | Many handlers pass `req.body`/`req.query` fields straight into Mongoose queries (e.g. `Trade.findOne({tradeRef})`, `SystemMail.updateMany({userId, tradeRef})`). Mongoose casts to schema types so classic `$`-operator injection is limited, but request bodies are not validated/whitelisted. Add input validation (e.g. a schema validator) and never spread raw bodies into queries. |
| 🟠 | **No body schema validation** | Endpoints check presence of a few fields but not types/shape (e.g. `POST /trade/action` trusts `action` string; `comment` only checked non-empty). |
| 🟢 | Client trade object not trusted | ✅ `POST /trade/action` re-fetches the trade server-side rather than trusting the client's `trade` object. |

## 20.4 Transport & CORS

| Severity | Finding | Detail |
|---|---|---|
| 🟠 | **Wide-open CORS on REST** | `app.use(cors())` with no options allows any origin to call the API. Socket.io is correctly restricted via `ALLOWED_ORIGINS`, but the REST API is not. Lock down REST CORS to known origins. |
| 🟠 | **Cookie `Secure` only in prod** | Login cookie adds `; Secure` only when `NODE_ENV==="production"`. Ensure prod actually sets `NODE_ENV`. `SameSite=Lax` is reasonable. |
| 🟢 | Socket JWT auth | ✅ Handshake verifies JWT and rejects otherwise. |

## 20.5 CSRF

| Severity | Finding | Detail |
|---|---|---|
| 🟢 | **Low CSRF risk (token-based)** | The app authenticates via the `Authorization: Bearer` header from `sessionStorage`, which browsers don't attach automatically → CSRF-resistant for the primary path. **However**, the middleware also accepts the `auth_token` cookie as a fallback, and with wide-open CORS + `SameSite=Lax`, some state-changing requests could be driven cross-site. Prefer header-only auth for state-changing routes, or add CSRF tokens if relying on cookies. |

## 20.6 Rate limiting & abuse

| Severity | Finding | Detail |
|---|---|---|
| 🟢 | Auth rate limiting | ✅ `authLimiter` 15/15min/IP on register+login (brute-force guard). |
| 🟠 | No rate limiting elsewhere | The AI tutor (`/api/chat/tutor`) and trade/comms endpoints are unthrottled → cost/abuse risk against paid LLM APIs. `test-route.js` even demonstrates a 50KB payload. Add per-user throttling on LLM routes. |
| 🟠 | LLM prompt-injection | User email/message text is injected into Gemini/Nemotron prompts. A crafted message could try to manipulate the persona/tutor. Personas request strict JSON and have offline fallbacks (limits blast radius); the tutor is instructed never to reveal answers but is not hardened against jailbreaks. |

## 20.7 Data exposure

| Severity | Finding | Detail |
|---|---|---|
| 🟠 | `err.message` in responses | Many `catch` blocks return `500 {error: err.message}` — can leak stack/DB details. Return generic messages in prod. |
| 🟢 | Passwords | ✅ bcrypt (cost 10); never returned in responses. |
| 🟢 | PII minimal | Only email + fullName stored. |

## 20.8 Security posture summary

```mermaid
flowchart TD
  A[Threat] --> B{Mitigated?}
  B -->|XSS email| G1[✅ sanitize-html]
  B -->|Brute force login| G2[✅ rate limit]
  B -->|Password theft| G3[✅ bcrypt]
  B -->|Socket auth| G4[✅ JWT handshake]
  B -->|IDOR / no authz| R1[🔴 no ownership checks on several routes]
  B -->|Hardcoded secrets| R2[🔴 test-route.js / docker-compose]
  B -->|Open CORS REST| R3[🟠 cors() wide open]
  B -->|LLM abuse/injection| R4[🟠 no throttle / weak hardening]
  B -->|Error leakage| R5[🟠 err.message in 500s]
```

## 20.9 Prioritized remediation

1. 🔴 Remove hardcoded secrets (`test-route.js`, `docker-compose.yml`); rotate any leaked keys.
2. 🔴 Add ownership checks (`assignedTo: userId`) to `fo-channel/send`, `conversation/send`, `conversation/resolve`; scope or paginate `trade/all`.
3. 🟠 Restrict REST CORS to known origins.
4. 🟠 Add input validation/whitelisting on request bodies; keep queries from spreading raw input.
5. 🟠 Rate-limit LLM endpoints; harden tutor/persona prompts.
6. 🟠 Return generic error messages in production.
7. 🟠 Prefer header-only auth (or add CSRF protection) for state-changing routes.

> Analysis only — no code was modified.

---
[← 19 Performance](19_Performance_Analysis.md) | [INDEX](INDEX.md) | Next: [21 Developer Guide →](21_Developer_Guide.md)
