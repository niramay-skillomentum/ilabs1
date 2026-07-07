# Performance

> Performance characteristics, bottlenecks, and optimization strategies.

---

## 1. Backend Performance

### 1.1 Background Processors (Intervals)

| Interval | Processor | Impact |
|----------|-----------|--------|
| 2s | Cache refresh (reloads assigned trades) | **High** — DB query every 2s |
| 3s | Communication reply processor | Medium — depends on pending replies |
| 3s | FO reply processor | Medium — depends on pending replies |
| 3s | FO internal channel processor | Low — depends on escalations |
| 3s | System workflow processor | Low — depends on pending jobs |

> **⚠️**: The 2-second cache refresh performs a `Trade.find({ assignedTo: { $ne: null } }).lean()` query continuously. This is the most frequent DB operation.

### 1.2 Query Patterns

| Pattern | Frequency | Notes |
|---------|----------|-------|
| `Trade.find({ assignedTo: { $ne: null } })` | Every 2s | Cache refresh |
| `Queue.findOne({ userId })` | Per queue load | Indexed |
| `Trade.updateOne({ tradeRef })` | Per action | Indexed |
| `Conversation.findOneAndUpdate()` | Per email send | TradeRef indexed |
| `SystemJob.findOneAndUpdate()` | Per job process | Status-based query |

### 1.3 External API Latency

| API | Use Case | Latency Impact |
|-----|----------|---------------|
| Google Gemini | CPTY AI, FO AI, Tutor | **High** — 1-5s per response |
| OpenRouter | Fallback LLM | High — similar to Gemini |
| Cerebras | Alternative LLM | Medium |
| Groq | Alternative LLM | Medium |

> LLM calls block the reply processor until complete or timeout. Offline fallback ensures guaranteed response.

---

## 2. Frontend Performance

### 2.1 Rendering

| Page | Complexity | Notes |
|------|-----------|-------|
| Login | Low | Simple form |
| Dashboard | Low | Static buttons |
| Workstation | **High** | 728 lines, multiple state variables, socket + polling |
| Communication | **High** | 647 lines, 3-panel layout, socket + polling |
| MO Risk | Medium | Two-panel layout |
| SSI Database | Low | Simple form + results |

### 2.2 Polling Intervals

| Page | Interval | Trigger |
|------|----------|---------|
| Workstation | 15s | Queue refresh fallback |
| Communication | 5s | Inbox refresh fallback |

### 2.3 Bundle Size

| Dependency | Purpose | Size Impact |
|-----------|---------|-------------|
| `socket.io-client` | Real-time | Medium (~30KB gzipped) |
| `react-markdown` | AI Tutor rendering | Medium |
| `react-hot-toast` | Toast notifications | Small |
| `@tailwindcss/typography` | Prose styling | Small (CSS only) |

---

## 3. Real-Time Performance

### 3.1 Socket.io

| Aspect | Detail |
|--------|--------|
| **Transport** | WebSocket with polling fallback |
| **Rooms** | Per-desk rooms |
| **Events/s** | Low — typically < 1 event per second |
| **Broadcast pattern** | Room-based (`io.to(desk).emit()` |

### 3.2 Fan-out Concerns

- Each desk room receives updates for ALL trades in that desk
- With many users per desk, fan-out is proportional to user count
- Currently single-server — no horizontal scaling

---

## 4. Memory Usage

### 4.1 Backend In-Memory State

| Store | Size Estimate | Risk |
|-------|---------------|------|
| `_cachedTrades` | N assigned trades (~1KB each) | **Medium** — grows with active trades |
| Socket connections | ~1KB per connection | Low |
| LLM response cache | Varies | Low |

### 4.2 Frontend State

| Page | State Variables | Concern |
|------|----------------|---------|
| Workstation | ~15 useState, ~5 useRef | **Medium** — large component |
| Communication | ~20 useState, ~5 useRef | **High** — should consider decomposition |

---

## 5. Optimization Opportunities

| Priority | Optimization | Expected Impact |
|----------|-------------|-----------------|
| 🔴 P0 | Reduce cache refresh to 10s or use change streams | **High** — reduces DB load by 80% |
| 🔴 P0 | Replace polling with Socket.io events | **High** — reduces unnecessary requests |
| 🟡 P1 | Debounce queue refresh on `trade_update` socket event | **Medium** — prevents rapid re-renders |
| 🟡 P1 | Virtual scrolling for large trade queues | **Medium** — improves DOM performance |
| 🟡 P1 | Split Workstation page into smaller components | **Medium** — improves maintainability and re-render scope |
| 🟢 P2 | Lazy load AI Tutor (dynamic import) | **Low** — reduces initial bundle |
| 🟢 P2 | Memoize expensive computations in workstation | **Low** — reduces render cost |
| 🟢 P2 | Add React DevTools profiling to identify bottlenecks | **Diagnostic** |

---

## 6. Scalability Considerations

| Concern | Current | Recommendation |
|---------|---------|---------------|
| Single-server | Yes | Add horizontal scaling with sticky sessions |
| Socket.io scaling | Single node | Use Redis adapter for multi-node Socket.io |
| DB connections | Single pool | Add connection pooling config |
| LLM rate limits | Not handled | Add request queuing and rate limit awareness |
| File uploads | None | N/A |
