# Security

## Authentication

### JWT Authentication
- Algorithm: HS256
- Secret: `JWT_SECRET` env var (fallback: `sgb_ops_simulator_fallback_secret`)
- Token lifetime: **3 hours** (matches session duration)
- Token payload: `{ userId, fullName }`
- Token delivery: HTTP response body + `auth_token` cookie

### Cookie Settings
```
auth_token=<jwt>; Path=/; Max-Age=10800; SameSite=Lax
```
- **Not HttpOnly** — token is accessible from JS (used by `js-cookie` and `sessionStorage`)
- **No Secure flag** — only HTTP in development; must add in production

### Auth Middleware (`src/middleware/auth.js`)
Token resolution order:
1. `Authorization: Bearer <token>` header
2. `auth_token` cookie (fallback)

Returns:
- `401` — no token
- `403` — invalid/expired token

---

## Authorization

- Every protected route uses `authenticateToken` middleware
- Server re-fetches trade from DB with `assignedTo: userId` check — client cannot spoof trade ownership
- Session integrity enforced server-side: action fails if trade not in user's active queue
- No role-based access control (RBAC) yet — all authenticated users have the same access level

---

## Password Security

- Passwords hashed with **bcryptjs** (10 rounds salt)
- Passwords never stored in plaintext
- Login uses `bcrypt.compare()` — constant-time comparison

---

## Input Validation

- Email normalized to lowercase on register/login
- Missing fields return `400` errors (register: fullName, email, password; login: email, password)
- Action comment validated server-side (400 if empty)
- Desk parameter validated against whitelist: `["MO", "CONFIRMATION", "SETTLEMENT"]`
- Trade ownership verified before any action

---

## Known Security Gaps (to address)

| Issue | Severity | Description |
|-------|---------|-------------|
| No rate limiting | High | Auth endpoints (`/register`, `/login`) have no rate limit → brute force possible |
| Credentials in `.env` not gitignored properly | High | `.env` contains live MongoDB URI, API keys — must be in `.gitignore` |
| No HttpOnly cookie | Medium | `auth_token` cookie readable by JS — XSS risk |
| No Secure cookie flag | Medium | Cookie transmitted over HTTP — should be HTTPS-only in prod |
| JWT secret fallback | Low | Has a hardcoded fallback secret in `auth.js` — must remove for production |
| Socket.io CORS `*` | Low | `origin: "*"` in socketEngine — should be locked down to known origins in prod |
| No input sanitization | Low | User message bodies stored as-is — potential XSS in email rendering |
| Legacy `uiRoutes.js` | Low | Unauthenticated routes still registered (no `authenticateToken`) |

---

## Environment Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `MONGO_URI` | MongoDB Atlas connection string | Contains credentials — never commit |
| `JWT_SECRET` | JWT signing secret | Use a strong, random value in prod |
| `GEMINI_API_KEY` | Google Gemini AI key | Never commit |
| `CEREBRAS_API_KEY` | Cerebras AI key | Never commit |
| `GROQ_API_KEY` | Groq AI key (commented out) | Never commit |
| `DATABASE_URL` | PostgreSQL URL (legacy, unused) | Should be removed |
| `PORT` | Backend server port (default: 3002) | Optional |

---

## Secrets Management

- All secrets in `.env` at repo root
- `.gitignore` should exclude `.env` — verify this is enforced
- Production: use environment-level secrets injection (Docker secrets, cloud env vars)
- Frontend: `NEXT_PUBLIC_BACKEND_URL` is public (safe to expose); `BACKEND_URL` is server-side only

---

## Data Privacy

- User email is used as `userId` throughout — exposed in URL query params on frontend (`?userId=user@email.com`)
- This means emails are visible in browser history and logs — consider using opaque IDs in a future revision
- Trade data contains realistic-looking but synthetic financial data — no PII
