# 19 · Performance Analysis

[← 18 Unused & Dead Code](18_Unused_And_Dead_Code.md) | [INDEX](INDEX.md) | Next: [20 Security →](20_Security_Analysis.md)

---

Observations on hotspots and optimization opportunities. Severity: 🔴 notable · 🟠 moderate · 🟢 minor.

## 19.1 Backend — polling & interval load

| Area | Detail | Impact |
|---|---|---|
| 🔴 Full-collection scan every 2s | Cache refresh in `server.js` runs `Trade.find({ assignedTo: { $ne: null } }).lean()` **every 2 seconds**, unconditionally, regardless of activity. | With many assigned trades this is a constant DB read load. Consider event-driven cache invalidation or a longer interval. |
| 🟠 Four 3s processors always running | `processReplies`, `processFOReplies`, `processFOInternalReplies`, `processJobs` each query `PendingReply`/`SystemJob` every 3s even when idle. | Small queries but constant; acceptable at low scale, wasteful at rest. |
| 🟠 `daily-age-update` every minute | Loads **all** trades (`Trade.find({}).lean()`) and diffs `age` each minute (misnamed job). | O(all trades) per minute; should be truly daily or age-on-read. |
| 🟢 Clock tick every 1s | Emits a global `clock_tick` broadcast. | Fine; but see socket fan-out below. |

## 19.2 Backend — query patterns

| Issue | Where | Suggestion |
|---|---|---|
| 🟠 `GET /api/trade/all` returns every trade | tradeRoutes | Unbounded; no pagination. Fine for demo, not for scale. Add filters/pagination + user scoping. |
| 🟠 Random reply selection re-queries each tick | communicationEngine | `find({sendAt:{$lte:now}})` then random pick + delete. Under load, prefer `findOneAndDelete` with sort to atomically claim. |
| 🟢 Conversation `shared`/`personal` N+1-ish | conversationRoutes | Iterates queues/trades and calls `getConversation` per ref, then bulk-resolves trades. Reasonable but could aggregate. |
| 🟢 Indexes present | models | Good coverage on `tradeRef`, `assignedTo`, `userId`, `sendAt`, `isActive`. |

## 19.3 External API latency & rate limits

| Item | Detail |
|---|---|
| 🔴 Gemini 4s client throttle | `llmService` enforces `MIN_DELAY_MS = 4000` between calls (free-tier 15 req/min). This **serializes** all CPTY/FO AI replies globally — a single bottleneck. Under many concurrent trainees, replies queue behind this throttle. |
| 🟠 Gemini retry backoff | 3 retries, 15s→30s→60s on 429/503. A rate-limited burst can add up to ~105s latency before offline fallback. |
| 🟢 Offline fallback | Deterministic templates return instantly, cushioning LLM outages. |
| 🟠 Tutor no caching | Each tutor message re-reads `docs/skb/*.md` from disk (`readFileSync`) and sends up to 2000 max_tokens. Cache the SKB in memory. |

## 19.4 Frontend — rendering & network

| Item | Detail |
|---|---|
| 🔴 Large components | `workstation/page.js` (728 lines) and `communication/page.js` (647 lines) are monolithic single-component pages holding ~15–20 `useState` each; every state change re-renders the whole page (incl. the trade table). Consider splitting + `memo`. |
| 🟠 Redundant refresh | Workstation refreshes the queue on **both** the socket `trade_update`/`new_email` and its own 15s poll, and immediately from the action response — the same data can be fetched 2–3× per action. |
| 🟠 Polling always on | Communication polls every 5s and Workstation every 15s regardless of socket health. Could pause polling while the socket is connected. |
| 🟢 Dedup guard | Communication uses `lastRenderedInboxDataStr` to skip re-render when fetched JSON is unchanged — a good optimization to emulate elsewhere. |
| 🟢 CSV export client-side | `downloadCSV` builds the file in-browser (no server round-trip). |

## 19.5 Real-time fan-out

| Item | Detail |
|---|---|
| 🟠 `new_email` global broadcast | Emitted via `io.emit` to **all** clients (not room-scoped), each of which then re-fetches. With N trainees, one email triggers N refetches. Scope emits to `user_<userId>` / `desk_<desk>` rooms (which already exist). |
| 🟢 `trade_update` is room-scoped | Correctly targets `user_<userId>`. |

## 19.6 Memory

| Item | Detail |
|---|---|
| 🟠 In-memory recon state | `reconciliation.js` accumulates `ledger/statements/matches` arrays with no eviction (if it were wired up). Unbounded growth risk. |
| 🟢 Template anti-repeat map | `recentTemplates` keeps only last-3 per trade; bounded. |
| 🟢 Trade cache bounded | `_cachedTrades` rebuilt (replaced) each cycle, so no leak. |

## 19.7 Optimization checklist (prioritized)

1. **Replace the 2s full-collection cache refresh** with targeted/event-driven updates.
2. **Scope `new_email`** to the relevant user/desk room instead of global broadcast.
3. **Cache the tutor SKB** in memory instead of `readFileSync` per request.
4. **Split the two mega-pages** and memoize the trade table.
5. **Pause frontend polling** while the socket is healthy.
6. **Paginate `GET /api/trade/all`** and scope by user.
7. Revisit the global 4s Gemini throttle for multi-tenant load (per-key queue vs global).

> All items are analysis only; no code was changed.

---
[← 18 Unused & Dead Code](18_Unused_And_Dead_Code.md) | [INDEX](INDEX.md) | Next: [20 Security →](20_Security_Analysis.md)
