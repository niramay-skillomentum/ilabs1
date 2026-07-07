# Project Overview

> **SGB Operations Simulator** — An AI-powered trade lifecycle simulator built by Niramay Skillomentum.

---

## 1. What Is This?

The SGB (Skillomentum Global Bank) Operations Simulator is a **full-stack, real-time web application** that simulates the end-to-end lifecycle of financial trades across multiple operational desks. It is used as a **training and assessment platform** for operations staff in investment banking back-office workflows.

Users log in, select a desk (MO, Confirmation, Settlement, TLM, Reporting), and process a queue of simulated trades. The system generates realistic trade data, introduces discrepancies ("breaks"), simulates counterparty communication (via AI-powered personas), and provides an AI Tutor for guidance.

---

## 2. Problem Statement

Training operations staff for back-office trade processing requires:
- Realistic trade scenarios without risking live systems
- Exposure to break handling, amendments, and settlement workflows
- Simulated counterparty interactions for communication training
- Auditable performance tracking

This simulator addresses all of the above in a single platform.

---

## 3. Target Users

| User | Purpose |
|------|---------|
| **Trainee Operations Staff** | Learn trade lifecycle workflows (MO → Confirmation → Settlement) |
| **Assessors / Team Leads** | Evaluate trainee performance via scoring |
| **AI Tutor (Built-in)** | Provides real-time desk-specific guidance and answers questions |

---

## 4. Core Modules

| Module | Description |
|--------|-------------|
| **MO Desk** | Middle Office — validates trade economics, raises breaks for discrepancies |
| **Confirmation Desk** | Confirms trades with counterparties, handles disputes and escalations |
| **Settlement Desk** | Verifies SSI details, processes amendments, approves settlement |
| **Communication / Mailbox** | Outlook-style email client for CPTY and FO interactions |
| **AI Tutor** | Chat-based AI assistant providing desk-specific SOP guidance |
| **SSI Database** | Standing Settlement Instruction lookup tool |
| **MO Risk / Termsheet** | Trade detail viewer showing MO truths vs. booking data |
| **Session Management** | Timed sessions (3 hours) with auto-expiry and session resume |
| **System Workflow Engine** | Background bot that processes amendments, verifications, and approvals |
| **Reconciliation** | Post-settlement matching of trades |

---

## 5. Business Logic Domain Model

```
Trade Lifecycle:

  NEW → MO_PENDING → CONFIRMATION_PENDING → SETTLEMENT_PENDING → SETTLED
                                                                    ↓
                                                              RECON_PENDING
                                                                    ↓
                                                              RECON_CLEARED
                                                                    ↓
                                                                 CLOSED

Break States:
  MO_BREAK_OPEN, CONFIRMATION_BREAK, SETTLEMENT_BREAK

Communication States:
  LIASING_WITH_CPTY, LIASING_WITH_FO, PENDING_FO_RESPONSE

Amendment Flow:
  PENDING_AMENDMENT → AMENDED → PENDING_APPROVAL → SETTLED / REJECTED_REVERIFY
```

---

## 6. Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express 5** | HTTP server and routing |
| **MongoDB (Mongoose 9)** | Database and ODM |
| **Socket.io 4** | Real-time WebSocket communication |
| **Agenda** | MongoDB-backed job scheduler |
| **JWT / bcrypt** | Authentication |
| **sanitize-html** | XSS prevention in email bodies |
| **express-rate-limit** | API rate limiting |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** (App Router) | React framework |
| **React 19** | UI library |
| **Tailwind CSS v4** | Utility-first styling |
| **react-hot-toast** | Toast notifications |
| **react-markdown** | Markdown rendering (AI Tutor) |
| **socket.io-client** | Real-time client |

### AI / LLM Integrations
| Provider | Model | Purpose |
|----------|-------|---------|
| **Google Gemini** | Gemini 2.5 Flash | CPTY AI persona, FO AI persona, AI Tutor |
| **OpenRouter** | Nemotron | Fallback LLM provider |
| **Cerebras** | — | Alternative LLM provider |
| **Groq** | — | Alternative LLM provider |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker / Docker Compose** | Containerized deployment (MongoDB + Backend + Frontend) |

---

## 7. Key Domain Concepts

| Term | Definition |
|------|-----------|
| **Trade** | A financial transaction with economics (amount, currency, value date, counterparty) |
| **TradeRef** | Unique reference identifier for each trade (e.g., `TRD-20260704-0001`) |
| **Desk** | An operational unit (MO, Confirmation, Settlement, TLM, Reporting) |
| **Break** | A discrepancy between trade truths and booking/settlement data |
| **Truth** | The authoritative correct values for a trade at a given desk |
| **SSI** | Standing Settlement Instructions — bank/account details for settlement |
| **CPTY** | Counterparty — the other bank/entity in the trade |
| **FO** | Front Office — internal desk that executed the trade |
| **Queue** | A user's assigned set of trades for a session |
| **Amendment** | A correction to trade data (e.g., fixing wrong beneficiary details) |
| **Session** | A timed 3-hour work period assigned to a user |

---

## 8. Repository Snapshot

- **Root**: `D:\SBG\ilabs1`
- **Branch**: `bilateral` (active development)
- **Main Branch**: `main`
- **Backend Port**: 3002
- **Frontend Port**: 3000 (dev) / 3001 (production)
- **MongoDB Port**: 27017
