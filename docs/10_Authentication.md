# 10. Authentication & Authorization

SGB Operations Simulator uses stateless JSON Web Tokens (JWT) stored in HTTP-only cookies combined with `sessionStorage` for UX tracking.

## 1. Authentication Flow
1. User submits credentials to `/api/auth/login`.
2. Backend verifies via `bcrypt`.
3. Backend generates a JWT using `jwt.sign` with a secret `JWT_SECRET`. The token expires in 3 hours.
4. Backend sets a cookie: `auth_token=<token>; HttpOnly; Secure (if prod)`.
5. Backend also returns the token in the JSON body.
6. Frontend saves the token to `sessionStorage` (for Socket.io and explicit `Authorization` headers) and saves `userId` and `fullName` to `sessionStorage`.

## 2. Express Middleware (`src/middleware/auth.js`)
All protected API routes pass through the `authenticateToken` middleware.
- **Checks Header:** Looks for `Authorization: Bearer <token>`.
- **Checks Cookie:** If header is missing, looks for `auth_token` in cookies.
- **Verification:** Calls `jwt.verify(token, JWT_SECRET)`.
- **Injection:** If valid, attaches `req.user = user` and calls `next()`.
- **Failure:** Returns `401 Unauthorized` or `403 Forbidden`.

## 3. Socket.io Authentication
WebSockets are secured using middleware in `src/engine/socketEngine.js`.
- During connection (`io.use`), it extracts the token from `socket.handshake.auth.token` or the cookie.
- It verifies the JWT before allowing the connection.
- Attaches the decoded user to `socket.user`.

## 4. Frontend Route Protection
Because this is Next.js client-side rendering (SPA-like), route protection happens on component mount (`useEffect`).
- Validates that `sessionStorage.getItem("auth_token")` exists.
- If missing, redirects to `/` via `router.push()`.

## 5. Roles & Permissions
Currently, the system uses a flat permission structure. Any registered user can select any Desk (MO, Confirmation, Settlement) via the Dashboard.
- **Data Isolation:** `Queue` and `Trade.assignedTo` ensure users only see trades they have generated for their specific session. They cannot interfere with other users' queues.
