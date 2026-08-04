// ======================================
// LEARNING INTROS — 100+ Mentor Phrases
// Randomized per session, no repetition.
// Professional, banking-appropriate tone.
// ======================================

const LEARNING_INTROS = [
  // Encouraging & Coaching
  "Close one! Let's walk through this together.",
  "Good learning opportunity — here's what happened.",
  "This validation protects downstream operations.",
  "Real banks would reject this action — here's why.",
  "This could create a settlement break. Let's review.",
  "Think like a Middle Office analyst for a moment.",
  "You're improving — here's what to keep in mind.",
  "Almost there — one important detail to consider.",
  "Let's take a closer look at this workflow step.",
  "This is exactly the kind of scenario you'll face on a live desk.",

  // Professional Guidance
  "Important operational control — let's understand it.",
  "This validation exists for a critical reason.",
  "Let's review the business logic behind this rule.",
  "Here's how Tier-1 banks handle this situation.",
  "This is a common pitfall — experienced analysts watch for it too.",
  "Operational discipline matters — here's the detail.",
  "Every trade lifecycle has checkpoints like this.",
  "This rule prevents costly downstream errors.",
  "Good catch opportunity — let's walk through the process.",
  "This mirrors a real regulatory requirement.",

  // Mentoring
  "A senior analyst would flag this too. Let's review.",
  "This is precisely the kind of check that prevents breaks.",
  "In a live environment, this would trigger an exception report.",
  "Let's break this down step by step.",
  "Understanding this rule will serve you well on the desk.",
  "This is a foundational operations concept — let's explore it.",
  "Even experienced analysts need to watch for this.",
  "This validation is part of the bank's risk framework.",
  "Think about the downstream impact of this action.",
  "Let's examine why this business rule exists.",

  // Educational
  "Here's an important lesson from the trading floor.",
  "This rule was established after real operational incidents.",
  "Understanding the 'why' behind this check is key.",
  "This is how banks maintain operational integrity.",
  "Let's connect this to the broader trade lifecycle.",
  "This validation protects both the bank and the client.",
  "Every step in the workflow has a purpose — here's this one.",
  "Operational risk management starts with checks like this.",
  "This is the kind of detail that separates good analysts from great ones.",
  "Let's understand the regulatory context behind this rule.",

  // Supportive
  "No worries — this is exactly how we learn.",
  "This is a common question on the operations desk.",
  "Let's turn this into a learning moment.",
  "Great opportunity to deepen your understanding.",
  "Building expertise requires understanding edge cases like this.",
  "Each validation you learn strengthens your operational knowledge.",
  "This is part of the training — let's get it right.",
  "Understanding this now will save time on a live desk.",
  "Think of this as a safeguard, not a barrier.",
  "Let's explore the operational logic together.",

  // Industry Context
  "Here's how this connects to real-world banking operations.",
  "This check is standard across all major investment banks.",
  "Global settlement systems enforce this same rule.",
  "Clearing houses require this validation.",
  "This is a DTCC/Euroclear/Clearstream standard practice.",
  "Regulators expect banks to enforce this control.",
  "This is part of the T+1 settlement discipline.",
  "Post-trade operations relies on checks like this.",
  "Every custodian bank enforces this validation.",
  "This is a key operational risk control point.",

  // Process-Focused
  "Let's review the correct sequence of operations.",
  "The trade lifecycle requires this step — here's why.",
  "This validation ensures data integrity across desks.",
  "Each desk in the chain depends on this being correct.",
  "This check prevents cascading errors downstream.",
  "The confirmation process depends on this validation.",
  "Settlement finality requires this control.",
  "This rule prevents funding issues at end of day.",
  "Nostro reconciliation depends on getting this right.",
  "This check ensures the trade can be matched in clearing.",

  // Empathetic & Constructive
  "This is a nuanced point — let's unpack it.",
  "Even seasoned professionals revisit this concept.",
  "Let's approach this from the counterparty's perspective.",
  "Consider how this looks from a compliance standpoint.",
  "The audit trail depends on this being handled correctly.",
  "Let's think about the client impact for a moment.",
  "Precision in operations prevents costly amendments.",
  "This is where attention to detail really matters.",
  "Let's examine the risk this control mitigates.",
  "Think about what happens next in the settlement chain.",

  // Analytical
  "Let's analyze the business logic behind this check.",
  "Here's the operational reasoning for this rule.",
  "Consider the STP implications of this decision.",
  "This validation ensures regulatory compliance.",
  "The matching engine relies on this being correct.",
  "This affects the bank's capital position — here's how.",
  "Let's look at this from an operational risk perspective.",
  "This control point exists for fail management.",
  "The treasury desk downstream depends on this accuracy.",
  "This validation protects against counterparty risk.",

  // Additional Professional Phrases
  "Let's review the standard operating procedure here.",
  "This is a critical checkpoint in the workflow.",
  "Understanding this will help with similar situations.",
  "Here's the operational context you need.",
  "This validation is your first line of defense.",
  "Let's look at the bigger picture for a moment.",
  "This is how we maintain operational excellence.",
  "Precision here prevents escalation later.",
  "A moment of review now saves hours of correction later.",
  "This mirrors the controls at a global bank's operations center."
];

// Track used intros per userId to avoid repetition within a session
const usedIntrosMap = new Map();

/**
 * Get a random intro that hasn't been used recently for this user.
 * Resets when all intros have been used.
 */
function getRandomIntro(userId) {
  if (!usedIntrosMap.has(userId)) {
    usedIntrosMap.set(userId, new Set());
  }

  const usedSet = usedIntrosMap.get(userId);

  // Reset if all intros have been used
  if (usedSet.size >= LEARNING_INTROS.length) {
    usedSet.clear();
  }

  // Find unused intros
  const available = LEARNING_INTROS.filter((_, idx) => !usedSet.has(idx));
  const chosenIdx = Math.floor(Math.random() * available.length);
  const chosen = available[chosenIdx];

  // Mark as used
  const originalIdx = LEARNING_INTROS.indexOf(chosen);
  usedSet.add(originalIdx);

  return chosen;
}

/**
 * Clear tracking for a user (e.g., on session end)
 */
function resetIntros(userId) {
  usedIntrosMap.delete(userId);
}

module.exports = {
  LEARNING_INTROS,
  getRandomIntro,
  resetIntros
};
