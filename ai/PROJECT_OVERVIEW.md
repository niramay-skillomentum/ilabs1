# iLabs1 — Project Overview

## What Is This?

**iLabs1** is a **financial operations training simulator** built by **Niramay Skillomentum**. It replicates the post-trade operations lifecycle of a global investment bank, specifically for the following three desks:

- **Middle Office (MO)** — Trade validation against Front Office (FO) bookings
- **Confirmation Desk** — Counterparty (CPTY) trade confirmation and break resolution
- **Settlement Desk** — Final settlement approval and fail management

The platform is used as an **interactive assessment and training tool** where trainees operate as bank ops professionals, process real-looking trade queues, communicate with counterparties and FO, and are scored on decision quality.

---

## Target Users

- Finance trainees / graduates learning investment bank operations
- Operations professionals being onboarded to trade lifecycle workflows
- Trainers / assessors at financial institutions

---

## Core User Journey

1. User registers / logs in
2. User is directed to the **Dashboard** to select a desk (MO, CONFIRMATION, SETTLEMENT)
3. User clicks **Generate Queue** on the Workstation to receive 20 trades
4. User investigates trades, communicates with FO/CPTY via the **Communication (mailbox)** page
5. User resolves breaks, validates trades, confirms, or settles them — taking scored actions
6. System tracks time via a **Simulation Clock** (session = 3 real hours = one trading day)
7. User's decisions are captured in **Audit Logs** and **UserScore**

---

## Project Name & Branding

- Product Name: **Skillomentum Global Bank (SGB) Operations Simulator**
- Company: **Niramay Skillomentum**
- Copyright: © Niramay Skillomentum

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express v5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Real-time | Socket.io v4 |
| Job Scheduling | Agenda |
| AI Responses | Google Gemini (primary), Cerebras (secondary), Groq (tertiary, commented out) |
| Frontend | Next.js 16 + React 19 |
| Frontend Styling | TailwindCSS v4 |
| Auth | JWT (HS256) + HttpOnly-style cookies |
| Containerization | Docker + docker-compose |

---

## Key Features

- **Trade Queue Generation**: 20 trades per session (12 clean + 8 breaks) with graduated DB/generated allocation
- **Multi-Desk Simulation**: MO, Confirmation, Settlement with distinct workflow actions
- **AI-Powered Counterparty Responses**: Real-time async replies from CPTY and FO using LLM
- **Break Investigation Workflows**: Amendment engine, evidence requests, FO escalation
- **Communication Mailbox**: Full email-style threading between user, FO, and counterparties
- **FO Internal Channel**: Separate internal escalation pathway
- **Session Timer**: 3-hour sessions with simulation clock (starts at 9:00 AM)
- **Audit Trail**: Full XML and structured audit logs per trade
- **Scoring Engine**: Points/penalties based on decision correctness
- **Real-time Updates**: Socket.io pushes trade/email updates to clients instantly
- **MO Risk / Termsheet View**: Reference document view for MO desk

---

## Simulation Rules (High Level)

- One session = 3 hours real time (simulated as one trading day, 9 AM–6 PM)
- Every session generates exactly 20 trades: **12 clean + 8 breaks**
- Breaks are specifically seeded with mismatches in amount, value date, currency, or counterparty
- Confirmation breaks have NO counterparty mismatch (only amount, value date, currency)
- ~30% of MO-clean trades have a confirmation-level discrepancy
- All actions require a mandatory comment for audit and scoring
- Session expires after 3 hours; user is auto-logged off at expiry or market close (6 PM sim time)
