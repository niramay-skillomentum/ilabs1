// ======================================
// LEARNING RULES — Configurable Mistake Registry
// All mistake definitions live here. No hardcoded
// messages in desk components or route handlers.
// ======================================

// ======================================
// SEVERITY LEVELS
// ======================================
const SEVERITY = {
  INFO: { level: "INFO", label: "Minor Guidance", color: "#3b82f6", penalty: 2 },
  WARNING: { level: "WARNING", label: "Business Mistake", color: "#f59e0b", penalty: 5 },
  ERROR: { level: "ERROR", label: "Business Rule Violated", color: "#f97316", penalty: 10 },
  CRITICAL: { level: "CRITICAL", label: "Financial / Operational Impact", color: "#ef4444", penalty: 20 }
};

// ======================================
// MISTAKE DEFINITIONS
// Each entry is a complete learning rule:
//   code, title, severity, message, whyItMatters,
//   realWorldImpact, correctAction, scorePenalty,
//   xpReward, relatedTopic, learnMoreLink
// ======================================
const RULES = {

  // ── TRADE ACTION RULES ────────────────────────

  MISSING_COMMENT: {
    code: "MISSING_COMMENT",
    title: "Missing Mandatory Comment",
    severity: SEVERITY.WARNING,
    message: "A comment is required for this action. Comments provide audit context and support regulatory compliance.",
    whyItMatters: "Every trade action must be documented. In a real bank, the audit trail is reviewed by compliance teams, regulators, and internal auditors. A missing comment creates an accountability gap.",
    realWorldImpact: [
      "Audit trail gap — regulators may flag the trade",
      "Compliance risk during internal or external reviews",
      "No context for downstream desks to understand the decision",
      "Potential regulatory fine for inadequate record-keeping"
    ],
    correctAction: "Add a clear, concise comment explaining your action. For example: 'Trade validated — all booking fields match source system.' or 'Break raised — amount discrepancy of $50,000 identified.'",
    scorePenalty: 5,
    xpReward: 3,
    relatedTopic: "Audit & Compliance",
    learnMoreLink: "/docs/audit-compliance"
  },

  INVALID_STATE_TRANSITION: {
    code: "INVALID_STATE_TRANSITION",
    title: "Invalid Action for Current State",
    severity: SEVERITY.ERROR,
    message: "This action is not available from the trade's current status. Each trade follows a defined lifecycle with specific permitted transitions.",
    whyItMatters: "The trade lifecycle enforces a sequence of operations that ensures proper validation at each stage. Skipping steps or performing out-of-sequence actions can compromise data integrity and operational controls.",
    realWorldImpact: [
      "Trade could bypass critical validation checks",
      "Settlement instructions may be sent before confirmation",
      "Operational risk — incorrect trade data flows downstream",
      "Potential regulatory breach for process violations"
    ],
    correctAction: "Review the trade's current status and determine the correct next action. Check the workflow guide for the valid transitions from this state.",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Trade Lifecycle",
    learnMoreLink: "/docs/trade-lifecycle"
  },

  TRADE_NOT_IN_SESSION: {
    code: "TRADE_NOT_IN_SESSION",
    title: "Trade Not Found in Session",
    severity: SEVERITY.ERROR,
    message: "The selected trade is not assigned to your current session. You can only act on trades in your queue.",
    whyItMatters: "Session isolation ensures that each analyst works on their assigned trades only. This prevents conflicting updates and maintains clear ownership of trade processing.",
    realWorldImpact: [
      "Dual processing risk — two analysts modifying the same trade",
      "Ownership ambiguity in the event of a trade break",
      "Audit trail confusion — actions attributed to wrong analyst"
    ],
    correctAction: "Refresh your queue to ensure you are viewing current assignments. If the trade has been reassigned, coordinate with your team lead.",
    scorePenalty: 5,
    xpReward: 2,
    relatedTopic: "Session Management",
    learnMoreLink: "/docs/session-management"
  },

  // ── MIDDLE OFFICE RULES ───────────────────────

  MO_VALIDATE_FROM_BREAK: {
    code: "MO_VALIDATE_FROM_BREAK",
    title: "Cannot Validate from Break Status",
    severity: SEVERITY.ERROR,
    message: "A trade in MO_BREAK_OPEN status cannot be directly validated. The break must first be escalated to the Front Office for resolution.",
    whyItMatters: "When a break is raised, it indicates a discrepancy between the booking and the source system. The Front Office (trader) must review and confirm or amend the trade before it can proceed. Bypassing this step means the discrepancy remains unresolved.",
    realWorldImpact: [
      "Unresolved discrepancy flows to Confirmation desk",
      "Counterparty receives incorrect trade details",
      "Confirmation break downstream — doubled workload",
      "Settlement failure if economic terms are wrong"
    ],
    correctAction: "1. Select the trade in MO_BREAK_OPEN status\n2. Click 'Send to FO' to open the Front Office mailbox\n3. Compose a clear message describing the discrepancy\n4. Wait for the FO response before validating",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Middle Office Workflow",
    learnMoreLink: "/docs/mo-workflow"
  },

  MO_BREAK_FROM_BREAK: {
    code: "MO_BREAK_FROM_BREAK",
    title: "Break Already Raised",
    severity: SEVERITY.WARNING,
    message: "This trade already has an open break. From MO_BREAK_OPEN, the next step is to escalate to the Front Office.",
    whyItMatters: "Raising a duplicate break creates noise in the system and delays resolution. The correct workflow is to communicate the existing break to the Front Office trader for review.",
    realWorldImpact: [
      "Duplicate exception reports clutter the system",
      "Delays in FO response due to confusion",
      "Audit trail shows redundant actions"
    ],
    correctAction: "Click 'Send to FO' to communicate the break to the Front Office. Include specific details about which fields are mismatched.",
    scorePenalty: 5,
    xpReward: 3,
    relatedTopic: "Break Management",
    learnMoreLink: "/docs/break-management"
  },

  MO_VALIDATE_AWAITING_FO: {
    code: "MO_VALIDATE_AWAITING_FO",
    title: "Front Office Response Pending",
    severity: SEVERITY.ERROR,
    message: "You cannot validate this trade while waiting for the Front Office response. Check the mailbox for updates.",
    whyItMatters: "The Front Office response may contain amendments or confirmations that affect the trade data. Validating before receiving this response means you're passing through potentially incorrect data.",
    realWorldImpact: [
      "Incorrect trade data reaches Confirmation desk",
      "Counterparty dispute if economics are wrong",
      "Amendment cycle required — delays settlement",
      "Potential client complaint"
    ],
    correctAction: "1. Open the Mailbox to check for FO responses\n2. Review any amendments proposed by the trader\n3. Apply accepted amendments\n4. Only then validate the trade",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "FO Communication",
    learnMoreLink: "/docs/fo-communication"
  },

  MO_BREAK_NO_DISCREPANCY: {
    code: "MO_BREAK_NO_DISCREPANCY",
    title: "Break Raised on Clean Trade",
    severity: SEVERITY.ERROR,
    message: "A break cannot be raised because the trade contains no discrepancies. All booking fields match the source system.",
    whyItMatters: "Raising a false break wastes the Front Office's time and creates unnecessary exception processing. In a real bank, this would be flagged as a training issue.",
    realWorldImpact: [
      "Unnecessary escalation to Front Office",
      "Trader's time wasted investigating non-existent issues",
      "Delays processing of the trade and others in the queue",
      "Credibility impact with the trading desk"
    ],
    correctAction: "Compare the trade's booking data against the source system data. If all fields match, validate the trade instead of raising a break.",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Discrepancy Detection",
    learnMoreLink: "/docs/discrepancy-detection"
  },

  MO_WRONG_DISCREPANCIES: {
    code: "MO_WRONG_DISCREPANCIES",
    title: "Incorrect Discrepancy Selection",
    severity: SEVERITY.WARNING,
    message: "The selected discrepancies do not match the actual mismatches in the system records. Review the booking data against the source system data.",
    whyItMatters: "Identifying the correct discrepancies is essential for the Front Office to investigate and resolve the break efficiently. Incorrect selections lead to misdirected investigation.",
    realWorldImpact: [
      "Front Office investigates wrong fields",
      "Resolution delayed — multiple communication rounds needed",
      "Increased operational cost per trade",
      "Aging of the trade in the break queue"
    ],
    correctAction: "1. Inspect the source system data\n2. Compare each field: Amount, Value Date, Currency, Counterparty\n3. Select only the fields that actually differ\n4. Resubmit the break with correct discrepancies",
    scorePenalty: 5,
    xpReward: 4,
    relatedTopic: "Discrepancy Detection",
    learnMoreLink: "/docs/discrepancy-detection"
  },

  MO_VALIDATE_WITH_MISMATCHES: {
    code: "MO_VALIDATE_WITH_MISMATCHES",
    title: "Trade Validated with Undetected Discrepancies",
    severity: SEVERITY.CRITICAL,
    message: "This trade contains discrepancies that were overlooked during validation. The mismatches should have been identified and raised as a break.",
    whyItMatters: "Passing a trade with unresolved discrepancies means incorrect data flows to the Confirmation desk and potentially to the counterparty. This is one of the most serious operational errors.",
    realWorldImpact: [
      "Incorrect trade details sent to counterparty",
      "Confirmation break at next desk",
      "Potential settlement failure",
      "Client complaint and relationship damage",
      "Regulatory scrutiny on the operations team"
    ],
    correctAction: "Always compare the booking data against the source system data before validating. If discrepancies exist, raise a break instead of validating.",
    scorePenalty: 20,
    xpReward: 8,
    relatedTopic: "Validation Best Practices",
    learnMoreLink: "/docs/validation-best-practices"
  },

  MO_CONVERSATION_NOT_RESOLVED: {
    code: "MO_CONVERSATION_NOT_RESOLVED",
    title: "Unresolved Conversation",
    severity: SEVERITY.ERROR,
    message: "You must resolve the ongoing conversation before validating amendments. The conversation with FO/Counterparty contains pending items.",
    whyItMatters: "Open conversations may contain amendments or corrections that need to be applied before the trade can be validated. Closing the conversation prematurely may mean missing critical updates.",
    realWorldImpact: [
      "Pending amendments not applied to the trade",
      "Incorrect data flows downstream",
      "Communication breakdown with Front Office",
      "Repeat break cycle required"
    ],
    correctAction: "1. Open the Mailbox and review the conversation\n2. Apply any accepted amendments\n3. Mark the conversation as resolved\n4. Then validate the trade",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Communication Workflow",
    learnMoreLink: "/docs/communication-workflow"
  },

  MO_SEND_FO_FROM_PENDING: {
    code: "MO_SEND_FO_FROM_PENDING",
    title: "Cannot Send to FO from Pending Status",
    severity: SEVERITY.ERROR,
    message: "From MO_PENDING status, a trade can either be validated or a break can be raised. To communicate with FO, first identify the discrepancy.",
    whyItMatters: "The workflow requires you to first determine whether the trade has a discrepancy. If it does, raise a break — only then can you escalate to FO. If it doesn't, validate it directly.",
    realWorldImpact: [
      "Unnecessary escalation to Front Office",
      "Process violation — skipping the validation step",
      "Delayed trade processing"
    ],
    correctAction: "1. Compare booking data with Truth values\n2. If discrepancies exist → Raise Break → then Send to FO\n3. If no discrepancies → Validate the trade directly",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Middle Office Workflow",
    learnMoreLink: "/docs/mo-workflow"
  },

  // ── CONFIRMATION RULES ────────────────────────

  CONFIRM_WITHOUT_CPTY_CONTACT: {
    code: "CONFIRM_WITHOUT_CPTY_CONTACT",
    title: "Confirmation Without Counterparty Contact",
    severity: SEVERITY.ERROR,
    message: "You must contact the counterparty to verify trade details before confirming. The confirmation process requires bilateral agreement.",
    whyItMatters: "Trade confirmation is a bilateral process. Both parties must agree on the economic terms before a trade is confirmed. Confirming without counterparty verification violates standard market practice.",
    realWorldImpact: [
      "Unilateral confirmation rejected by counterparty",
      "Confirmation break if terms don't match",
      "Settlement failure downstream",
      "Regulatory non-compliance (ISDA/DTCC confirmation rules)"
    ],
    correctAction: "1. Click 'Send to CPTY' to contact the counterparty\n2. Include trade details in the confirmation message\n3. Wait for the counterparty's response\n4. Only then proceed with confirmation",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Confirmation Process",
    learnMoreLink: "/docs/confirmation-process"
  },

  CONFIRM_BREAK_WITHOUT_CPTY: {
    code: "CONFIRM_BREAK_WITHOUT_CPTY",
    title: "Confirmation Break Without Prior Contact",
    severity: SEVERITY.ERROR,
    message: "You can only raise a Confirmation Break after the first contact with the counterparty. The break should be based on a dispute in their response.",
    whyItMatters: "A confirmation break represents a genuine dispute between your records and the counterparty's records. You need evidence of the dispute (their response) before escalating to a break.",
    realWorldImpact: [
      "Premature break escalation — wastes investigation resources",
      "No evidence to support the break in audit",
      "Process violation flagged in compliance review"
    ],
    correctAction: "1. First, send the trade confirmation to the counterparty\n2. Review their response for any disputes\n3. If they dispute terms, then raise a Confirmation Break\n4. Include specific disputed fields in your comment",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Confirmation Breaks",
    learnMoreLink: "/docs/confirmation-breaks"
  },

  // ── SETTLEMENT RULES ──────────────────────────

  SETTLEMENT_CUTOFF_BREACHED: {
    code: "SETTLEMENT_CUTOFF_BREACHED",
    title: "Settlement Cut-off Time Missed",
    severity: SEVERITY.CRITICAL,
    message: "The settlement cut-off for this currency has passed. The trade cannot be settled today and will enter Settlement Break.",
    whyItMatters: "Each currency has a specific daily cut-off time dictated by the local market, clearing house, and central bank. After this time, settlement instructions cannot be processed until the next business day.",
    realWorldImpact: [
      "Trade enters Settlement Break",
      "Funds settle next business day (T+1 delay)",
      "Client may incur penalties or interest charges",
      "Nostro funding impact — unplanned cash position",
      "Regulatory reporting of failed settlement"
    ],
    correctAction: "Prioritize trades by their currency cut-off times. Process currencies with earlier cut-offs first (e.g., JPY/AUD before EUR/GBP before USD). Monitor the simulation clock against the cut-off schedule.",
    scorePenalty: 20,
    xpReward: 8,
    relatedTopic: "Settlement Cut-offs",
    learnMoreLink: "/docs/settlement-cutoffs"
  },

  SETTLEMENT_MISSED_VALUE_DATE: {
    code: "SETTLEMENT_MISSED_VALUE_DATE",
    title: "Missed Value Date — Trade Frozen",
    severity: SEVERITY.CRITICAL,
    message: "This trade has a missed value date break. It is frozen and cannot be processed until the next simulated day.",
    whyItMatters: "When a trade misses its value date cut-off, it becomes a failed settlement. The trade is frozen until the next business day when the settlement instruction can be resubmitted with a new value date.",
    realWorldImpact: [
      "Failed settlement reported to the market",
      "Client incurs additional costs (funding, penalties)",
      "Bank's settlement efficiency metrics impacted",
      "Potential regulatory reporting requirement",
      "Counterparty relationship strain"
    ],
    correctAction: "On the next simulated day, contact the counterparty to arrange new settlement terms. The trade must be re-instructed with updated settlement details.",
    scorePenalty: 20,
    xpReward: 8,
    relatedTopic: "Failed Settlements",
    learnMoreLink: "/docs/failed-settlements"
  },

  SETTLEMENT_CPTY_NOT_ACKNOWLEDGED: {
    code: "SETTLEMENT_CPTY_NOT_ACKNOWLEDGED",
    title: "Counterparty SSI Not Acknowledged",
    severity: SEVERITY.ERROR,
    message: "Cannot approve this settlement. For SELL bilateral trades, the counterparty must first acknowledge receipt of the Standing Settlement Instructions (SSI).",
    whyItMatters: "In bilateral settlement, both parties must agree on the settlement instructions. For SELL trades, the bank sends its SSI to the counterparty, who must confirm they have the correct details to send funds.",
    realWorldImpact: [
      "Funds may be sent to the wrong account",
      "Settlement failure due to SSI mismatch",
      "Manual intervention required to redirect funds",
      "Potential financial loss if funds are misdirected"
    ],
    correctAction: "1. Check the Mailbox for the counterparty's SSI acknowledgement\n2. If not received, contact the counterparty to confirm SSI details\n3. Wait for their acknowledgement before approving",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "SSI Management",
    learnMoreLink: "/docs/ssi-management"
  },

  SETTLEMENT_WRONG_STATUS_FOR_AMEND: {
    code: "SETTLEMENT_WRONG_STATUS_FOR_AMEND",
    title: "Invalid Status for Amendment",
    severity: SEVERITY.ERROR,
    message: "Amendments can only be requested from a raised break or after a failed verification. The trade must first be in SETTLEMENT_BREAK or REJECTED_REVERIFY status.",
    whyItMatters: "The amendment workflow is triggered only when a specific problem has been identified. Requesting amendments without a documented break undermines the control framework.",
    realWorldImpact: [
      "Unnecessary amendments create confusion",
      "Audit trail shows action without justification",
      "Settlement instructions may be modified incorrectly"
    ],
    correctAction: "1. First, raise a Settlement Break to document the issue\n2. Then request the amendment from the break status\n3. Select the correct SSI from the database if applicable",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Amendment Workflow",
    learnMoreLink: "/docs/amendment-workflow"
  },

  SETTLEMENT_NOT_AMENDED: {
    code: "SETTLEMENT_NOT_AMENDED",
    title: "Trade Not Amended Before Approval",
    severity: SEVERITY.ERROR,
    message: "The trade must be in AMENDED status before it can be sent for approval. Complete the amendment process first.",
    whyItMatters: "The approval workflow verifies that the amendment was correctly applied. Sending an unamended trade for approval means the verification bot will reject it, wasting processing time.",
    realWorldImpact: [
      "Verification bot rejects the trade",
      "Additional processing cycle required",
      "Delays in settlement"
    ],
    correctAction: "1. Request an amendment from the settlement break\n2. Wait for the system to process the amendment\n3. Verify the trade status changes to AMENDED\n4. Then send for approval",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Amendment Workflow",
    learnMoreLink: "/docs/amendment-workflow"
  },

  SETTLEMENT_NOT_APPROVED: {
    code: "SETTLEMENT_NOT_APPROVED",
    title: "Trade Not Approved for Settlement",
    severity: SEVERITY.ERROR,
    message: "The trade must be in APPROVED status before it can be settled. The verification process must complete first.",
    whyItMatters: "The approval step is the final control before settlement. It verifies that all settlement details match the expected values. Settling without approval bypasses this critical check.",
    realWorldImpact: [
      "Settlement with potentially incorrect details",
      "Financial loss if wrong SSI is used",
      "Regulatory breach — bypassing approval controls"
    ],
    correctAction: "1. Send the trade for approval\n2. Wait for the verification bot to process\n3. If rejected, review errors and re-amend\n4. Once APPROVED, proceed with settlement",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Settlement Approval",
    learnMoreLink: "/docs/settlement-approval"
  },

  SETTLEMENT_CUTOFF_AMEND_BLOCKED: {
    code: "SETTLEMENT_CUTOFF_AMEND_BLOCKED",
    title: "Amendment Blocked After Cut-off",
    severity: SEVERITY.CRITICAL,
    message: "The settlement cut-off for this currency has passed. Amendments are no longer permitted for today.",
    whyItMatters: "After the currency cut-off, the settlement window is closed. Amendments cannot be processed because settlement instructions have already been finalized for the day.",
    realWorldImpact: [
      "Amendment cannot be processed until next business day",
      "Trade remains in break status overnight",
      "Potential failed settlement",
      "Funding impact on nostro accounts"
    ],
    correctAction: "Process amendments before the currency cut-off time. Prioritize trades with tight cut-off windows. On the next day, process the amendment as early as possible.",
    scorePenalty: 20,
    xpReward: 8,
    relatedTopic: "Settlement Cut-offs",
    learnMoreLink: "/docs/settlement-cutoffs"
  },

  SETTLEMENT_MAIL_CPTY_REQUIRED: {
    code: "SETTLEMENT_MAIL_CPTY_REQUIRED",
    title: "Counterparty Contact Required",
    severity: SEVERITY.ERROR,
    message: "This trade has a missed value date break. You must liaise with the counterparty before taking other actions.",
    whyItMatters: "After a missed value date, the counterparty must be notified to arrange new settlement terms. Attempting other actions before this communication step violates the break resolution process.",
    realWorldImpact: [
      "Counterparty unaware of the settlement failure",
      "New value date not agreed upon",
      "Continued settlement break"
    ],
    correctAction: "1. Click 'Mail CPTY' to contact the counterparty\n2. Inform them of the missed value date\n3. Agree on new settlement terms\n4. Then proceed with the amended settlement",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Failed Settlement Resolution",
    learnMoreLink: "/docs/failed-settlement-resolution"
  },

  SETTLEMENT_APPROVE_FROM_PENDING: {
    code: "SETTLEMENT_APPROVE_FROM_PENDING",
    title: "Cannot Approve from Settlement Pending",
    severity: SEVERITY.ERROR,
    message: "A trade in Settlement Pending cannot be approved directly. You must first contact the counterparty to verify their settlement instructions before proceeding.",
    whyItMatters: "Settlement requires bilateral agreement on Standing Settlement Instructions (SSI). Both parties must exchange and verify SSI details before settlement can be approved. Approving without this verification risks sending funds to incorrect accounts.",
    realWorldImpact: [
      "Funds may be sent to the wrong account",
      "Settlement failure due to unverified SSI",
      "Counterparty dispute on settlement terms",
      "Regulatory breach — bypassing bilateral verification controls"
    ],
    correctAction: "1. Click 'Mail CPTY' to contact the counterparty\n2. Verify their Standing Settlement Instructions (SSI)\n3. Wait for their response in the Mailbox\n4. Only then approve the settlement",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Settlement Workflow",
    learnMoreLink: "/docs/settlement-workflow"
  },

  SETTLEMENT_BREAK_FROM_PENDING: {
    code: "SETTLEMENT_BREAK_FROM_PENDING",
    title: "Cannot Raise Break from Settlement Pending",
    severity: SEVERITY.ERROR,
    message: "A Settlement Break cannot be raised directly from Settlement Pending. You must first contact the counterparty to verify settlement instructions. A break should only be raised when there is a confirmed discrepancy.",
    whyItMatters: "Raising a break without first contacting the counterparty is premature. There may be no actual discrepancy — the break process should be evidence-based, triggered only after SSI comparison reveals a mismatch.",
    realWorldImpact: [
      "Premature break wastes investigation resources",
      "No evidence to support the break in audit",
      "Delays settlement processing unnecessarily",
      "Process violation flagged in compliance review"
    ],
    correctAction: "1. Click 'Mail CPTY' to contact the counterparty\n2. Review their SSI details when they respond\n3. Compare against your system records\n4. If discrepancy found, then raise a Settlement Break",
    scorePenalty: 10,
    xpReward: 5,
    relatedTopic: "Settlement Breaks",
    learnMoreLink: "/docs/settlement-breaks"
  },

  SETTLEMENT_CPTY_ALREADY_MAILED: {
    code: "SETTLEMENT_CPTY_ALREADY_MAILED",
    title: "Counterparty Has Already Mailed",
    severity: SEVERITY.WARNING,
    message: "The counterparty has already sent you their settlement details for this trade. You should always check the Mailbox first before reaching out — you may have missed their communication.",
    whyItMatters: "The counterparty's response contains critical SSI details needed for settlement. Missing their response leads to duplicate communications, delays, and demonstrates a lack of attention to the inbox.",
    realWorldImpact: [
      "Duplicate communication with counterparty — unprofessional",
      "Counterparty may question your operational competence",
      "Delayed settlement while waiting for a response you already have",
      "Missed SSI details could lead to settlement failure"
    ],
    correctAction: "1. Open the Mailbox to check for counterparty messages\n2. Review the SSI details they have already provided\n3. Compare against your system records\n4. Proceed with approval or raise a break based on your findings",
    scorePenalty: 5,
    xpReward: 3,
    relatedTopic: "Settlement Communication",
    learnMoreLink: "/docs/settlement-communication"
  },

  // ── RECONCILIATION RULES ──────────────────────

  RECON_MISSING_FIELDS: {
    code: "RECON_MISSING_FIELDS",
    title: "Missing Required Reconciliation Fields",
    severity: SEVERITY.WARNING,
    message: "Both an Item ID and a Trade Reference are required for this reconciliation action.",
    whyItMatters: "Reconciliation requires matching specific items between ledger and statement records. Without proper identifiers, the system cannot validate the match.",
    realWorldImpact: [
      "Incomplete reconciliation data",
      "Unmatched items remain in the exception queue",
      "End-of-day reconciliation gaps"
    ],
    correctAction: "Ensure both the Item ID and Trade Reference fields are populated before submitting.",
    scorePenalty: 2,
    xpReward: 2,
    relatedTopic: "Reconciliation Process",
    learnMoreLink: "/docs/reconciliation"
  },

  RECON_MISSING_PAIR: {
    code: "RECON_MISSING_PAIR",
    title: "Incomplete Match Selection",
    severity: SEVERITY.WARNING,
    message: "Manual matching requires selecting one Ledger item and one Statement item.",
    whyItMatters: "Reconciliation matching pairs a ledger entry with its corresponding bank statement entry. Both sides are required for the matching engine to validate the economics.",
    realWorldImpact: [
      "Match cannot be processed",
      "Items remain in unmatched queue",
      "Reconciliation exceptions increase"
    ],
    correctAction: "1. Select one Ledger item from the left panel\n2. Select one Statement item from the right panel\n3. Verify the economics match (amount, currency, trade ref)\n4. Click Match to submit the pair",
    scorePenalty: 2,
    xpReward: 2,
    relatedTopic: "Manual Matching",
    learnMoreLink: "/docs/manual-matching"
  },

  // ── GENERIC RULES ─────────────────────────────

  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    title: "Permission Denied",
    severity: SEVERITY.ERROR,
    message: "You do not have the required permissions to perform this action.",
    whyItMatters: "Separation of duties is a fundamental control in banking operations. Each role has defined permissions to prevent unauthorized actions.",
    realWorldImpact: [
      "Potential segregation of duties violation",
      "Compliance audit finding",
      "Unauthorized trade modification risk"
    ],
    correctAction: "Verify that you are logged into the correct desk and role. If you believe you should have access, contact your team lead.",
    scorePenalty: 5,
    xpReward: 2,
    relatedTopic: "Access Controls",
    learnMoreLink: "/docs/access-controls"
  },

  ELECTRONIC_SETTLEMENT_ONLY: {
    code: "ELECTRONIC_SETTLEMENT_ONLY",
    title: "Electronic Settlement — Use STCC Dashboard",
    severity: SEVERITY.INFO,
    message: "Electronic settlement trades must be processed through the STCC (Securities Transaction Clearing Corporation) Electronic Settlement dashboard, not the bilateral workstation.",
    whyItMatters: "Electronic and bilateral settlements follow different processing workflows. Electronic trades are matched and settled through central clearing systems (like DTCC or Euroclear), which have their own interface.",
    realWorldImpact: [
      "Processing on wrong platform causes errors",
      "Central clearing system may reject the instruction",
      "Duplicate processing risk"
    ],
    correctAction: "Click the 'STCC Electronic Settlement' button to open the correct dashboard for this trade type.",
    scorePenalty: 2,
    xpReward: 2,
    relatedTopic: "Settlement Types",
    learnMoreLink: "/docs/settlement-types"
  },

  SELECT_TRADE_FIRST: {
    code: "SELECT_TRADE_FIRST",
    title: "No Trade Selected",
    severity: SEVERITY.INFO,
    message: "Please select a trade from the queue before performing an action.",
    whyItMatters: "All operations actions are performed on specific trades. The system needs to know which trade you intend to act on.",
    realWorldImpact: [
      "Action cannot be processed without a target trade"
    ],
    correctAction: "Click on a trade row in the queue to select it, then perform the desired action.",
    scorePenalty: 0,
    xpReward: 0,
    relatedTopic: "Workstation Basics",
    learnMoreLink: "/docs/workstation-basics"
  }
};

