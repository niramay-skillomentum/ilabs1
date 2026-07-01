content: # Deployment

> Last updated: 2026-06-27

---

## Local Development

### Prerequisites

- Node.js v18+
- npm v8+
- MongoDB Atlas account (or a local MongoDB v6+ instance)
- `.env` file at the project root (copy from `.env.example`)
- `.env.local` file in `frontend/` for frontend-specific variables

### Backend (root directory)

```bash
# Install dependencies
npm install

# Start in dev mode (nodemon — auto-restarts on file changes)
npm run dev

# Start in production mode (no hot reload)
npm start

# Run backend tests
npm run test:backend
```

Runs on: `http://localhost:3002`

The backend starts with:
1. `JWT_SECRET` validation (exits if missing)
2. MongoDB Atlas connection via `MONGO_URI`
3. Agenda scheduler initialization
4. Socket.io initialization
5. All 4 background intervals (CPTY replies, FO replies, FO internal, trade cache)

### Frontend (`/frontend` directory)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (Webpack mode — Turbopack explicitly disabled)
npm run dev

# Build production bundle
npm run build

# Serve production build
npm start

# Run frontend tests
npm test
```

Runs on: `http://localhost:3000`

> **Note**: `npm run dev` uses `next dev --webpack` (not Turbopack). This is intentional for Windows compatibility. Do not change to `next dev` without testing on all target platforms.

---

## Environment Variables

### Backend — `.env` (at project root)

```env
# MongoDB Atlas connection string (required)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?ssl=true&replicaSet=atlas-...

# JWT signing secret — use a strong random 64+ char string in production (required)
JWT_SECRET=your_strong_random_secret_here

# AI Provider Keys
GEMINI_API_KEY=your_gemini_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
# GROQ_API_KEY=your_groq_api_key  # Optional — not in active LLM chain

# Socket.io allowed origins (comma-separated, default: http://localhost:3000)
ALLOWED_ORIGINS=http://localhost:3000

# Backend port (default: 3002)
PORT=3002
```

> **Critical**: `MONGO_URI` and `JWT_SECRET` are required at startup. The server will not start without `JWT_SECRET`.

### Frontend — `frontend/.env.local`

```env
# Backend URL for Next.js rewrites and socket connection (default: http://localhost:3002)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
BACKEND_URL=http://localhost:3002
```

`NEXT_PUBLIC_BACKEND_URL` is exposed to the browser (used in socket.io client URL). `BACKEND_URL` is server-side only (used in `next.config.mjs` rewrites).

---

## Docker Deployment

### Quick Start

```bash
# From project root — builds and starts both services
docker-compose up --build

# Run in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Services in `docker-compose.yml`

| Service | Dockerfile | Port | Description |
|---------|-----------|------|-------------|
| `backend` | `./Dockerfile` | 3002 | Express + Socket.io server |
| `frontend` | `./frontend/Dockerfile` | 3000 | Next.js production server |

### Passing Environment Variables to Docker

Option 1 — `docker-compose.yml` `env_file` directive:
```yaml
services:
  backend:
    env_file: .env
  frontend:
    env_file: frontend/.env.local
```

Option 2 — Docker secrets (for production):
```bash
docker secret create JWT_SECRET ./jwt_secret.txt
```

> **Never bake secrets into Docker images**. Use `ARG` only for build-time non-secrets; use `ENV` via runtime injection for all credentials.

---

## Database Initialization

Mongoose creates all collections automatically on first write. No migration scripts are required for a fresh install.

### Utility Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `checkDB.js` | `node checkDB.js` | Verify MongoDB Atlas connection + print status |
| `migrateDB.js` | `node migrateDB.js` | Run schema migrations (for field additions to existing docs) |
| `cleanDB.js` | `node cleanDB.js` | Wipe `trades` and `queues` collections (dev reset — irreversible) |

### DB Pool Seeding

The trade pool starts empty. As users generate queues, the `queueComposer` will generate all 20 trades fresh. Over time, as sessions expire, trades return to the pool (unassigned) and future sessions reuse them via the graduated allocation formula.

To pre-seed a pool manually (e.g., for testing):
```bash
node -e "
const { generateTrades, saveGeneratedTrades } = require('./src/engine/tradeGenerator');
const { connectDB } = require('./src/db');
require('dotenv').config();
connectDB().then(async () => {
  const trades = generateTrades(12, 8, 'MO');
  await saveGeneratedTrades(trades);
  console.log('Seeded 20 trades');
  process.exit(0);
});
"
```

---

## Production Checklist

Security:
- [ ] `JWT_SECRET` set to a cryptographically random 64+ char string
- [ ] `ALLOWED_ORIGINS` set to production frontend URL (e.g., `https://app.yourdomain.com`)
- [ ] `NODE_ENV=production` in backend environment
- [ ] `Secure` flag added to `auth_token` cookie in `src/routes/authRoutes.js` (when `NODE_ENV === "production"`)
- [ ] HTTPS configured (TLS termination at nginx or cloud load balancer)
- [ ] `.env` NOT committed to Git — verify `.gitignore` includes `.env`
- [ ] MongoDB Atlas network access restricted to production server IPs

Frontend:
- [ ] `NEXT_PUBLIC_BACKEND_URL` set to production backend URL
- [ ] `npm run build` succeeds without errors
- [ ] `next start` used (not `next dev`)

Database:
- [ ] MongoDB Atlas cluster tier appropriate for expected load
- [ ] Atlas backup enabled
- [ ] DB user has least-privilege access (read/write on `ilabs1` db only)

Infrastructure:
- [ ] Docker images built from production branch
- [ ] Health check endpoint (`GET /health`) — see `TODO.md`
- [ ] Process manager (PM2 or systemd) for non-Docker deployments
- [ ] Log aggregation configured

---

## Scaling Considerations

The application is currently **single-instance**:

| Component | Scale Limit | Fix |
|-----------|------------|-----|
| `pendingReplies[]` (in-memory) | Lost on restart; not shared between instances | Migrate to MongoDB + Agenda jobs |
| `_cachedTrades` (in-memory) | Not shared between instances | Redis cache or DB-direct lookups |
| Socket.io | Single-process only | Add `socket.io-redis` adapter for multi-instance |
| MongoDB Atlas | Auto-scales via cluster tier | Upgrade Atlas tier as needed |

For horizontal scaling (multiple backend instances), all three points above must be addressed before deploying more than one backend replica.
 file_path: /workspace/ilabs1/ai/DEPLOYMENT.md