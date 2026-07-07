# Changelog

> Record of all significant changes to the project.

---

## [bilateral] — 2026-07-04

### Added
- **Bilateral Settlement flow** — Complete bilateral settlement support including amendment, verification, and settlement execution
- **CPTY Settlement AI** — Dedicated AI persona for settlement-specific counterparty interactions
- **System Workflow Engine enhancements** — Amendment processing, verification bot, approval workflow
- **`docs/ai/` knowledge base** — 18 AI agent documentation files created (this folder)

### Changed
- **Settlement routes** — New endpoints for amend, send-for-approval, settle
- **SSI routes** — Enhanced with dual-code search
- **Trade generator** — Updated for bilateral settlement scenarios

---

## [main] — Previous Commits

### Security (KI-007, KI-016, KI-017, KI-011, KI-012)
- **PendingReply collection** — Migrated LLM reply queues from in-memory to MongoDB to survive server restarts
- **Secure cookie flag** — Added `Secure` flag to auth cookie in production
- **XSS prevention** — Added `sanitize-html` to sanitize email bodies
- **Rate limiting** — Configured `express-rate-limit` middleware

### Testing Infrastructure
- **Frontend component tests** — Jest + React Testing Library setup for Workstation
- **Backend integration tests** — Jest + Supertest setup for trade actions

### Electronic Settlement
- **Electronic settlement flow** — Complete electronic settlement desk workflow
- **Settlement break engine** — Break detection and handling
- **Settlement interaction engine** — Desk interaction logic

### Modularized Engines
- **Trade generation** — Extracted into modular engine with scenario support
- **Communication engine** — Modularized with AI reply processing
- **37 engine modules** — Complete modularization of backend logic

### Documentation Reorganization
- Reorganized `docs/` folder from flat files to numbered system (01-22)
- Added comprehensive project documentation:
  - Project Overview, Architecture, Folder Structure
  - Entry Point, Authentication, User Flows, Navigation
  - Frontend Components, API Reference, Backend Engines
  - Database Schema, State Management, Event/Socket Flow
  - Call/Dependency Graphs, File Reference
  - Sequence Diagrams, Flowcharts
  - Unused/Dead Code Analysis, Performance Analysis
  - Security Analysis, Developer Guide, Glossary

---

## [Initial] — Project Inception

### Added
- **Project scaffolding** — Node.js + Express + MongoDB + Next.js
- **Authentication** — JWT-based login/register with bcrypt
- **MO Desk** — Trade validation, break raising, FO escalation
- **Confirmation Desk** — Trade confirmation, CPTY communication
- **Communication / Mailbox** — Outlook-style 3-panel email client
- **AI Tutor** — Gemini-powered chatbot for desk guidance
- **CPTY AI** — Gemini-powered counterparty persona with offline fallback
- **FO AI** — Front Office AI persona
- **Trade lifecycle engine** — Complete state machine (20+ statuses)
- **Trade generator** — Realistic financial data with break injection
- **Socket.io** — Real-time updates for trade queue and email
- **Docker Compose** — Containerized deployment (MongoDB + Backend + Frontend)
- **Dashboard** — Desk selection page
- **MO Risk / Termsheet** — Trade detail viewer
- **SSI Database** — SSI code lookup tool
