import { useState, useRef, useEffect, memo } from "react";
import ContactCard from "./ContactCard";

const ThreadEmail = memo(function ThreadEmail({ 
  msg, sender, toLabel, isLatest, snippet, formatDateFull, senderRaw, trade, 
  previousMessages, getSenderInfo, getRecipientLabel, desk, channel, userId 
}) {
  const [collapsed, setCollapsed] = useState(!isLatest);
  const [showQuoted, setShowQuoted] = useState(false);

  // Determine if sender is external (FO/CPTY) or internal
  const isExternal = senderRaw === "FO" || senderRaw === "COUNTERPARTY" || senderRaw === "CPTY";
  const counterpartyName = trade?.counterparty || "Counterparty";

  return (
    <div className={`thread-email ${isLatest ? "latest" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="thread-email-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="thread-avatar" style={{background: sender.color}}>{sender.initials}</div>
        <div className="thread-meta">
          <div className="thread-from-row">
            <ContactCard
              senderId={senderRaw}
              counterpartyName={counterpartyName}
              isExternal={isExternal}
            >
              <span className="thread-sender" style={{ cursor: "default" }}>{sender.name}</span>
            </ContactCard>
            <span className="thread-date">{formatDateFull(msg.timestamp)}</span>
          </div>
          <div className="thread-to">To: {toLabel}</div>
          {collapsed && <div className="thread-snippet">{snippet}...</div>}
        </div>
        <span className="collapse-arrow">▶</span>
      </div>
      <div className="thread-email-body">
        <div dangerouslySetInnerHTML={{__html: msg.body}} />
        
        {previousMessages && previousMessages.length > 0 && (
          <div className="quoted-history-wrapper">
            <button 
              className={`quoted-history-btn ${showQuoted ? "active" : ""}`} 
              title={showQuoted ? "Hide quoted history" : "Show quoted history"} 
              onClick={() => setShowQuoted(!showQuoted)}
            >
              •••
            </button>
            
            {showQuoted && (
              <div className="quoted-history-container">
                {[...previousMessages].reverse().map((pMsg, i) => {
                  const pSender = getSenderInfo(pMsg.sender, trade);
                  let pMsgMoUser = userId;
                  // We would ideally look back for the MO user like in the parent, but a fallback is fine here
                  const pToLabel = getRecipientLabel(pMsg.sender, trade, desk, channel, userId, userId);
                  
                  // Append dummy email for To if it doesn't have one, just to match the visual format
                  const pToEmail = pToLabel.includes("Counterparty") ? "cpty@external.com" : pToLabel.toLowerCase().replace(/\s+/g, ".") + "@sgb.com";
                  
                  return (
                    <div key={i} className="qh-item">
                      {i === previousMessages.length - 1 && <div className="qh-separator-text">-------- Original message --------</div>}
                      <div className="qh-header-block">
                        <div><strong>From:</strong> {pSender.name} &lt;{pSender.email}&gt;</div>
                        <div><strong>Date:</strong> {formatDateFull(pMsg.timestamp)}</div>
                        <div><strong>To:</strong> {pToLabel} &lt;{pToEmail}&gt;</div>
                        <div><strong>Subject:</strong> RE: {trade.tradeRef}</div>
                      </div>
                      <div className="qh-body" dangerouslySetInnerHTML={{__html: pMsg.body}} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default function MessageThread({
  selectedTradeRef, currentTrade, buildSubject, currentMessages,
  openReplyModal, resolveState, resolveConversation, getSenderInfo,
  userId, desk, channel, getRecipientLabel, formatDateFull, isResolving, readOnly, openSendSSIModal
}) {
  const threadRef = useRef(null);
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [currentMessages]);

  if (!selectedTradeRef || !currentTrade) {
    return (
      <div className="reading-pane">
        <div className="reading-pane-empty">
          <div className="rp-icon">✉</div>
          <div className="rp-text">Select an email to read</div>
        </div>
      </div>
    );
  }

  // ── Workflow badges ──
  const mailStatus = currentTrade.mailStatus;
  const tradeAge = currentTrade.age ?? 0;
  const priority = tradeAge >= 1 ? "High" : "Normal";
  const tradeDateStr = currentTrade.tradeDate
    ? new Date(currentTrade.tradeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="reading-pane">
      <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
        {/* Subject Header */}
        <div className="email-header">
          <div className="email-header-subject">{buildSubject(currentTrade)}</div>
        </div>

        {/* ── Outlook-Style Action Toolbar ── */}
        {readOnly ? (
          <div className="email-actions-bar">
            <span className="resolve-status">🖥️ System notification — read only</span>
          </div>
        ) : (
          <div className="email-actions-bar" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Primary actions */}
              <div className="toolbar-primary">
                <button className="btn-action" onClick={openReplyModal}>↩ Reply</button>
                <button className="btn-action" onClick={openReplyModal}>↩↩ Reply All</button>
                <button className="btn-action" onClick={openReplyModal}>↪ Forward</button>
              </div>

              {currentTrade.direction === "SELL" && currentTrade.settlementType === "BILATERAL" && desk === "SETTLEMENT" && channel !== "FO" && (
                <>
                  <div className="toolbar-separator" />
                  <div className="toolbar-secondary">
                    <button className="btn-action" onClick={openSendSSIModal}>✉ Send SSI</button>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Resolve / Return */}
              <button className="btn-action" disabled={resolveState.disabled || isResolving}
                onClick={resolveState.isClose ? () => window.close() : resolveConversation}>
                {isResolving ? "Resolving..." : resolveState.text}
              </button>
              {resolveState.statusText && <span className="resolve-status">{resolveState.statusText}</span>}
            </div>
          </div>
        )}

        {/* ── Thread Controls ── */}
        {currentMessages.length > 1 && (
          <div className="thread-controls">
            <button className="btn-thread-ctrl" onClick={() => setAllCollapsed(!allCollapsed)}>
              {allCollapsed ? "▶ Expand All" : "▼ Collapse All"}
            </button>
            <button className="btn-thread-ctrl" onClick={() => {
              if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
            }}>
              ↓ Jump to Latest
            </button>
          </div>
        )}

        {/* Email Thread */}
        <div className="email-thread" ref={threadRef}>
          {currentMessages.length === 0 ? (
            <div className="empty-state" style={{padding:"40px"}}><div className="empty-icon">💬</div><div>No messages yet</div></div>
          ) : (
            currentMessages.map((msg, idx) => {
              const isLatest = idx === currentMessages.length - 1;
              const sender = getSenderInfo(msg.sender, currentTrade);
              let msgMoUser = userId;
              for (let i = idx; i >= 0; i--) {
                const pastMsg = currentMessages[i];
                if (pastMsg.sender !== "FO" && pastMsg.sender !== "CPTY" && pastMsg.sender !== "COUNTERPARTY") {
                  msgMoUser = pastMsg.sender;
                  break;
                }
              }
              const toLabel = getRecipientLabel(msg.sender, currentTrade, desk, channel, userId, msgMoUser);
              const snippet = msg.body.substring(0, 60).replace(/\n/g, " ").replace(/<[^>]*>/g, "");
              return (
                <ThreadEmail key={idx} msg={msg} sender={sender} toLabel={toLabel}
                  isLatest={allCollapsed ? false : isLatest}
                  snippet={snippet} formatDateFull={formatDateFull}
                  senderRaw={msg.sender} trade={currentTrade}
                  previousMessages={currentMessages.slice(0, idx)}
                  getSenderInfo={getSenderInfo}
                  getRecipientLabel={getRecipientLabel}
                  desk={desk} channel={channel} userId={userId} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
