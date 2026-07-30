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
    if (s === "PENDING_FO_RESPONSE") {
      return { label: "Awaiting Front Office Response", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "MO_PENDING" && !trade.foResponseReceived) {
      return { label: "Awaiting Front Office Response", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "MO_PENDING" && trade.foResponseReceived) {
      return { label: "Awaiting Middle Office Review", color: "#107c10", badgeClass: "badge-responded", desk: resolvedDesk };
    }
    if (s === "MO_BREAK_OPEN") {
      return { label: "Query Raised", color: "#d13438", badgeClass: "badge-break", desk: resolvedDesk };
    }
    if (s === "CONFIRMATION_PENDING") {
      return { label: "Validation Completed", color: "#107c10", badgeClass: "badge-resolved", desk: resolvedDesk };
    }
  }

  // ── CONFIRMATION DESK ──
  if (resolvedDesk === "CONFIRMATION") {
    if (s === "LIASING_WITH_CPTY" && !trade.cptyResponseReceived) {
      return { label: "Awaiting Counterparty Confirmation", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "LIASING_WITH_CPTY" && trade.cptyResponseReceived) {
      return { label: "Counterparty Confirmed", color: "#107c10", badgeClass: "badge-responded", desk: resolvedDesk };
    }
    if (s === "CONFIRMATION_BREAK") {
      return { label: "Confirmation Break", color: "#d13438", badgeClass: "badge-break", desk: resolvedDesk };
    }
    if (s === "LIASING_WITH_FO") {
      return { label: "Awaiting Internal Review", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "CONFIRMATION_PENDING") {
      return { label: "Awaiting Confirmation Team Action", color: "#0078d4", badgeClass: "badge-info", desk: resolvedDesk };
    }
  }

  // ── SETTLEMENT DESK ──
  if (resolvedDesk === "SETTLEMENT") {
    if (s === "SETTLEMENT_BREAK" && trade.cutoffMissedReason) {
      return { label: "Cutoff Missed", color: "#d13438", badgeClass: "badge-break", desk: resolvedDesk };
    }
    if (s === "SETTLEMENT_BREAK") {
      return { label: "Settlement Break", color: "#d13438", badgeClass: "badge-break", desk: resolvedDesk };
    }
    if (s === "SETTLEMENT_PENDING") {
      return { label: "Awaiting Settlement Team Action", color: "#0078d4", badgeClass: "badge-info", desk: resolvedDesk };
    }
    if (s === "LIASING_WITH_CPTY" && !trade.cptyResponseReceived) {
      return { label: "Awaiting Counterparty SSI", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "LIASING_WITH_CPTY" && trade.cptyResponseReceived) {
      return { label: "Awaiting Cash Confirmation", color: "#107c10", badgeClass: "badge-responded", desk: resolvedDesk };
    }
    if (s === "PENDING_APPROVAL" || s === "READY_FOR_APPROVAL") {
      return { label: "Awaiting Settlement Approval", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "PENDING_AMENDMENT") {
      return { label: "Pending Amendment", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "AMENDED") {
      return { label: "Trade Amended", color: "#0078d4", badgeClass: "badge-info", desk: resolvedDesk };
    }
    if (s === "SETTLED") {
      return { label: "Settlement Completed", color: "#107c10", badgeClass: "badge-resolved", desk: resolvedDesk };
    }
  }

  // ── RECONCILIATION DESK ──
  if (resolvedDesk === "RECONCILIATION") {
    if (s === "RECON_PENDING") {
      return { label: "Awaiting Ledger Match", color: "#835c00", badgeClass: "badge-awaiting", desk: resolvedDesk };
    }
    if (s === "UNMATCHED_BY_USER") {
      return { label: "Exception Raised", color: "#d13438", badgeClass: "badge-break", desk: resolvedDesk };
    }
    if (s === "RECON_CLEARED") {
      return { label: "Fully Matched", color: "#107c10", badgeClass: "badge-resolved", desk: resolvedDesk };
    }
  }

  // ── FALLBACK ──
  // Generic status derived from the raw trade status
  const friendlyStatus = (s || "Unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return { label: friendlyStatus, color: "#605e5c", badgeClass: "badge-info", desk: resolvedDesk };
}

module.exports = { resolveMailStatus, inferDesk };
