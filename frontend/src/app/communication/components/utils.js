export const formatDate = (ts) => new Date(ts).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });

export const formatDateFull = (ts) => new Date(ts).toLocaleString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });

export const formatAmount = (amount) => Number(amount).toLocaleString();

export const buildSubject = (trade) => {
  if (!trade) return "";
  const vd = new Date(trade.valueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
  return `${trade.counterparty} | ${trade.tradeRef} | ${trade.currency} ${formatAmount(trade.amount)} | ${vd}`;
};

export const getSenderInfo = (sender, trade) => {
  if (sender === "System" || sender === "SYSTEM") return { name: "System", email: "system@skillomentum.com", initials: "SY", color: "#005a9e" };
  if (sender === "FO") {
    const reg = (trade?.foRegion || trade?.region || "americas").toLowerCase();
    const regionName = reg === "amer" ? "americas" : reg;
    return { name: "Front Office Trading Desk", email: `fo-operations-${regionName}@skillomentum.com`, initials: "FO", color: "#004578" };
  }
  if (sender === "COUNTERPARTY" || sender === "CPTY") {
    const cpName = trade ? trade.counterparty : "Counterparty";
    const domain = (cpName || "cpty").toLowerCase().replace(/[^a-z0-9]/g, "");
    return { name: cpName + " Operations", email: `operations@${domain}.com`, initials: (cpName||"CP").substring(0,2).toUpperCase(), color: "#0078d4" };
  }
  return { name: sender, email: sender, initials: (sender||"").substring(0,2).toUpperCase(), color: "#0f6cbd" };
};

export const getRecipientLabel = (sender, trade, dsk, ch, uid, msgMoUser) => {
  const targetUser = msgMoUser || uid;
  if (sender !== "FO" && sender !== "CPTY" && sender !== "COUNTERPARTY") {
    if (trade) {
      if (trade.currentStatus && (trade.currentStatus.startsWith("MO") || trade.currentStatus === "PENDING_FO_RESPONSE" || trade.currentStatus === "LIASING_WITH_FO")) {
        const reg = (trade?.foRegion || trade?.region || "americas").toLowerCase();
        const regionName = reg === "amer" ? "americas" : reg;
        return `Front Office Trading Desk <fo-operations-${regionName}@skillomentum.com>`;
      }
      const domain = (trade.counterparty || "cpty").toLowerCase().replace(/[^a-z0-9]/g, "");
      return trade.counterparty + ` Operations <operations@${domain}.com>`;
    }
    if (ch === "FO") return "Front Office Trading Desk <fo-operations-americas@skillomentum.com>";
    return dsk + " Desk";
  }
  return targetUser + " <" + targetUser + ">";
};

// ── Dynamic status badge (consumes backend-computed mailStatus) ──
export const getStatusBadge = (trade) => {
  // If backend has attached a computed mailStatus, use it directly
  if (trade.mailStatus && trade.mailStatus.label) {
    return (
      <span
        className={`status-badge ${trade.mailStatus.badgeClass || "badge-info"}`}
        style={{ backgroundColor: trade.mailStatus.color ? undefined : undefined }}
      >
        {trade.mailStatus.label}
      </span>
    );
  }

  // If there's no mail status (e.g. not an "Awaiting" state), don't show a badge
  return null;
};

// ── Short desk label for cross-desk inbox ──
const DESK_SHORT = {
  MO: "MO",
  CONFIRMATION: "CONF",
  SETTLEMENT: "SETT",
  RECONCILIATION: "RECON",
};

export const getDeskBadge = (trade) => {
  const desk = trade.mailStatus?.desk || trade.nextDesk;
  if (!desk) return null;
  const label = DESK_SHORT[desk] || desk;
  return <span className="desk-badge-mini">{label}</span>;
};