// ======================================
// ERROR STRING → RULE CODE MAPPING
// Maps existing backend error messages to rule codes
// so the Learning Engine can look up the right rule
// without changing existing validation logic.
// ======================================
const ERROR_TO_RULE_MAP = {
  "Comment is mandatory": "MISSING_COMMENT",
  "Trade not found in session": "TRADE_NOT_IN_SESSION",
  "Invalid action for current state": "INVALID_STATE_TRANSITION",
  "Invalid action": "INVALID_STATE_TRANSITION",
  "Await FO response before validating": "MO_VALIDATE_AWAITING_FO",
  "Cannot approve. Counterparty has not acknowledged the SSI.": "SETTLEMENT_CPTY_NOT_ACKNOWLEDGED",
  "Resolve conversation before validating amendments": "MO_CONVERSATION_NOT_RESOLVED",
  "Action Denied: A break cannot be raised as the trade contains no discrepancies.": "MO_BREAK_NO_DISCREPANCY",
  "The selected discrepancies do not match the system records.": "MO_WRONG_DISCREPANCIES",
  "You must attempt to confirm the trade details with the Counterparty prior to proceeding.": "CONFIRM_WITHOUT_CPTY_CONTACT",
  "You can only raise a Confirmation Break once, immediately after the first time you mail the Counterparty.": "CONFIRM_BREAK_WITHOUT_CPTY",
  "Amendment can only be requested from a raised break or after a failed verification.": "SETTLEMENT_WRONG_STATUS_FOR_AMEND",
  "Trade must be AMENDED before it can be sent for approval.": "SETTLEMENT_NOT_AMENDED",
  "Trade must be APPROVED before settlement.": "SETTLEMENT_NOT_APPROVED",
  "Trade has a missed value date break. You must liaise with the counterparty first.": "SETTLEMENT_MAIL_CPTY_REQUIRED",
  "Select one Ledger and one Statement item.": "RECON_MISSING_PAIR",
  "Item ID and Trade Reference are required.": "RECON_MISSING_FIELDS",
  "You cannot approve a trade directly from Settlement Pending.": "SETTLEMENT_APPROVE_FROM_PENDING",
  "A Settlement Break cannot be raised directly from Settlement Pending.": "SETTLEMENT_BREAK_FROM_PENDING",
  "The counterparty has already sent you their settlement details for this trade.": "SETTLEMENT_CPTY_ALREADY_MAILED"
};

