# Security

> Security architecture, measures, and guidelines for the SGB Operations Simulator.

---

## 1. Authentication

### 1.1 JWT-Based Authentication

| Aspect | Implementation |
|--------|---------------|
| **Token type** | JSON Web Token (HS256) |
| **Signing secret** | `JWT_SECRET` environment variable |
| **Token payload** | `{ userId, fullName }` |
| **Token storage (client)** | `sessionStorage.auth_token` |
| **Token storage (cookie)** | Cookie `auth_token` with `Secure` flag in production |
| **Token delivery** | `Authorization: Bearer <token>` header |
| **Fallback** | Cookie-based token extraction from `req.headers.cookie` |

### 1.2 Password Security

| Aspect | Implementation |
|--------|---------------|
| **Hashing** | bcryptjs (bcrypt compatible) |
| **Salt rounds** | Default (10 rounds) |
| **Storage** | Hash only — plaintext never stored |
| **Registration** | Password validated server-side |

### 1.3 Session Management

| Aspect | Implementation |
|--------|---------------|
| **Session duration** | 3 hours (hardcoded) |
| **Session expiry** | Auto-logout when timer reaches 0 |
| **Session resume** | If token valid and queue active, resume previous session |
| **Logout** | Clears sessionStorage, calls `POST /api/session/logout` |

### 1.4 Socket.io Authentication

```javascript
// Client connects with token
const socket = io(url, { auth: { token: getToken() } });

// Server validates on connection
socket.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // JWT verification
});
```

---

## 2. Authorization

| Layer | Implementation |
|--------|---------------|
| **Route protection** | `authenticateToken` middleware on all routes except `/auth/login` and `/auth/register` |
| **Desk isolation** | Each desk sees only its relevant queue and conversations |
| **User isolation** | Queues are user-specific (`userId` unique index) |
| **Socket rooms** | Users join desk-specific rooms (`join_desk`) |

---

## 3. Input Validation

| Area | Implementation |
|------|---------------|
| **API inputs** | Route-level validation before processing |
| **Trade actions** | State machine validates transitions before execution |
| **Registration** | Email format, password strength, required fields |
| **Missing fields** | 400 Bad Request returned |
| **Invalid transitions** | Descriptive error messages returned |

---

## 4. XSS Prevention

| Measure | Implementation |
|---------|---------------|
| **Email sanitization** | `sanitize-html` library on email bodies before storage/rendering |
| **React JSX** | Auto-escaping by default (React handles this) |
| **DangerouslySetInnerHTML** | Used in dashboard/workstation for inline styles — **review needed** |

---

## 5. CSRF Protection

| Aspect | Status |
|--------|--------|
| **CSRF tokens** | Not implemented |
| **SameSite cookies** | Not configured |
| **Risk assessment** | Low — API uses JWT Bearer tokens (not cookies) for primary auth |

> **Note**: The cookie-based fallback for JWT (in `authenticateToken` middleware) could be a CSRF vector. Consider adding CSRF tokens if cookie auth is used in production.

---

## 6. Rate Limiting

| Aspect | Implementation |
|--------|---------------|
| **Library** | `express-rate-limit` |
| **Configuration** | Applied at route level |
| **Scope** | Per-IP rate limiting |

---

## 7. CORS Configuration

| Aspect | Implementation |
|--------|---------------|
| **Library** | `cors` middleware |
| **Configuration** | Default: allows all origins in development |
| **Production** | Should restrict to `ALLOWED_ORIGINS` environment variable |

> **⚠️ TODO**: CORS is currently wide-open (`app.use(cors())`). Restrict in production.

---

## 8. Secrets Management

| Secret | Storage | Notes |
|--------|---------|-------|
| `JWT_SECRET` | `.env` file | **Critical** — validated at startup |
| `MONGO_URI` | `.env` file | Database connection string |
| `GEMINI_API_KEY` | `.env` file | Google Gemini API |
| `OPENROUTER_API_KEY` | `.env` file | OpenRouter API |
| `CEREBRAS_API_KEY` | `.env` file | Cerebras API |
| `GROQ_API_KEY` | `.env` file | Groq API |
| `PORT` | `.env` file | Server port |
| `ALLOWED_ORIGINS` | `.env` file | CORS whitelist |

**Rules:**
- `.env` files are **never committed** to git
- `.env.example` documents all required variables
- No secrets in source code
- No secrets in logs

---

## 9. Transport Security

| Aspect | Current | Recommendation |
|--------|---------|---------------|
| **HTTP** | Used in development | Acceptable for local dev |
| **HTTPS** | Not configured | **Required for production** |
| **WebSocket (WSS)** | Not configured | **Required for production** |
| **Cookie Secure flag** | Set in production | ✅ Good |

---

## 10. Data Exposure Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| JWT secret in .env | Medium | Strong random secret, never commit |
| Wide-open CORS | High | Restrict `ALLOWED_ORIGINS` in production |
| No HTTPS | High | Use reverse proxy (nginx) with SSL in production |
| Inline styles with dangerouslySetInnerHTML | Low | Review and sanitize |
| MONGO_URI in .env | Medium | Use connection string with limited permissions |
| LLM API keys in .env | Medium | Use API key restrictions where possible |

---

## 11. Security Remediation Priorities

| Priority | Item | Action |
|----------|------|--------|
| 🔴 P0 | CORS wide open | Restrict to `ALLOWED_ORIGINS` |
| 🔴 P0 | No HTTPS in production | Add nginx reverse proxy with SSL |
| 🟡 P1 | CSRF on cookie fallback | Add CSRF token if cookie auth is used |
| 🟡 P1 | Rate limit configuration | Define specific limits per endpoint |
| 🟢 P2 | Security headers | Add Helmet.js for security headers |
| 🟢 P2 | Input validation library | Add Joi/Zod for schema validation |
| 🟢 P2 | Audit logging | Log all auth events and failed attempts |
