# GROUND TRUTH — Build, Deploy, Config, Tests, Scripts

## Run
- Backend: `npm start` (node server.js) / `npm run dev` (nodemon). Port 3002. Needs MONGO_URI (memory-only fallback), JWT_SECRET (required, no fallback).
- Frontend: `cd frontend && npm run dev` (next dev --webpack, port 3000) / `npm run build` / `npm start` / `npm run lint`.
- Node 22 (Dockerfiles node:22-alpine); CI uses Node 20.x.

## Docker
- Root Dockerfile (backend): node:22-alpine, `npm install --omit=dev`, copy src, EXPOSE 3002, `node server.js`.
- frontend/Dockerfile: multi-stage (builder installs + `npm run build` → .next/standalone; runner copies next.config.mjs, public, .next/standalone, .next/static), port 3001, `node server.js`.
- docker-compose.yml services:
  - mongodb: mongo:latest, port 27017, volume mongodb_data:/data/db
  - backend: build ., port 3002, env PORT=3002, MONGO_URI=mongodb://mongodb:27017/ilabs, JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_CHANGE_ME, NODE_ENV=production, depends_on mongodb
  - frontend: build ./frontend, port 3001, env NODE_ENV=production, PORT=3001, BACKEND_URL=http://backend:3002, depends_on backend
  - restart: unless-stopped; named volume mongodb_data.
- .dockerignore excludes node_modules, .next, .git, .env, .github, tests, README.md, Dockerfile, docker-compose.yml.

## CI (.github/workflows/ci.yml)
- Triggers: push to main OR PR to main.
- Jobs: test-backend (Node 20, `npm install`, `npm run test:backend`), test-frontend (Node 20, cwd ./frontend, `npm install`, `npm test`), build-docker (needs both, `docker-compose build`).

## Environment variables
| Key | Purpose | Required | Default |
|---|---|---|---|
| MONGO_URI | MongoDB connection | Yes (else memory-only) | — |
| JWT_SECRET | JWT signing | Yes (exits if missing) | — |
| GEMINI_API_KEY | Gemini (primary LLM, CPTY/FO) | No | — |
| OPENROUTER_API_KEY | OpenRouter/Nemotron (tutor) | No (tutorAI throws if used w/o) | — |
| CEREBRAS_API_KEY | Cerebras fallback | No | — |
| GROQ_API_KEY | Groq (currently unused) | No | — |
| PORT | Backend port | No | 3002 |
| NODE_ENV | environment | No | — |
| ALLOWED_ORIGINS | Socket.io CORS whitelist (comma-sep) | No | http://localhost:3000 |
| NEXT_PUBLIC_BACKEND_URL | Frontend→backend URL | No | http://localhost:3002 |

## Utility scripts (run `node <name>.js` from root)
- checkDB.js — connect Mongo, dump Conversations as JSON.
- cleanDB.js — delete all docs from Conversation, Trade, Queue, User, UserScore, AuditLog.
- migrateDB.js — set Conversation.desks=["MO"] where missing.
- seedConfig.js — upsert SystemConfig SETTLEMENT_INITIAL_STATE=SETTLEMENT_PENDING.
- cleanup-test.js — delete Queues/Trades/AuditLogs/Conversations for users matching ^testuser (batches of 500).
- load-test.js — 100 JWTs, concurrent POST /api/queue/generate, latency stats.
- test-route.js — POST /api/chat/tutor with 50KB context (needs running backend at :3002).
- test-tutor.js — calls generateTutorResponse() directly.
- root llmService.js — NOT a script; shared Gemini module (generateResponse), 1 req/4s, 5 retries.

## Tests
- Backend (`npm run test:backend`, Jest+Supertest): tests/backend/auth.test.js (register/login, dup email, bad password; mocks User+bcrypt); tests/backend/tradeActions.test.js (POST trade action state-transition guards; mocks Trade).
- Frontend (`cd frontend && npm test`, Jest+RTL, jsdom): __tests__/page.test.js (login renders), __tests__/Workstation.test.js (workstation renders MO header + Generate Test Queue). Mocks next/navigation, auth lib, socket.io-client, fetch.
- Gaps: no tests for lifecycle/settlement/recon/queue-gen/LLM/socket/middleware; no E2E.

## STALE ARTIFACTS (must be corrected/removed in docs)
- **Directory.txt**: claims Prisma (`prisma/`, schema.prisma, migrations, prisma.config.ts), a `Public/` folder of static HTML (dashboard.html, index.html, mo-risk.html, workstation.html), and only `uiRoutes.js`. NONE of this exists. Reality: Mongoose models in src/models, Next.js frontend in /frontend, 11 route files. → These files are outdated; do not treat as truth.
- **project_tree.txt**: closer but stale (says tradeActions.test.js absent — it exists; omits root scripts).