/**
 * Lookup a rule by its code.
 */
function getRule(code) {
  return RULES[code] || null;
}

/**
 * Try to find a rule from an error message string.
 * Falls back to INVALID_STATE_TRANSITION if no match.
 */
function getRuleFromError(errorMessage) {
  if (!errorMessage) return null;

  // Exact match first
  if (ERROR_TO_RULE_MAP[errorMessage]) {
    return RULES[ERROR_TO_RULE_MAP[errorMessage]] || null;
  }

  // Partial match — check if the error message contains any key
  for (const [errorStr, ruleCode] of Object.entries(ERROR_TO_RULE_MAP)) {
    if (errorMessage.includes(errorStr) || errorStr.includes(errorMessage)) {
      return RULES[ruleCode] || null;
    }
  }

  // Check for cutoff-related errors
  if (errorMessage.includes("cut-off") || errorMessage.includes("cutoff") || errorMessage.includes("Cut-off")) {
    if (errorMessage.includes("Amendment")) return RULES.SETTLEMENT_CUTOFF_AMEND_BLOCKED;
    return RULES.SETTLEMENT_CUTOFF_BREACHED;
  }

  // Check for missed value date
  if (errorMessage.includes("missed value date") || errorMessage.includes("Missed Value Date")) {
    return RULES.SETTLEMENT_MISSED_VALUE_DATE;
  }

  return null;
}

/**
 * Get all rules (for admin/analytics).
 */
function getAllRules() {
  return Object.values(RULES);
}

module.exports = {
  SEVERITY,
  RULES,
  ERROR_TO_RULE_MAP,
  getRule,
  getRuleFromError,
  getAllRules
};
