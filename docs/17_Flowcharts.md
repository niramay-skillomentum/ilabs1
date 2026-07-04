# 17 · Flowcharts

[← 16 Sequence Diagrams](16_Sequence_Diagrams.md) | [INDEX](INDEX.md) | Next: [18 Unused & Dead Code →](18_Unused_And_Dead_Code.md)

---

## 17.1 Overall system architecture
See [02 §2.1](02_Architecture.md).

## 17.2 The trade lifecycle state machine (complete)

```mermaid
stateDiagram-v2
    [*] --> NEW
    NEW --> MO_PENDING
    MO_PENDING --> MO_BREAK_OPEN
    MO_PENDING --> CONFIRMATION_PENDING
    MO_BREAK_OPEN --> MO_PENDING
    MO_BREAK_OPEN --> PENDING_FO_RESPONSE
    PENDING_FO_RESPONSE --> MO_BREAK_OPEN
    PENDING_FO_RESPONSE --> MO_PENDING
    CONFIRMATION_PENDING --> SETTLEMENT_PENDING
    CONFIRMATION_PENDING --> CONFIRMATION_BREAK
    CONFIRMATION_PENDING --> LIASING_WITH_CPTY
    CONFIRMATION_PENDING --> LIASING_WITH_FO
    CONFIRMATION_BREAK --> LIASING_WITH_CPTY
    CONFIRMATION_BREAK --> LIASING_WITH_FO
    CONFIRMATION_BREAK --> CONFIRMATION_PENDING
    LIASING_WITH_FO --> CONFIRMATION_BREAK
    LIASING_WITH_FO --> CONFIRMATION_PENDING
    LIASING_WITH_FO --> LIASING_WITH_CPTY
    LIASING_WITH_CPTY --> CONFIRMATION_PENDING
    LIASING_WITH_CPTY --> CONFIRMATION_BREAK
    LIASING_WITH_CPTY --> SETTLEMENT_PENDING
    LIASING_WITH_CPTY --> SETTLEMENT_BREAK
    LIASING_WITH_CPTY --> LIASING_WITH_FO
    LIASING_WITH_CPTY --> PENDING_APPROVAL
    SETTLEMENT_PENDING --> SETTLEMENT_BREAK
    SETTLEMENT_PENDING --> LIASING_WITH_CPTY
    SETTLEMENT_BREAK --> LIASING_WITH_CPTY
    SETTLEMENT_BREAK --> SETTLEMENT_PENDING
    SETTLEMENT_BREAK --> PENDING_AMENDMENT
    PENDING_AMENDMENT --> AMENDED
    AMENDED --> PENDING_APPROVAL
    PENDING_APPROVAL --> SETTLED
    PENDING_APPROVAL --> SETTLEMENT_PENDING
    REJECTED_REVERIFY --> PENDING_AMENDMENT
    REJECTED_REVERIFY --> SETTLEMENT_PENDING
    SETTLED --> RECON_PENDING
    RECON_PENDING --> RECON_CLEARED
    RECON_PENDING --> UNMATCHED_BY_USER
    UNMATCHED_BY_USER --> RECON_PENDING
    RECON_CLEARED --> CLOSED
    CLOSED --> [*]
```

## 17.3 Frontend architecture

```mermaid
flowchart TD
  subgraph Next[Next.js client]
    LO[layout.js + Toaster]
    P1[page.js login] --> P2[dashboard]
    P2 --> P3[workstation]
    P3 --> P4[mo-risk]
    P3 --> P5[ssi-database]
    P3 --> P6[communication]
    P3 --> C1[InstructionPanel]
    P3 --> C2[TutorialPanel]
  end
  P3 -->|fetch /api + socket| BE[(backend)]
  P6 -->|fetch /api + socket| BE
  auth[lib/auth.js sessionStorage] --> P1 & P2 & P3 & P4 & P5 & P6
```

## 17.4 Backend architecture (request pipeline)

