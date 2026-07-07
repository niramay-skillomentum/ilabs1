# Deployment

> Deployment configuration, environment setup, and operational procedures.

---

## 1. Environment Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | LTS recommended |
| **MongoDB** | 6.0+ | 7.0 recommended |
| **Docker** | 20+ | For containerized deployment |
| **Docker Compose** | 2.0+ | For multi-container orchestration |

---

## 2. Local Development Setup

### 2.1 Backend

```bash
# Clone the repository
git clone <repo-url>
cd ilabs1

# Install dependencies
npm install

# Create .env from example
cp .env.example .env
# Edit .env with your values (MONGO_URI, JWT_SECRET, API keys)

# Start backend (development with auto-reload)
npm run dev
# Server runs on http://localhost:3002
```

### 2.2 Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3002" > .env.local

# Start frontend (development)
npm run dev
# App runs on http://localhost:3000
```

### 2.3 MongoDB

**Option A: Local installation**
```bash
# Install MongoDB locally
# Ensure it's running on localhost:27017
# Update MONGO_URI in .env to mongodb://localhost:27017/ilabs
```

**Option B: Docker**
```bash
# Start just MongoDB
docker run -d --name sgbsim_mongodb -p 27017:27017 mongo:latest
```

---

## 3. Docker Compose Deployment

### 3.1 Full Stack

```bash
# From project root
docker-compose up -d

# Services:
# - MongoDB:   localhost:27017
# - Backend:  localhost:3002
# - Frontend: localhost:3001
```

### 3.2 Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:latest
    container_name: sgbsim_mongodb
    ports: ["27017:27017"]
    volumes: [mongodb_data:/data/db]
    restart: unless-stopped

  backend:
    build: .
    container_name: sgbsim_backend
    ports: ["3002:3002"]
    environment:
      - PORT=3002
      - MONGO_URI=mongodb://mongodb:27017/ilabs
      - JWT_SECRET=CHANGE_ME_IN_PRODUCTION
      - NODE_ENV=production
    depends_on: [mongodb]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    container_name: sgbsim_frontend
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=production
      - PORT=3001
      - BACKEND_URL=http://backend:3002
    depends_on: [backend]
    restart: unless-stopped

volumes:
  mongodb_data:
```

### 3.3 Dockerfiles

**Backend Dockerfile** (create if not exists):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["node", "server.js"]
```

**Frontend Dockerfile** (create if not exists):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
CMD ["node", "server.js"]
```

---

## 4. Environment Variables

### 4.1 Required Variables

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `MONGO_URI` | Backend `.env` | ✅ | MongoDB connection string |
| `JWT_SECRET` | Backend `.env` | ✅ | JWT signing secret (validated at startup) |
| `PORT` | Backend `.env` | ❌ | Server port (default: 3002) |

### 4.2 AI Provider Variables (at least one required)

| Variable | Provider |
|----------|----------|
| `GEMINI_API_KEY` | Google Gemini |
| `OPENROUTER_API_KEY` | OpenRouter |
| `CEREBRAS_API_KEY` | Cerebras |
| `GROQ_API_KEY` | Groq |

### 4.3 Optional Variables

| Variable | Location | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | Backend `.env` | `*` | CORS allowed origins |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend `.env.local` | `http://localhost:3002` | Backend URL for Socket.io + API |
| `BACKEND_URL` | Frontend `.env.local` | `http://localhost:3002` | Backend URL for server-side rewrites |
| `NODE_ENV` | Both | `development` | Environment mode |

---

## 5. Startup Sequence

1. MongoDB starts and accepts connections
2. Backend starts:
   - Loads `.env` configuration
   - Validates `JWT_SECRET` (exits if missing)
   - Connects to MongoDB
   - Starts Agenda job scheduler
   - Creates HTTP server
   - Initializes Socket.io
   - Starts background processors (2s, 3s intervals)
   - Listens on configured port
3. Frontend starts:
   - Builds Next.js application
   - Configures API rewrites to backend
   - Serves on configured port

---

## 6. Health Checks

| Service | Check Method | Expected Response |
|---------|--------------|-------------------|
| Backend | `GET http://localhost:3002/api/session/info` | 401 (requires auth) or 200 |
| Frontend | `GET http://localhost:3000` | HTML page |
| MongoDB | `mongosh --eval "db.runCommand({ ping: 1 })"` | `{ ok: 1 }` |

---

## 7. Shutdown

- Background processors use `setInterval` — they stop when the Node.js process exits
- Socket.io connections are cleaned up on server shutdown
- No graceful shutdown handler implemented yet

> **TODO**: Add process signal handlers (`SIGTERM`, `SIGINT`) for graceful shutdown.

---

## 8. Production Considerations

| Concern | Recommendation |
|---------|---------------|
| **HTTPS** | Add nginx/Caddy reverse proxy with SSL certificates |
| **Domain** | Configure `ALLOWED_ORIGINS` to actual domain |
| **Secrets** | Use Docker secrets or vault (not .env in production) |
| **Database** | Use MongoDB Atlas or replica set for HA |
| **Logging** | Add Winston/Pino structured logging |
| **Monitoring** | Add APM (Datadog, New Relic, or similar) |
| **Backup** | MongoDB automated backups |
| **Scaling** | Use Redis for Socket.io adapter if multi-node |
