# 1. High Level Overview

## Project Purpose
The **Skillomentum Global Bank (SGB) Operations Simulator** is a financial operations training simulator. It aims to replicate the real-world post-trade lifecycle management processes that occur within an investment bank. 

## Problem It Solves
It bridges the gap between theoretical knowledge and practical execution by providing a sandbox environment. Users can interact with realistic trade workflows, investigate discrepancies, perform reconciliation, and communicate with simulated counterparties or front-office agents, all without financial risk.

## Target Users
- Trainee Operations Analysts
- Financial students
- Junior Middle Office and Back Office staff

## Business Logic
The simulator manages the lifecycle of a trade through various stages and desks:
1. **Middle Office (MO)**: Validating trades, resolving front-office discrepancies, and escalating breaks.
2. **Confirmation**: Handling confirmation breaks with counterparties, issuing chasers, and amending trade terms.
3. **Settlement**: Managing settlement queues, resolving failing trades, and interacting with depositories.

It employs autonomous LLM-based agents (e.g., `cptyAI.js`, `foAI.js`) to act as the counterparty (CPTY) and Front Office (FO), respectively, dynamically responding to user queries and resolving or rejecting amendments based on predefined logic and generated breaks. A simulation clock advances time to create realistic time-pressure scenarios (e.g., cutoff times).

## Architecture
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB (Mongoose ORM).
- **Background Jobs**: Agenda (for scheduled jobs), internal memory loops (`setInterval`).
- **AI Integration**: Custom LLM services (Groq/Google Gemini) for dynamic bot responses.

## Folder Structure

Below is the complete folder structure with explanations for each directory.

```text
ILABS1/
├── ai/                     # Project planning, AI tracking, and design documentation.
├── docs/                   # (This folder) Complete reverse-engineered project documentation.
├── frontend/               # Next.js Frontend Application
│   ├── public/             # Static assets (SVGs, icons).
│   ├── src/
│   │   ├── app/            # Next.js App Router root (Pages: login, dashboard, mo-risk, workstation, communication)
│   │   │   ├── communication/ # Mailbox / Messaging interface components
│   │   │   ├── dashboard/  # Dashboard view
│   │   │   ├── mo-risk/    # Middle Office risk view
│   │   │   └── workstation/# Main trade grid / workstation view
│   │   └── lib/            # Frontend utilities (e.g., auth.js for sessionStorage)
├── src/                    # Node.js Backend Application
│   ├── engine/             # The core business logic and simulation engine
│   │   ├── aiParser.js             # Parses LLM responses
│   │   ├── botconfig.js            # Configuration for bots
│   │   ├── clock.js                # Simulation clock logic
│   │   ├── communicationEngine.js  # Manages messages between users and bots
│   │   ├── conversationEngine.js   # DB interactions for conversations
│   │   ├── cptyAI.js / foAI.js     # Counterparty and Front Office LLM logic
│   │   ├── dailyScheduler.js       # Handles end-of-day/cycle logic
│   │   ├── lifecycle.js            # Trade state machine and transitions
│   │   ├── queueComposer.js        # Generates synthetic trades and queues for users
│   │   ├── reconciliation.js       # Trade matching logic
│   │   ├── socketEngine.js         # Socket.io real-time event broadcasting
│   │   └── tradeGenerator.js       # Synthesizes realistic financial trades
│   ├── middleware/         # Express middleware (e.g., JWT Auth)
│   ├── models/             # Mongoose DB Schemas (User, Trade, Conversation, etc.)
│   └── routes/             # Express API Routes (auth, trade, clock, queue, etc.)
├── tests/                  # Automated test suites (e.g., Jest backend tests)
├── .env                    # Environment variables (Secrets, DB URI)
├── package.json            # Backend dependencies
├── server.js               # Application Entry Point
```

### Key Folders Explained
- `frontend/src/app`: Contains the routing logic for the UI. Every subfolder with a `page.js` corresponds to a route (e.g., `/dashboard`, `/communication`).
- `src/engine`: The brain of the simulator. Since this isn't a standard CRUD app, the engine contains heavy business logic for simulating market conditions, generating trades, handling AI responses, and moving trades through their lifecycle.
- `src/models`: Data structures. Defines how trades, user sessions, and communications are stored in MongoDB.
- `src/routes`: API endpoints called by the Next.js frontend to interact with the backend (fetching queues, sending messages).
