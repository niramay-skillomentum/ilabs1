# Current Progress

> Last updated: 2026-06-26

## ✅ Completed Features

### Backend
- [x] Express server with Socket.io integration
- [x] MongoDB Atlas connection with graceful fallback
- [x] JWT authentication (register + login)
- [x] Session management (3-hour sessions, expiry tracking)
- [x] Queue generation (20 trades per session: 12 clean + 8 breaks)
- [x] Graduated DB allocation with exponential decay formula
- [x] Trade action engine (all MO / CONFIRMATION / SETTLEMENT actions)
- [x] Trade lifecycle state machine
- [x] Amendment engine (create, attach, apply amendments)
- [x] Conversation engine (CPTY and FO email threads)
- [x] FO internal channel
- [x] CPTY AI response generation (Gemini → Cerebras fallback)
- [x] FO AI response generation
- [x] Offline/static response fallback when LLM unavailable
- [x] Audit logging (per trade, per action)
- [x] XML audit trail for auto-generated trades
- [x] Truth engine (MO break detection, confirmation break detection)
- [x] Age calculator
- [x] Simulation clock
- [x] Scoring engine (points + penalties)
- [x] Agenda job scheduler
- [x] Trade generator (with desk-specific truths and XML audit)
- [x] Background processors (CPTY replies, FO replies, FO internal replies - every 3s)
- [x] Trade cache refresh (every 2s, assigned trades)
- [x] Real-time WebSocket events (`trade_update`, `new_email`)
- [x] Docker support (Dockerfile + docker-compose)

### Frontend
- [x] Login/Register page (JWT + cookie auth)
- [x] Dashboard (desk selector)
- [x] Workstation (trade queue view, action panel, CSV export)
- [x] Communication page (email mailbox - CPTY & FO threads, compose, reply)
- [x] MO Risk / Termsheet viewer
- [x] Trade detail page (legacy)
- [x] Session timer (real-time countdown)
- [x] Simulation clock (client-side calculation)
- [x] Socket.io real-time updates
- [x] Background queue polling fallback (every 15s)
- [x] Auto-sync of selected trade with queue updates
- [x] Audit trail popup (XML + structured)
- [x] Truth viewer (debug: shows underlying truths)
- [x] CSV export of trade queue
- [x] Alerts at 1hr and 10min remaining

---

## 🚧 In Progress / Partial

- [ ] Scoring display in UI — engine exists but no dedicated scoring UI page
- [ ] Admin panel — no admin-level overview dashboard
- [ ] `uiRoutes.js` — legacy routes still in codebase but not actively used

---

## ❌ Not Yet Implemented

- [ ] Score leaderboard / results page
- [ ] Trainer/admin view (view all users, sessions, scores)
- [ ] Multi-desk simultaneous simulation
- [ ] Trade replay / review mode (post-session review)
- [ ] Password reset flow
- [ ] Email notification system (out-of-app)
- [ ] Test coverage — only 1 backend auth test exists (`tests/backend/auth.test.js`)
- [ ] Frontend tests — `frontend/__tests__/` directory exists but is empty
- [ ] Rate limiting on auth endpoints
- [ ] CI/CD pipeline (`.github/` exists but workflows unknown)

---

## Known Working State

As of 2026-06-26:
- Backend runs on `node server.js` at port 3002
- Frontend runs on `npm run dev --webpack` at port 3000 (Turbopack disabled — known Windows compatibility issue)
- MongoDB Atlas connection works with credentials in `.env`
- Full queue generation and trade lifecycle is functional
- Real-time socket updates working
- AI responses working (Gemini primary, Cerebras fallback)
