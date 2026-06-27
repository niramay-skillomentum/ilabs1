# 13. Complete File Reference

This table serves as a quick lookup for every important file in the project.

## Root & Configuration Files

| File Name | Path | Purpose |
|---|---|---|
| `server.js` | `/server.js` | Main entry point for the backend, boots express, sockets, and background processes. |
| `package.json` | `/package.json` | Backend dependencies and start scripts. |
| `docker-compose.yml` | `/docker-compose.yml` | Docker configuration for local deployment (likely includes MongoDB/Redis). |
| `.env` | `/.env` | Stores environment variables like `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`. |
| `cleanDB.js` | `/cleanDB.js` | Utility script to purge the database. |

## Backend - Source (`src/`)

| File Name | Path | Purpose |
|---|---|---|
| `db.js` | `src/db.js` | Connects to MongoDB via Mongoose. |
| `auth.js` | `src/middleware/auth.js` | Express middleware to validate JWT tokens. |
| `Trade.js` | `src/models/Trade.js` | Mongoose schema for Trades. |
| `User.js` | `src/models/User.js` | Mongoose schema for Users. |
| `Queue.js` | `src/models/Queue.js` | Mongoose schema for user simulation queues. |
| `Conversation.js` | `src/models/Conversation.js` | Mongoose schema for ops-to-cpty email threads. |
| `AuditLog.js` | `src/models/AuditLog.js` | Mongoose schema for action history. |
| `tradeRoutes.js` | `src/routes/tradeRoutes.js` | API endpoints for trade actions (`POST /action`). |
| `authRoutes.js` | `src/routes/authRoutes.js` | API endpoints for login/register. |
| `queueRoutes.js` | `src/routes/queueRoutes.js` | API endpoints to generate/fetch queues. |
| `conversationRoutes.js`| `src/routes/conversationRoutes.js` | API endpoints for the Mailbox. |
| `lifecycle.js` | `src/engine/lifecycle.js` | Core state machine logic transitioning trades between statuses. |
| `queueComposer.js`| `src/engine/queueComposer.js` | Generates batches of trades and assigns them to users. |
| `tradeGenerator.js`| `src/engine/tradeGenerator.js` | Builds synthetic trade payloads with randomized economic breaks. |
| `communicationEngine.js`| `src/engine/communicationEngine.js`| Background interval process that parses new messages and triggers LLMs. |
| `cptyAI.js` | `src/engine/cptyAI.js` | Prompts the Counterparty LLM. |
| `foAI.js` | `src/engine/foAI.js` | Prompts the Front Office LLM. |
| `llmService.js` | `src/engine/llmService.js` | Wrapper for external LLM APIs (Groq/Gemini). |
| `socketEngine.js` | `src/engine/socketEngine.js` | Sets up Socket.io for real-time frontend updates. |
| `agendaJobs.js` | `src/engine/agendaJobs.js` | Configures the Agenda scheduler for end-of-day jobs. |
| `auditEngine.js` | `src/engine/auditEngine.js` | Helper to log actions into `AuditLog`. |

## Frontend (`frontend/src/`)

| File Name | Path | Purpose |
|---|---|---|
| `page.js` | `app/page.js` | Login and Registration page component. |
| `layout.js` | `app/layout.js` | Next.js root layout, injects global fonts and Toaster. |
| `page.js` | `app/dashboard/page.js` | Desk selection screen (MO, Confirmation, Settlement). |
| `page.js` | `app/workstation/page.js` | Main trade queue management grid and action handler. |
| `page.js` | `app/mo-risk/page.js` | Termsheet viewer for the MO desk. |
| `page.js` | `app/communication/page.js` | Mailbox layout. |
| `auth.js` | `lib/auth.js` | Utility functions for reading/writing to `sessionStorage`. |
| `FolderNav.js` | `app/communication/components/`| Mailbox left sidebar component. |
| `InboxList.js` | `app/communication/components/`| Mailbox middle pane (thread list). |
| `MessageThread.js`| `app/communication/components/`| Mailbox right pane (chat history). |
| `ComposeModal.js` | `app/communication/components/`| Modal for drafting a new email. |
| `ReplyModal.js` | `app/communication/components/`| Modal for replying to a thread. |
| `utils.js` | `app/communication/components/`| Formatting helpers for dates, currencies, and subjects. |
