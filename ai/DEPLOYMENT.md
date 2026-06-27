# Deployment

## Local Development

### Prerequisites
- Node.js (v18+)
- npm
- MongoDB Atlas account OR local MongoDB instance
- `.env` file at project root (see Environment Variables)

### Backend (Root)
```bash
# Install dependencies
npm install

# Start in dev mode (nodemon, hot reload)
npm run dev

# Start in production mode
npm start

# Run backend tests
npm run test:backend
```
Runs on: `http://localhost:3002`

### Frontend (`/frontend`)
```bash
cd frontend

# Install dependencies
npm install

# Start dev server (Webpack mode — Turbopack disabled for Windows)
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```
Runs on: `http://localhost:3000`

---

## Environment Variables

Create `.env` at the project root with these values:

```env
# MongoDB Atlas connection string (required)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?ssl=true&replicaSet=...

# JWT secret — use a strong random string in production
JWT_SECRET=your_strong_random_secret_here

# AI Provider Keys
GEMINI_API_KEY=your_gemini_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
# GROQ_API_KEY=your_groq_key  (optional, currently unused)

# Server port (optional, default: 3002)
PORT=3002
```

For the frontend (create `.env.local` inside `/frontend`):
```env
# Optional: override backend URL (default: http://localhost:3002)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

---

## Docker Deployment

### Build and Run (docker-compose)
```bash
# From project root
docker-compose up --build
```

### Services in docker-compose.yml
- `backend` — Express server (port 3002)
- `frontend` — Next.js server (port 3000)

### Backend Dockerfile (root `Dockerfile`)
```dockerfile
# (Current — minimal Node.js image, copies source, npm install, node server.js)
```

### Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# (Current — Next.js build + serve)
```

**Note**: Ensure `.env` is injected at runtime (not baked into image) — use Docker env files or secrets.

---

## Database Initialization

No migration scripts are required — Mongoose creates collections on first write.

Utility scripts at root:
- `checkDB.js` — verify MongoDB connection
- `migrateDB.js` — run schema migrations if needed
- `cleanDB.js` — wipe and reset trade/queue data

```bash
# Check DB connection
node checkDB.js

# Clean the DB (reset trades + queues)
node cleanDB.js
```

---

## Production Checklist

Before deploying to production:

- [ ] Replace `.env` dev values with production secrets
- [ ] Remove hardcoded JWT fallback in `auth.js`
- [ ] Add `HttpOnly; Secure` to cookie in `authRoutes.js`
- [ ] Restrict Socket.io CORS origin
- [ ] Add `express-rate-limit` to auth routes
- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure HTTPS (TLS termination via nginx or cloud load balancer)
- [ ] Ensure `.env` is NOT committed to Git
- [ ] Update `NEXT_PUBLIC_BACKEND_URL` to production backend URL

---

## Scaling Considerations

- The app is currently **single-instance** — in-memory state (pending reply queues, trade cache) is not shared across multiple instances
- To scale horizontally: migrate pending reply queues to MongoDB/Redis; use Socket.io Redis adapter for multi-instance WebSocket coordination
- MongoDB Atlas auto-scales horizontally via Atlas cluster tier

---

## CI/CD

- `.github/` directory exists — no confirmed workflows
- Recommended: GitHub Actions pipeline
  - On push to `main`: run tests → build Docker images → push to registry → deploy
