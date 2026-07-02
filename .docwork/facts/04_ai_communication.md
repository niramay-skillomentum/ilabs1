# GROUND TRUTH — AI + Communication Subsystem (src/engine/*)

## LLM provider layer
- **Root llmService.js** & **src/engine/llmService.js**: Google **Gemini** `gemini-2.5-flash`, key `GEMINI_API_KEY`. Rate limit 15 req/min → MIN_DELAY_MS 4000 (1 req / 4s). Retries on 429/503/quota with backoff (root: 5 retries; src/engine: 3). Requests JSON MIME, temperature 0.7. Returns null if no key / retries exhausted. Used for CPTY + FO reply generation.
- **tutorAI.js**: **OpenRouter** `https://openrouter.ai/api/v1/chat/completions`, model `nvidia/nemotron-3-ultra-550b-a55b:free`, key `OPENROUTER_API_KEY` (throws if missing). Temperature 0.5, max_tokens 500. Loads 3 SKB docs (docs/skb/*) into system prompt. Socratic tutor persona — never gives direct answers. Serves POST /api/chat/tutor.
- Cerebras (`CEREBRAS_API_KEY`) mentioned as secondary fallback in env; Groq (`GROQ_API_KEY`) present but unused.

| Actor | Provider | Model | Fallback |
|---|---|---|---|
| CPTY (Confirmation) | Gemini | gemini-2.5-flash | offlineResponseEngine |
| CPTY (Settlement) | Gemini | gemini-2.5-flash | hardcoded SSI-ID reply |
| FO | Gemini | gemini-2.5-flash | offlineResponseEngine |
| Tutor | OpenRouter | Nemotron 3 Ultra | none (throws) |

## AI counterparties
- **cptyAI.js**: LLM-first, offline fallback. buildCPTYSystemPrompt: CPTY operations persona; injects round count (cptyContactCount), target truth (confirmation vs universal), confirmationMismatches ("WE EXPECT ..."), break type, parsed intent. Expects JSON {action, subject, body}. Fallback: offlineResponseEngine.generateCPTYResponseOffline().
- **cptySettlementAI.js**: SETTLEMENT desk; **SSI-only** strategy — only gives an SSI ID, never confirms match/break; bank must self-match. Offline: "Our standard settlement instruction (SSI) ID is {ssiId}...". getSsiId() from truths.settlement or CPTY_SSIS/ENTITY_SSIS.
- **foAI.js**: Front Office persona; compares truths.mo vs booking; lists mismatches from truthEngine.getMismatchFields(); JSON {action, category, subject, body}. Fallback: offlineResponseEngine.generateFOResponseOffline().
- **aiParser.js**: deterministic email parse. Extracts reference (`TRD_...`), currency, amounts (3+ digits), dates (DD MON). Intent priority: DISCREPANCY_QUERY (≥2 amounts) > VALUE_DATE_QUERY > PAYMENT_STATUS_QUERY > SSI_QUERY > REFERENCE_QUERY > CONFIRMATION_REQUEST > GENERAL_QUERY. Output {intent, reference, currency, amounts[], dates[], rawText}.

## Offline (deterministic template) engines
- **offlineResponseEngine.js** (401 lines): greeting/thanks patterns; intent scoring across ~10 intents (threshold ≥8 else UNKNOWN); analyzeTradeContext() compares truths.mo vs booking + flags aged (>2d); pickWithVariety() avoids last-3 repeats per tradeRef; template rendering with {{tradeRef}},{{truthAmount}},{{truthVD}},{{bookingAmount}},{{bookingVD}},{{currency}},{{counterparty}},{{issueList}}. Generators: generateFOResponseOffline (uses foResponseProfiles personality + signature), generateCPTYResponseOffline (FORMAL tone + signature; CPTY_STAYS_FIRM vs CPTY_ADMITS_MISTAKE based on cptyContactCount>1 and universal-truth mismatch).
- **foResponseProfiles.js**: per-counterparty speed+personality — CITI FAST/COOPERATIVE, JPM FAST/EFFICIENT, HSBC MEDIUM/FORMAL, BNP MEDIUM/CAUTIOUS, DB SLOW/BUREAUCRATIC, DEFAULT MEDIUM/FORMAL. getProfile(), getDelay().
- **foOfflineResponses.js** (468 lines): ~200 templates by category→personality→variations. Categories incl. GREETING, THANKS, ERROR_CHECK_WITH/NO_ISSUES, AMOUNT_MISMATCH, VALUE_DATE_MISMATCH, AMOUNT_CORRECT, VALUE_DATE_CORRECT, CURRENCY_MISMATCH, COUNTERPARTY_MISMATCH, CLEAN_TRADE, URGENCY, GENERIC_INVESTIGATION, CLARIFICATION. Personalities COOPERATIVE/EFFICIENT/FORMAL/CAUTIOUS/BUREAUCRATIC.
- **cptyOfflineResponses.js** (325 lines): categories incl. GREETING, THANKS, ERROR_CHECK_WITH/NO_ISSUES, PAYMENT_RECEIVED/NOT_RECEIVED, SSI_CORRECT/MISMATCH, REFERENCE_INCORRECT, GENERAL_INQUIRY, CONFIRMATION, CPTY_STAYS_FIRM, CPTY_ADMITS_MISTAKE, CLARIFICATION. Tones COOPERATIVE/EFFICIENT/FORMAL/CAUTIOUS.

## Communication routing
- **communicationEngine.js** & **conversationEngine.js** (same interface, MongoDB-backed + in-memory cache): createMessage(tradeRef, sender, body, subject, desk, skipEmit) sanitizes body (sanitize-html: img/span/div, style/class/id, href), upserts Conversation, emits `new_email` unless skipEmit (AI actors skip to avoid double notify). getConversation, getAllConversations, resolveConversation.
- **foInternalChannel.js** (278 lines): FOCommunication-backed internal FO escalation channel. openChannel, sendMessage (emits new_email), scheduleFOInternalReply (PendingReply FO_INTERNAL, 3-8s), processFOInternalReplies(saveTrade) — foRound from foContactCount (>1 → universal truth else fo); if mismatches → FO_ADMITS_MISTAKE (auto-applies amendments, transitions to CONFIRMATION_PENDING) else FO_SUPPORTS_US. getChannel, closeChannel.

## Queue system
- **queue.js**: in-memory DeskQueue class (mainQueue + breakQueue FIFO). addTrade, moveToBreak, getNextTrade, viewQueue.
- **queueComposer.js** (395 lines): DB-backed builder. TOTAL_TRADES 20, CLEAN_TARGET 12 / BREAK_TARGET 8 (60/40). FULL_POOL_SIZE 1000, MIN_DB_POOL 50, SESSION_DURATION_MS 3h. Graduated allocation dbCount = floor(20*(1 - e^(-0.003*pool))). buildQueue(desk,userId): reject if active unexpired session; count unassigned by desk; fetch fresh DB trades (age ≤1); generate remainder to reach 20; shuffle; bulk-assign assignedTo=userId + recalc age; create Queue doc. isBreakTrade (CONFIRMATION uses getConfirmationMismatches, else truths.mo vs booking). expireSession, getActiveQueue, endSession, cleanupExpiredSessions.

## Scoring (scoringEngine.js)
- VALIDATE +5, RAISE_BREAK +3, issueType present +2. evaluateAction updates in-memory + async upsert UserScore {points, history}. applyPenalty deducts (settlement/confirmation type errors apply 10-pt penalty via routes) → $inc penalties, $push negative history.

## Audit (auditEngine.js)
- recordEvent(tradeRef, actor, action, details) → AuditLog {userId:actor, action, details, timestamp, isAutomated:false}, fire-and-forget. getAuditTrail(tradeRef) sorted asc.

## Tutor (tutorAI.js)
- generateTutorResponse(message, desk, tradeContext, chatHistory[]). System prompt = persona + 3 SKB docs + trade context. Socratic, concise, SKB-grounded, prioritizes simulator workflow. Returns choices[0].message.content. Frontend footer: "Powered by Nvidia Nemotron 3".
