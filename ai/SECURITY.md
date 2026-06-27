content: # Security

> Last updated: 2026-06-27

---

## Authentication

### JWT

- **Algorithm**: HS256
- **Secret**: `JWT_SECRET` env var — **no fallback**. Server exits with `FATAL` at startup if unset.
- **Token lifetime**: 3 hours (matches session duration)
- **Payload**: `{ userId, fullName }`
- **Delivery**: HTTP response body JSON + `auth_token` HttpOnly cookie

### Cookie Settings

```
auth_token=<JWT>; Path=/; Max-Age=10800; SameSite=Lax; HttpOnly
```

- `HttpOnly` ✅ — cookie is **not** accessible from JavaScript
- `SameSite=Lax` ✅ — protects against CSRF for cross-site navigations
- `Secure` ❌ — not set in development; **must add in production** (HTTPS only)
- Frontend reads token from `sessionStorage` exclusively (set via `saveSession()` in `auth.js`)

### Auth Middleware — `src/middleware/auth.js`

Token resolution order:
1. `Authorization: Bearer <token>` header
2. `auth_token` cookie (fallback)

Returns:
- `401` — no token present
- `403` — token invalid or expired (`JsonWebTokenError`, `TokenExpiredError`)

---

## Authorization

- Every protected route uses `authenticateToken` middleware
- Backend **always re-fetches the trade from DB** with ownership check (`{ tradeRef, assignedTo: req.user.userId }`) — client cannot spoof trade ownership
- No role-based access control (RBAC) exists currently — all authenticated users have identical access

---

## Password Security

- Hashed with **bcryptjs**, 10 salt rounds
- Passwords never stored in plaintext
- Login uses `bcrypt.compare()` (constant-time, resistant to timing attacks)
- No password complexity requirements enforced yet

---

## Rate Limiting

Implemented via `express-rate-limit` v8.5.2:

```js
// Applied to /api/auth/register and /api/auth/login
windowMs: 15 * 60 * 1000  // 15 minutes
limit: 15                   // 15 requests per window per IP
```

Returns `429 Too Many Requests` when exceeded.

---

## CORS

**Socket.io CORS**:
```js
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}
```

Configured via `ALLOWED_ORIGINS` env var (comma-separated). Defaults to `http://localhost:3000`.

**Express CORS**: Not currently configured — Express does not set CORS headers. This is acceptable because the frontend proxies all requests through Next.js rewrites (same-origin from browser perspective).

---

## Input Validation

| Input | Validation |
|-------|-----------|
| Register fields | `fullName`, `email`, `password` required; returns 400 if missing |
| Login fields | `email`, `password` required |
| Email normalization | `email.toLowerCase()` on register and login |
| Trade action comment | Server-side required check; 400 if empty or missing |
| Desk parameter | Whitelisted against `["MO", "CONFIRMATION", "SETTLEMENT"]` |
| Trade ownership | `trade.assignedTo === req.user.userId` enforced on every action |
| Email body | Stored as-is — no HTML sanitization yet (XSS risk in email rendering) |

---

## Environment Variables Security

| Variable | Sensitivity | Notes |
|----------|------------|-------|
| `MONGO_URI` | 🔴 Critical | Contains MongoDB Atlas credentials — never commit |
| `JWT_SECRET` | 🔴 Critical | Long, random string required; server refuses to start without it |
| `GEMINI_API_KEY` | 🔴 High | Google AI API key — never commit |
| `CEREBRAS_API_KEY` | 🔴 High | Cerebras SDK key — never commit |
| `GROQ_API_KEY` | 🟡 Medium | Optional; not in active provider chain |
| `ALLOWED_ORIGINS` | 🟢 Low | Comma-separated frontend origins |
| `PORT` | 🟢 Low | Backend server port (default 3002) |

Frontend-specific (in `frontend/.env.local`):

| Variable | Sensitivity | Notes |
|----------|------------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | 🟢 Low | Public — safe to expose; used in browser-side socket connection |
| `BACKEND_URL` | 🟢 Low | Server-side only (used in Next.js rewrites config) |

**`.env`** should be in `.gitignore`. **`.env.example`** at the repo root provides a safe template with no real credentials.

---

## Data Privacy

| Issue | Status | Detail |
|-------|--------|--------|
| Email in URL params | ✅ Fixed | Email was previously exposed as `?userId=user@email.com` in URL; now stored in `sessionStorage` via `auth.js` |
| Email as userId | 🟡 Acceptable | `user.email` is used as primary identifier throughout; not exposed in URLs now |
| Trade data | 🟢 Safe | All trade data is synthetic; no real PII |
| Audit logs | 🟢 Safe | Contain userId (email) + actions — stored in private DB only |

---

## Security Issues Status

| ID | Issue | Severity | Status |
|----|-------|---------|--------|
| KI-001 | No rate limiting on auth | High | ✅ Fixed — `express-rate-limit` added |
| KI-002 | Email in URL query params | High | ✅ Fixed — `auth.js` module, sessionStorage |
| KI-003 | JWT hardcoded fallback secret | High | ✅ Fixed — fatal error if `JWT_SECRET` unset |
| KI-004 | `auth_token` not HttpOnly | Medium | ✅ Fixed — `HttpOnly` flag added |
| KI-005 | Socket.io CORS `*` | Medium | ✅ Fixed — `ALLOWED_ORIGINS` env var |
| KI-006 | Legacy `uiRoutes.js` unauthenticated | Medium | ✅ Fixed — file deleted |
| — | Email body XSS | Low | ❌ Open — user messages stored/rendered as-is |
| — | No `Secure` cookie flag | Low | ❌ Open — needed for HTTPS in production |
| — | No RBAC | Low | ❌ Open — all users have equal access |
| — | No input sanitization on email bodies | Low | ❌ Open — potential XSS in message rendering |

---

## Production Security Checklist

Before deploying publicly:

- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS (TLS termination via nginx or cloud load balancer)
- [ ] Add `Secure` flag to auth cookie in `authRoutes.js`
- [ ] Set `ALLOWED_ORIGINS` to production frontend URL
- [ ] Rotate `JWT_SECRET` to a cryptographically random 64-char+ string
- [ ] Sanitize email message bodies before rendering (DOMPurify or equivalent)
- [ ] Verify `.env` is in `.gitignore` and not in any Docker layer
- [ ] Review audit logs to ensure no secrets are being logged
- [ ] Consider opaque UUID-based user IDs instead of email as `userId`
 file_path: /workspace/ilabs1/ai/SECURITY.md