# 16 · Sequence Diagrams

[← 15 File Reference](15_Complete_File_Reference.md) | [INDEX](INDEX.md) | Next: [17 Flowcharts →](17_Flowcharts.md)

---

Mermaid sequence diagrams for all major workflows. (Startup, login, email→reply, and settlement bot also appear inline in [04](04_Entry_Point_And_Startup.md)/[05](05_Authentication_And_Login_Flow.md)/[06](06_User_Flows.md)/[13](13_Event_And_Socket_Flow.md); collected and extended here.)

## 16.1 Application startup
```mermaid
sequenceDiagram
    participant N as node server.js
    N->>N: dotenv.config()
    N->>N: register 6 setInterval processors
    N->>N: assert JWT_SECRET
    N->>N: app.use(cors, json, 12 routers)
    N->>N: startServer()
    N->>N: await connectDB() (Mongoose)
    N->>N: await startAgenda() (cron 1min jobs)
    N->>N: http.createServer(app)
    N->>N: initSocket(server) (Socket.io + JWT)
    N->>N: server.listen(3002)
```

## 16.2 Registration
```mermaid
sequenceDiagram
    participant U as User
    participant P as page.js
    participant R as authRoutes
    participant DB as users
    U->>P: submit fullName/email/password (register)
    P->>R: POST /api/auth/register
    R->>R: authLimiter
    R->>R: bcrypt.hash(password,10)
    R->>DB: User.findOne({email})
    alt exists
        R-->>P: 400 "Email is already registered"
    else new
        R->>DB: new User().save()
        R-->>P: 200 {success, "Registration successful"}
        P->>U: toast + switch to login
    end
```

## 16.3 Login
See [05 §5.4.2](05_Authentication_And_Login_Flow.md).

## 16.4 Dashboard loading & desk selection
```mermaid
sequenceDiagram
    participant U as User
    participant D as dashboard/page.js
    participant SS as sessionStorage
    D->>SS: loadUserId() / hasSession()
    alt no session
        D->>U: toast "Session expired" → push("/")
    else ok
        D->>U: render 5 desk buttons
        U->>D: click MO
        D->>U: router.push("/workstation?desk=MO")
    end
```

## 16.5 Queue generation
See [06 §6.1](06_User_Flows.md).

## 16.6 Trade action (state transition)
```mermaid
sequenceDiagram
    participant W as Workstation
    participant TR as tradeRoutes
    participant LC as LifecycleEngine
    participant DB as Trade
    participant IO as Socket.io
    participant AU as auditEngine
    W->>TR: POST /api/trade/action {trade, action, comment}
    TR->>DB: findOne({tradeRef, assignedTo:userId})
    TR->>TR: guard allowedActions[action] ∋ currentStatus
    TR->>TR: switch(action) side effects
    TR->>LC: transition(trade, nextStatus)
    LC->>LC: canTransition? (transitions.js)
    TR->>DB: save()
    TR-->>W: 200 {trades}
    TR->>IO: emit trade_update (user room)
    TR->>AU: recordEvent (fire-and-forget)
    IO-->>W: trade_update → refreshQueueSilent
```

## 16.7 Email send → AI counterparty reply
See [13 §13.3](13_Event_And_Socket_Flow.md).

## 16.8 FO internal escalation
```mermaid
sequenceDiagram
    participant U as Confirmation user
    participant FR as foChannelRoutes / tradeRoutes
    participant FI as foInternalChannel
    participant PR as PendingReply
    participant BG as processFOInternalReplies (3s)
    participant TE as truthEngine
    U->>FR: CONFIRM_ESCALATE_TO_FO / fo-channel send
    FR->>FI: openChannel + sendMessage(USER)
    FR->>PR: scheduleFOInternalReply {FO_INTERNAL, +3..8s}
    loop every 3s
        BG->>PR: find ready → delete
        BG->>TE: getMismatchFields(round>1?universal:fo)
        alt no mismatch
            BG->>FI: sendMessage(FO_DESK) "FO supports us"
            Note over BG: foEscalation.status=FO_SUPPORTS_US
        else mismatch
            BG->>FI: sendMessage "FO admits mistake"
            BG->>BG: createAmendment + applyAllAccepted
            Note over BG: transition → CONFIRMATION_PENDING
        end
    end
```

## 16.9 Settlement amend + verify (System Bot)
See [06 §6.4.3](06_User_Flows.md).

## 16.10 Settle (final)
```mermaid
sequenceDiagram
    participant U as User
    participant SR as settlementRoutes
    participant LC as LifecycleEngine
    participant DB as Trade
    participant AU as auditEngine
    participant IO as Socket.io
    U->>SR: POST /api/settlement/settle {tradeRef}
    SR->>DB: findOne({tradeRef, assignedTo:userId})
    SR->>SR: require status APPROVED
    SR->>LC: transition(→ SETTLED)
    SR->>DB: save()
    SR->>AU: await recordEvent(SETTLEMENT_SETTLED)
    SR->>IO: emit trade_update
    SR-->>U: 200 {trade, currentStatus:SETTLED}
```

## 16.11 AI Tutor
```mermaid
sequenceDiagram
    participant U as User
    participant TP as TutorialPanel
    participant CR as chatRoutes
    participant TA as tutorAI
    participant OR as OpenRouter/Nemotron
    U->>TP: type question + Send
    TP->>CR: POST /api/chat/tutor (Bearer, direct URL)
    CR->>TA: generateTutorResponse(message, desk, ctx, history)
    TA->>TA: read docs/skb/*.md + build Socratic prompt
    TA->>OR: fetch chat/completions (nemotron)
    OR-->>TA: reply text
    TA-->>CR: reply
    CR-->>TP: 200 {reply}
    TP->>U: render (ReactMarkdown)
```

## 16.12 Logout
```mermaid
sequenceDiagram
    participant U as User
    participant W as Workstation
    participant SR as sessionRoutes
    participant QC as queueComposer
    U->>W: click Logoff
    W->>SR: POST /api/session/logout
    SR->>QC: endSession(userId) (does NOT unassign)
    SR-->>W: 200 + clear cookie
    W->>W: clearSession() (sessionStorage)
    W->>U: router.push("/")
```

## 16.13 Admin/automated operations (Agenda)
```mermaid
sequenceDiagram
    participant AG as Agenda (every 1 min)
    participant QC as queueComposer
    participant DS as dailyScheduler
    participant DB as Mongo
    AG->>QC: session-cleanup → cleanupExpiredSessions()
    QC->>DB: expire Queue{sessionExpiry<now}, unassign Trade
    AG->>DS: daily-age-update → runDailyCycle()
    DS->>DB: recompute Trade.age for all
```

---
[← 15 File Reference](15_Complete_File_Reference.md) | [INDEX](INDEX.md) | Next: [17 Flowcharts →](17_Flowcharts.md)
