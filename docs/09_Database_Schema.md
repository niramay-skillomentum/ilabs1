# 9. Database Schema

The simulator uses MongoDB via Mongoose. Below are the core collections and their purposes.

## 1. User
Stores authentication details.
- `email`: String (Unique, required)
- `fullName`: String
- `password`: String (bcrypt hashed)

## 2. Trade
The central entity representing a financial transaction throughout its lifecycle.
- `tradeRef`: String (Unique index, e.g., "TRD_12345")
- `currentStatus`: String (e.g., "MO_PENDING", "CONFIRMATION_PENDING")
- `nextDesk`: String
- `assignedTo`: String (Links the trade to a user's session)
- `booking`: Object (The current economic details visible in the workstation)
  - `amount`, `currency`, `valueDate`, `counterparty`
- `truths`: Object (The immutable truth for each desk. Used to simulate discrepancies)
  - `mo`, `confirmation`, `settlement`
- `pendingAmendments`: Array (List of requested changes by FO/CPTY)
- `amendmentHistory`: Array (Audit trail of applied amendments)
- `confirmationScenario`: Object (Defines what evidence the LLM requires to resolve a break)
- `cptyContactCount` / `foContactCount`: Numbers (Tracking escalation rounds)

## 3. Queue
Manages a user's simulated session window (3 hours).
- `userId`: String
- `desk`: String
- `trades`: Array of Strings (`tradeRef`s assigned to this session)
- `sessionStart`: Date
- `sessionExpiry`: Date
- `isActive`: Boolean

## 4. Conversation
Stores the email thread between Operations (the user) and the Counterparty.
- `tradeRef`: String (Unique)
- `status`: String ("OPEN" | "RESOLVED")
- `messages`: Array of Objects
  - `sender`: "USER", "FO", "COUNTERPARTY"
  - `body`: String
  - `timestamp`: Date

## 5. FOCommunication
Dedicated channel for internal escalations to the Front Office.
- `tradeRef`: String (Unique)
- `desk`: String
- `status`: String
- `messages`: Array of Objects

## 6. AuditLog
System of record for every action taken on a trade.
- `tradeRef`: String
- `action`: String (e.g., "MO_VALIDATE_PASS", "SYSTEM_GENERATED")
- `userId`: String
- `details`: String (User comments or system notes)
- `isAutomated`: Boolean (Differentiates between user clicks and LLM/cron background changes)
- `xmlContent`: String (Stores initial generation payload)

## 7. UserScore (Not fully utilized in frontend yet)
Tracks user performance based on actions and time taken.
- `userId`: String
- `totalScore`: Number
- `breakdown`: Object (Points for validation, communication, penalties)
