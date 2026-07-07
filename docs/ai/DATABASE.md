# Database

> Complete database schema, collections, field definitions, and relationships.

---

## 1. Database Technology

- **Database**: MongoDB (document store)
- **ODM**: Mongoose 9
- **Connection**: Via `MONGO_URI` environment variable
- **Database Name**: `ilabs` (default in Docker)

---

## 2. Entity Relationship Diagram

```
┌──────────┐       ┌──────────┐       ┌──────────────┐
│  User    │ 1───1 │  Queue   │ 1───N │   Trade      │
│          │       │          │       │              │
└──────────┘       └──────────┘       └──────┬───────┘
                                           │
                    ┌──────────────────────┤
                    │                      │
              ┌─────┴──────┐  ┌────────────┴──────┐
              │Conversation │  │   AuditLog        │
              │  + Message  │  │                   │
              └─────────────┘  └───────────────────┘
                    │
              ┌─────┴──────┐
              │PendingReply │
              └─────────────┘

┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│FOCommunication│  │SystemJob │  │SystemMail│  │UserScore │
└──────────────┘  └──────────┘  └──────────┘  └──────────┘

┌──────────────┐
│ SystemConfig │
└──────────────┘
```

---

## 3. Collection Schemas

### 3.1 `trades` — Trade

Core trade record with desk-specific truths and lifecycle data.

```javascript
{
  _id: ObjectId,

  // Identity
  tradeRef:          String,        // Unique, indexed (e.g., "TRD-20260704-0001")
  originType:        String,        // "AUTO_GENERATED" (default)

  // Dates
  tradeDate:         Date,
  valueDate:         Date,

  // Status
  currentStatus:      String,        // State machine status (default: "MO_PENDING")
  nextDesk:          String,        // Indexed — which desk should process next

  // Core Economics
  amount:            Number,
  currency:          String,
  counterparty:      String,
  direction:         String,        // BUY / SELL

  // Classification
  entity:            String,
  foRegion:          String,
  product:           String,
  tradeType:         String,
  settlementType:    String,

  // Age tracking
  age:               Number,        // Default: 0

  // ===== DESK-SPECIFIC TRUTHS =====
  truths: {
    universal: {
      amount:        Number,        // Authoritative amount
      valueDate:     Date,          // Authoritative value date
      currency:      String,        // Authoritative currency
      counterparty:  String         // Authoritative counterparty
    },
    mo: {
      amount:        Number,
      valueDate:     Date,
      currency:      String,
      counterparty:  String
    },
    confirmation: {
      amount:        Number,
      valueDate:     Date,
      currency:      String
    },
    settlement: {
      amount:            Number,
      valueDate:         Date,
      currency:          String,
      counterparty:      String,
      beneficiaryName:   String,
      beneficiaryBank:   String,
      beneficiaryBIC:    String,
      accountNumber:     String,
      accountType:       String,
      settlementMethod:  String,
      correspondentBank: String,
      paymentReference:  String,
      settlementDate:    Date,
      settlementType:    String
    }
  },

  // Booking data (what MO sees)
  booking: {
    amount:        Number,
    valueDate:     Date,
    currency:      String,
    counterparty:  String
  },

  // Settlement details (visible data)
  settlementDetails: {
    beneficiaryName:   String,
    beneficiaryBank:   String,
    beneficiaryBIC:    String,
    accountNumber:     String,
    accountType:       String,
    currency:          String,
    settlementMethod:  String,
    correspondentBank: String,
    paymentReference:  String,
    settlementDate:    Date,
    settlementType:    String
  },

  // Verification & Amendments
  verificationErrors:  [String],     // Default: []
  pendingAmendments:   Array,        // Default: []

  amendmentHistory: [{
    amendmentNumber:   Number,
    desk:              String,
    field:             String,
    oldValue:          Mixed,
    newValue:          Mixed,
    source:            String,
    status:            String,
    appliedAt:         Date,
    appliedBy:         String
  }],

  // Confirmation scenario
  confirmationScenario: {
    disputeType:        String,       // Default: null
    expectedEconomics: {
      amount:          Number,
      valueDate:       Date,
      currency:        String
    },
    evidence: [{
      type:            String,
      provided:        Boolean,      // Default: false
      requestedAt:     Date,
      receivedAt:      Date
    }]
  },

  // FO Escalation
  foEscalation: {
    status:            String,       // Default: null
    escalatedAt:       Date,
    resolvedAt:        Date,
    foResponse:        String
  },

  // Response tracking
  foResponseReceived:    Boolean,     // Default: false
  cptyResponseReceived:  Boolean,     // Default: false
  cptyContactCount:      Number,      // Default: 0
  foContactCount:        Number,      // Default: 0

  // Conversation status
  conversation: {
    status:            String,       // Default: null
    resolvedAt:        Date          // Default: null
  },

  // Assignment
  assignedTo:        String,          // Indexed — userId or null
  isAutoGenerated:   Boolean,         // Default: true

  // Audit
  auditXml:          String,          // Default: null

  // Timestamps (Mongoose)
  createdAt:         Date,
  updatedAt:         Date
}
```

