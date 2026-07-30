// ======================================
// MAIL STATUS RESOLVER
// Centralized module that computes the human-readable
// mailbox status for any trade based on its current
// workflow state. The frontend consumes this directly
// and never computes status on its own.
// ======================================

/**
 * Infer the desk from trade state when desk is not provided
 * (needed for cross-desk personal inbox).
 */
function inferDesk(trade) {
  const s = trade.currentStatus;
  if (!s) return null;
  if (s.startsWith("MO") || s === "PENDING_FO_RESPONSE") return "MO";
  if (s.startsWith("CONFIRMATION") || s === "LIASING_WITH_FO") return "CONFIRMATION";
  if (s.startsWith("SETTLEMENT") || s === "PENDING_AMENDMENT" || s === "AMENDED" ||
      s === "PENDING_APPROVAL" || s === "APPROVED" || s === "SETTLED" ||
      s === "READY_FOR_APPROVAL" || s === "REJECTED_REVERIFY") return "SETTLEMENT";
  if (s.startsWith("RECON") || s === "UNMATCHED_BY_USER") return "RECONCILIATION";
  if (s === "LIASING_WITH_CPTY") {
    // Ambiguous — use nextDesk or fallback
    return trade.nextDesk || "SETTLEMENT";
  }
  return null;
}

/**
 * Resolve a human-readable mail status from trade state.
 *
 * @param {Object} trade  — trade document (lean or toObject)
 * @param {string} [desk] — current desk context (optional, will be inferred)
 * @returns {{ label: string, color: string, badgeClass: string, desk: string }}
 */
function resolveMailStatus(trade, desk) {
  if (!trade) return { label: "Unknown", color: "#a19f9d", badgeClass: "badge-unknown", desk: null };

  const resolvedDesk = desk || inferDesk(trade) || trade.nextDesk || "UNKNOWN";
  const s = trade.currentStatus;

  // Conversation resolved
  if (trade.conversation && trade.conversation.status === "RESOLVED") {
    return { label: "Resolved", color: "#004578", badgeClass: "badge-resolved", desk: resolvedDesk };
  }

  // ── MIDDLE OFFICE ──
  if (resolvedDesk === "MO") {
    if (s === "PENDING_FO_RESPONSE" || (s === "MO_PENDING" && !trade.foResponseReceived)) {
      return { label: "Awaiting Front Office Response", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
  }

  // ── CONFIRMATION DESK ──
  if (resolvedDesk === "CONFIRMATION") {
    if (s === "LIASING_WITH_CPTY" && !trade.cptyResponseReceived) {
      return { label: "Awaiting Counterparty Response", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
  }

  // ── SETTLEMENT DESK ──
  if (resolvedDesk === "SETTLEMENT") {
    if (s === "LIASING_WITH_CPTY" && !trade.cptyResponseReceived) {
      return { label: "Awaiting Counterparty Response", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
  }

  // ── RECONCILIATION DESK ──
  // No awaiting statuses needed for Recon based on current spec

  // Return null for all other states so no badge is rendered
  return null;
}

module.exports = { resolveMailStatus, inferDesk };
