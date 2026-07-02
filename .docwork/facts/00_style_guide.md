# DOC STYLE GUIDE — iLabs / SGB Operations Simulator

Every rewritten Markdown file MUST follow this structure and rules.

## Product framing (use consistently)
- Product name: **iLabs — SGB Operations Simulator** (a training simulator for securities/FX trade back-office operations: Middle Office → Confirmation → Settlement → Reconciliation).
- The trainee is "the user/analyst". AI actors: **Counterparty (CPTY)** and **Front Office (FO)**.
- "Truth" = the ground-truth correct economics the sim validates user actions against.
- A "break" = a detected discrepancy the analyst must investigate and resolve.

## Canonical terminology (do not vary)
- Desks: **MO** (Middle Office), **Confirmation**, **Settlement**, **TLM/Reconciliation**, **Reporting**.
- Statuses in UPPER_SNAKE exactly as code: MO_PENDING, MO_BREAK_OPEN, PENDING_FO_RESPONSE, CONFIRMATION_PENDING, CONFIRMATION_BREAK, LIASING_WITH_CPTY, LIASING_WITH_FO, SETTLEMENT_PENDING, READY_FOR_APPROVAL, SETTLEMENT_BREAK, SETTLED, RECON_PENDING, RECON_CLEARED, UNMATCHED_BY_USER, CLOSED. (Note: code spells it "LIASING", keep that spelling.)
- Tech stack: Express 5, Mongoose 9 / MongoDB, Socket.io 4, Next.js 16 App Router, React 19, Tailwind v4, Agenda 5, JWT, Gemini 2.5 Flash, OpenRouter Nemotron 3 Ultra.

## Required document skeleton
Each file starts with an H1 title, then a short metadata block, then a TOC for long docs:

```
# <Title>

> **Purpose:** one sentence.
> **Audience:** e.g. backend devs / new joiners / ops.
> **Last verified:** 2026-07-01 against commit state of the repo.

## Overview
...
```

Then include, WHERE APPLICABLE (omit sections that don't apply rather than padding):
Overview · Architecture · Workflow · File references · Sequence/State diagrams (Mermaid) · Component interactions · API references · Database references · Configuration · Examples from actual code · Common pitfalls · Troubleshooting · Future enhancements · Related documents (cross-links).

## Rules
1. **Implementation is the single source of truth.** Every statement must be backed by the facts files in `.docwork/facts/`. Do NOT invent features, endpoints, env vars, or files.
2. Use real `path:line`-style references (e.g. `src/routes/tradeRoutes.js`, `server.js:107`). Prefer file paths; line numbers only where given in facts.
3. Code snippets must reflect real code shapes from the facts (endpoint shapes, field names, enums). Keep them short and illustrative.
4. Use Mermaid for: architecture (graph/flowchart), state machine (stateDiagram-v2), request/socket flows (sequenceDiagram), ER (erDiagram). Ensure valid Mermaid syntax.
5. Cross-link related docs with relative links, e.g. `[API Reference](API.md)`, `[Database](DATABASE.md)`. Within docs/ai use sibling filenames; from docs/ to docs/ai use `ai/NAME.md`.
6. Consistent tone: precise, dense, no marketing fluff, no "we might". Present tense.
7. Do not copy stale claims (no Prisma, no Public/ HTML, no uiRoutes.js). If a legacy doc mentioned them, silently correct to current reality.
8. Cross-reference the SKB docs (docs/skb/*) as the in-sim knowledge base that powers the AI tutor.

## Cross-doc link map (use these canonical names)
docs/ai/: PROJECT_OVERVIEW, ARCHITECTURE, API, DATABASE, BUSINESS_RULES, SECURITY, DEPLOYMENT, TESTING, PERFORMANCE, CODING_STANDARDS, COMPONENT_GUIDELINES, UI_GUIDELINES, DECISIONS, ROADMAP, TODO, KNOWN_ISSUES, CHANGELOG, CURRENT_PROGRESS.
docs/: 01_Project_Overview … 15_Developer_Guide, INDEX.
docs/skb/: screen_and_feature_guide, simulator_workflow_guide, troubleshooting_and_faqs.