**Indexes**: `tradeRef` (unique), `nextDesk`, `assignedTo`

---

### 3.2 `users` — User

```javascript
{
  _id:         ObjectId,
  email:       String,        // Required, unique, trimmed, lowercase
  fullName:    String,        // Required, trimmed
  password:    String,        // Required (bcrypt hash)
  createdAt:   Date           // Default: Date.now
}
```

**Indexes**: `email` (unique)

---

### 3.3 `queues` — Queue

```javascript
{
  _id:            ObjectId,
  userId:         String,      // Required, unique, indexed
  desk:           String,      // Required
  trades:         [String],    // Array of tradeRef strings
  sessionStart:   Date,        // Default: Date.now
  sessionExpiry:  Date,        // sessionStart + 3 hours
  isActive:       Boolean,     // Default: true, indexed
  lastActivity:   Date,        // Default: Date.now

  // Timestamps
  createdAt:      Date,
  updatedAt:      Date
}
```

**Indexes**: `userId` (unique), `isActive`

---

### 3.4 `conversations` — Conversation

Stores email threads with embedded messages.

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  participants:    [String],
  channel:         String,       // "PERSONAL" | "GROUP"
  desk:            String,
  status:          String,
  lastMessageAt:   Date,

  // Embedded messages
  messages: [{
    _id:           ObjectId,
    from:          String,
    to:            String,
    subject:       String,
    body:          String,
    timestamp:     Date,
    isRead:        Boolean,
    isSystem:      Boolean
  }]
}
```

---

### 3.5 `focommunications` — FO Communication

FO internal channel messages.

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  desk:            String,
  messages: [{
    from:          String,
    body:          String,
    timestamp:     Date,
    isSystem:      Boolean
  }]
}
```

---

### 3.6 `pendingreplies` — Pending Reply

LLM reply queue (survives server restart via MongoDB).

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  conversationId:  String,
  targetChannel:  String,
  parsedIntent:    Object,
  userMessage:     String,
  createdAt:       Date,
  processed:       Boolean
}
```

---

### 3.7 `systemjobs` — System Job

Scheduled jobs for the System Workflow Engine.

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  type:            String,       // "AMENDMENT" | "VERIFICATION"
  status:          String,       // "PENDING" | "PROCESSING" | "COMPLETED"
  scheduledAt:     Date,
  payload:         Object,
  createdAt:       Date
}
```

---

### 3.8 `systemmails` — System Mail

System notification mailbox messages.

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  type:            String,
  subject:         String,
  body:            String,
  createdAt:       Date,
  isRead:          Boolean
}
```

---

### 3.9 `auditlogs` — Audit Log

Per-trade audit trail entries.

```javascript
{
  _id:             ObjectId,
  tradeRef:        String,
  action:          String,
  performedBy:     String,
  details:         Object,
  timestamp:       Date
}
```

---

### 3.10 `userscores` — User Score

User performance scores.

```javascript
{
  _id:             ObjectId,
  userId:          String,
  desk:            String,
  score:           Number,
  details:         Object,
  updatedAt:       Date
}
```

---

### 3.11 `systemconfigs` — System Config

System-wide configuration values.

```javascript
{
  _id:             ObjectId,
  key:             String,       // Unique config key
  value:           Mixed,         // Config value (string, number, object)
  updatedAt:       Date
}
```

---

## 4. Index Summary

| Collection | Field | Index Type |
|------------|-------|------------|
| `trades` | `tradeRef` | Unique |
| `trades` | `nextDesk` | Single |
| `trades` | `assignedTo` | Single |
| `users` | `email` | Unique |
| `queues` | `userId` | Unique |
| `queues` | `isActive` | Single |

---

## 5. Controller-to-DB Operation Mapping

| Operation | Collection | Method |
|-----------|------------|--------|
| Generate trades | `trades` | `Trade.insertMany()` |
| Load queue | `trades`, `queues` | `Queue.findOne()`, `Trade.find({ tradeRef: { $in } })` |
| Execute trade action | `trades` | `Trade.updateOne()` |
| Send email | `conversations` | `Conversation.findOneAndUpdate()` |
| Load inbox | `conversations` | `Conversation.find({ desk })` |
| Save audit | `auditlogs` | `AuditLog.create()` |
| Schedule job | `systemjobs` | `SystemJob.create()` |
| Process job | `systemjobs`, `trades` | `SystemJob.findOneAndUpdate()`, `Trade.updateOne()` |
| LLM reply queue | `pendingreplies` | `PendingReply.create()`, `PendingReply.findOneAndUpdate()` |
