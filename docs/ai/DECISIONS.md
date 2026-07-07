# Decisions

> Architectural decisions, technical choices, and their rationale.

---

## 1. Technology Decisions

### AD-001: Express 5 over Express 4
| Aspect | Detail |
|--------|--------|
| **Decision** | Use Express 5.x |
| **Date** | Project inception |
| **Rationale** | Latest stable release, improved routing, async error handling |
| **Tradeoffs** | Some middleware may not be Express 5 compatible |
| **Status** | ✅ Active |

### AD-002: MongoDB + Mongoose over SQL
| Aspect | Detail |
|--------|--------|
| **Decision** | Use MongoDB with Mongoose ODM |
| **Date** | Project inception |
| **Rationale** | Document-based storage suits trade data with varying fields; embedded documents for truths; flexible schema for amendments |
| **Tradeoffs** | No ACID transactions (single-document atomicity only); no SQL joins (requires denormalization) |
| **Status** | ✅ Active |

### AD-003: Next.js 16 App Router over Pages Router
| Aspect | Detail |
|--------|--------|
| **Decision** | Use Next.js 16 with App Router |
| **Date** | Project inception |
| **Rationale** | Latest Next.js features; React Server Components support; modern conventions |
| **Tradeoffs** | All components are `"use client"` — RSC benefits not leveraged |
| **Status** | ✅ Active |

### AD-004: Socket.io + Polling Fallback
| Aspect | Detail |
|--------|--------|
| **Decision** | Socket.io for real-time with polling fallback |
| **Date** | Project inception |
| **Rationale** | Reliable real-time updates; automatic reconnection; polling as degradation path |
| **Tradeoffs** | Polling adds unnecessary load when Socket.io works; intervals run regardless |
| **Status** | ✅ Active, ⚠️ Polling should be removed when socket reliability is confirmed |

### AD-005: JWT over Session Cookies
| Aspect | Detail |
|--------|--------|
| **Decision** | JWT Bearer token as primary auth mechanism |
| **Date** | Project inception |
| **Rationale** | Stateless auth; works with Socket.io; no server-side session store needed |
| **Tradeoffs** | Token cannot be revoked server-side (until expiry); cookie fallback adds complexity |
| **Status** | ✅ Active |

---

## 2. Architecture Decisions

### AD-006: In-Memory Cache + 2s Refresh
| Aspect | Detail |
|--------|--------|
| **Decision** | Cache assigned trades in memory, refresh every 2 seconds |
| **Date** | During communication engine development |
| **Rationale** | Avoid DB query per reply processing; trades change infrequently |
| **Tradeoffs** | 2s staleness window; continuous DB load; memory grows with active trades |
| **Alternatives considered** | MongoDB change streams; event-driven cache invalidation |
| **Status** | ✅ Active, ⚠️ Should migrate to change streams or longer interval |

### AD-007: PendingReply Collection (MongoDB-backed LLM Queue)
| Aspect | Detail |
|--------|--------|
| **Decision** | Store LLM reply requests in MongoDB instead of in-memory queue |
| **Date** | Recent (resolved KI-007) |
| **Rationale** | Survives server restarts; no lost replies; persistent processing |
| **Tradeoffs** | Slightly slower than in-memory; requires DB writes for each reply |
| **Status** | ✅ Active |

### AD-008: setInterval Background Processors
| Aspect | Detail |
|--------|--------|
| **Decision** | Use setInterval for background tasks (2-3s intervals) |
| **Date** | Project inception |
| **Rationale** | Simple implementation; no external dependency needed |
| **Tradeoffs** | Not cron-accurate; continues running even with no work; no backpressure |
| **Alternatives considered** | BullMQ, Agenda (used for scheduled jobs), worker threads |
| **Status** | ✅ Active for reply processors; Agenda used for scheduled tasks |

### AD-009: Per-Page State (No Global State)
| Aspect | Detail |
|--------|--------|
| **Decision** | Each page manages its own state via useState/useRef |
| **Date** | Project inception |
| **Rationale** | Simple; no shared state complexity; pages are independent |
| **Tradeoffs** | Session data duplicated across pages; no shared auth context; repeated API calls |
| **Alternatives considered** | React Context, Zustand, Redux |
| **Status** | ✅ Active, ⚠️ Consider Context for shared session state |

### AD-010: Hybrid Styling (Tailwind + CSS + Inline)
| Aspect | Detail |
|--------|--------|
| **Decision** | Mix of Tailwind CSS, page-level CSS, and inline styles |
| **Date** | Evolved over time |
| **Rationale** | Legacy pages use inline/CSS; new pages use Tailwind |
| **Tradeoffs** | Inconsistent styling approach; harder to maintain |
| **Alternatives considered** | Full Tailwind migration; CSS Modules |
| **Status** | ⚠️ Active, 🔄 Migration to Tailwind planned |

---

## 3. AI/LLM Decisions

### AD-011: Multi-Provider LLM Strategy
| Aspect | Detail |
|--------|--------|
| **Decision** | Support Gemini, OpenRouter, Cerebras, Groq with unified service |
| **Date** | Project inception, expanded over time |
| **Rationale** | Provider redundancy; cost optimization; avoid single-vendor lock-in |
| **Tradeoffs** | Multiple API keys to manage; response format differences |
| **Status** | ✅ Active |

### AD-012: Offline Fallback Engine
| Aspect | Detail |
|--------|--------|
| **Decision** | Always guarantee AI response via offline fallback |
| **Date** | Project inception |
| **Rationale** | Simulator must work without LLM APIs (network issues, API limits, cost) |
| **Tradeoffs** | Offline responses are less realistic; no learning/adaptation |
| **Status** | ✅ Active |

---

## 4. Domain Decisions

### AD-013: Desk-Specific Truths
| Aspect | Detail |
|--------|--------|
| **Decision** | Each desk has its own "truth" values that may differ from visible data |
| **Date** | Project inception |
| **Rationale** | Simulates real-world data discrepancies between desks; enables break scenarios |
| **Tradeoffs** | Complex data model; truth comparisons per desk; generation logic per desk |
| **Status** | ✅ Active — fundamental to the simulation |

### AD-014: 3-Hour Session Duration
| Aspect | Detail |
|--------|--------|
| **Decision** | Sessions last exactly 3 hours |
| **Date** | Project inception |
| **Rationale** | Simulates a realistic work shift duration |
| **Tradeoffs** | Inflexible; no pause/resume beyond session window |
| **Status** | ✅ Active |