```mermaid
flowchart LR
  REQ[HTTP /api/*] --> CORS[cors] --> JSON[express.json]
  JSON --> AUTH{authenticateToken?}
  AUTH -->|auth/clock| SKIP[skip]
  AUTH -->|else| VERIFY[JWT verify]
  VERIFY -->|401/403| ERR[error]
  VERIFY -->|ok req.user| H[route handler]
  SKIP --> H
  H --> ENG[engine modules]
  ENG --> M[(Mongoose models)]
  H --> RES[res.json]
  H -.-> SOCK[socket emit]
  H -.-> AUD[audit fire-and-forget]
```

## 17.5 Authentication flow

```mermaid
flowchart TD
  A[POST /login] --> B{email & password?}
  B -->|no| E1[400 required]
  B -->|yes| C[User.findOne]
  C -->|not found| E2[400 invalid]
  C -->|found| D[bcrypt.compare]
  D -->|mismatch| E2
  D -->|match| F[jwt.sign 3h]
  F --> G[Set-Cookie auth_token HttpOnly]
  G --> H[res.json token+user]
  H --> I[sessionStorage + saveSession]
  I --> J[router.push /dashboard]
```

## 17.6 API request lifecycle (protected route)

```mermaid
flowchart TD
  R[client fetch authHeaders] --> P[Next proxy /api/*]
  P --> M[authenticateToken]
  M -->|no token| U401[401]
  M -->|bad token| U403[403]
  M -->|ok| HANDLER[handler]
  HANDLER --> ENGINE[engine]
  ENGINE --> DB[(MongoDB)]
  DB --> RESP[res.json]
  RESP -.-> EMIT[socket emit]
  RESP -.-> AUDIT[auditEngine]
```

## 17.7 Navigation flow
See [07 §7.2](07_Navigation_And_Routing.md).

## 17.8 Database interaction flow (trade action write)

```mermaid
flowchart TD
  A[POST /trade/action] --> B[Trade.findOne assignedTo=userId]
  B --> C{allowed action?}
  C -->|no| X[400]
  C -->|yes| D[LifecycleEngine.transition]
  D --> E{canTransition?}
  E -->|no| Y[InvalidTransitionError → 500/400]
  E -->|yes| F[sessionTrade.save]
  F --> G[queueComposer.getActiveQueue]
  G --> H[res.json trades]
  H --> I[emit trade_update]
  H --> J[auditEngine.recordEvent → AuditLog]
```

## 17.9 Authentication + authorization decision

```mermaid
flowchart TD
  A[incoming request] --> B{route public?}
  B -->|/api/clock| PASS[allow]
  B -->|/api/auth| RL[rate-limit only]
  B -->|else| T{token present?}
  T -->|no| E401[401]
  T -->|yes| V{jwt valid?}
  V -->|no| E403[403]
  V -->|yes| O{owns resource? assignedTo=userId}
  O -->|data-level check in handler| ALLOW[proceed]
  Note1["No role checks anywhere — see 20 Security"]
```

## 17.10 Error-handling flow

```mermaid
flowchart TD
  A[handler] --> B{try}
  B -->|validation fail| V[400 explicit message]
  B -->|not found| N[404]
  B -->|lifecycle illegal| L[InvalidTransitionError]
  B -->|unexpected| C[catch]
  C --> S[500 err.message]
  A -.audit.-> AU[fire-and-forget .catch warn]
  A -.socket.-> SK[try/catch swallow]
  L --> C
  Note["Some routes have NO try/catch → unhandled 500 (see 10 §10.12)"]
```

## 17.11 AI reply generation (Gemini → offline fallback)

```mermaid
flowchart TD
  A[processReplies picks PendingReply] --> B[aiParser.parseEmail]
  B --> C{desk SETTLEMENT?}
  C -->|yes| D[cptySettlementAI]
  C -->|no| E[cptyAI]
  D --> F[llmService Gemini]
  E --> F
  F -->|JSON ok| G[use AI reply]
  F -->|null/throw| H[offlineResponseEngine templates]
  G --> I[conversationEngine.createMessage]
  H --> I
  I --> J[emit new_email]
```

---
[← 16 Sequence Diagrams](16_Sequence_Diagrams.md) | [INDEX](INDEX.md) | Next: [18 Unused & Dead Code →](18_Unused_And_Dead_Code.md)
