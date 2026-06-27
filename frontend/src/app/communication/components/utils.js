export const formatDate = (ts) => new Date(ts).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });

export const formatDateFull = (ts) => new Date(ts).toLocaleString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });

export const formatAmount = (amount) => Number(amount).toLocaleString();

export const buildSubject = (trade) => {
  if (!trade) return "";
  const vd = new Date(trade.valueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
  return `${trade.tradeRef} | ${trade.currency} ${formatAmount(trade.amount)} | ${vd}`;
};

export const getSenderInfo = (sender, trade) => {
  if (sender === "FO") return { name: "Front Office Trading Desk", email: "fo.trading@sgb.com", initials: "FO", color: "#c4314b" };
  if (sender === "COUNTERPARTY" || sender === "CPTY") {
    const cpName = trade ? trade.counterparty : "Counterparty";
    return { name: cpName + " Operations", email: `operations@${(cpName||"cpty").toLowerCase()}.com`, initials: (cpName||"CP").substring(0,2).toUpperCase(), color: "#107c10" };
  }
  return { name: sender, email: sender, initials: (sender||"").substring(0,2).toUpperCase(), color: "#0f6cbd" };
};

export const getRecipientLabel = (sender, trade, dsk, ch, uid, msgMoUser) => {
  const targetUser = msgMoUser || uid;
  if (sender !== "FO" && sender !== "CPTY" && sender !== "COUNTERPARTY") {
    if (trade) {
      if (trade.currentStatus && (trade.currentStatus.startsWith("MO") || trade.currentStatus === "PENDING_FO_RESPONSE" || trade.currentStatus === "LIASING_WITH_FO")) {
        return "Front Office Trading Desk <fo.trading@sgb.com>";
      }
      return trade.counterparty + " Operations <operations@" + trade.counterparty.toLowerCase() + ".com>";
    }
    if (ch === "FO") return "Front Office Trading Desk <fo.trading@sgb.com>";
    return dsk + " Desk";
  }
  return targetUser + " <" + targetUser + ">";
};

export const getStatusBadge = (trade) => {
  const status = trade.currentStatus;
  const isFoPendingState = status === "PENDING_FO_RESPONSE" || status === "LIASING_WITH_FO";
  if (trade.conversation && trade.conversation.status === "RESOLVED") return <span className="status-badge badge-resolved">Resolved</span>;
  if (isFoPendingState && trade.foResponseReceived) return <span className="status-badge badge-responded">FO Responded</span>;
  if (status === "MO_PENDING" && trade.foResponseReceived) return <span className="status-badge badge-responded">FO Responded (Clean)</span>;
  if (isFoPendingState && !trade.foResponseReceived) return <span className="status-badge badge-awaiting">Awaiting FO</span>;
  if (status === "LIASING_WITH_CPTY") return <span className="status-badge badge-awaiting">Awaiting CPTY</span>;
  return null;
};
