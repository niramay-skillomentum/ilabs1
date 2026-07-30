import { useState, useRef, useEffect, memo } from "react";
import ContactCard from "./ContactCard";

const ThreadEmail = memo(function ThreadEmail({ msg, sender, toLabel, isLatest, snippet, formatDateFull, senderRaw, trade }) {
  const [collapsed, setCollapsed] = useState(!isLatest);

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
      <div className="thread-email-body" dangerouslySetInnerHTML={{__html: msg.body}} />
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

          {/* Workflow Badge Bar */}
          <div className="workflow-badges">
            <span className="wf-badge"><span className="wf-badge-label">Trade</span>{currentTrade.tradeRef}</span>
            <span className="wf-badge"><span className="wf-badge-label">Desk</span>{mailStatus?.desk || desk || "—"}</span>
            <span className="wf-badge"><span className="wf-badge-label">Priority</span><span className={priority === "High" ? "wf-high" : ""}>{priority}</span></span>
            {mailStatus && <span className="wf-badge"><span className="wf-badge-label">Workflow</span>{mailStatus.label}</span>}
            <span className="wf-badge"><span className="wf-badge-label">Trade Date</span>{tradeDateStr}</span>
            <span className="wf-badge"><span className="wf-badge-label">Messages</span>{currentMessages.length}</span>
            {currentTrade.counterparty && <span className="wf-badge"><span className="wf-badge-label">CPTY</span>{currentTrade.counterparty}</span>}
          </div>
        </div>

        {/* ── Outlook-Style Action Toolbar ── */}
        {readOnly ? (
          <div className="email-actions-bar">
            <span className="resolve-status">🖥️ System notification — read only</span>
          </div>
        ) : (
          <div className="email-actions-bar">
            {/* Primary actions (left) */}
            <div className="toolbar-primary">
              <button className="btn-action primary" onClick={openReplyModal}>↩ Reply</button>
              <button className="btn-action" onClick={openReplyModal}>↩↩ Reply All</button>
              <button className="btn-action" onClick={openReplyModal}>↪ Forward</button>
            </div>

            <div className="toolbar-separator" />

            {/* Secondary actions (right) */}
            <div className="toolbar-secondary">
              {currentTrade.direction === "SELL" && currentTrade.settlementType === "BILATERAL" && desk === "SETTLEMENT" && channel !== "FO" && (
                <button className="btn-action" style={{backgroundColor:"#0078d4", color:"white"}} onClick={openSendSSIModal}>✉ Send SSI</button>
              )}
              <button className="btn-action" title="Flag"><span>🚩</span></button>
              <button className="btn-action" title="Mark as Read"><span>✉</span></button>
              <button className="btn-action" title="Print" onClick={() => window.print()}><span>🖨</span></button>
              <button className="btn-action" title="Delete"><span>🗑</span></button>
            </div>

            <div className="toolbar-separator" />

            {/* Resolve / Return */}
            <button className="btn-action resolve" disabled={resolveState.disabled || isResolving}
              onClick={resolveState.isClose ? () => window.close() : resolveConversation}>
              {isResolving ? "Resolving..." : resolveState.text}
            </button>
            {resolveState.statusText && <span className="resolve-status">{resolveState.statusText}</span>}
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
                  senderRaw={msg.sender} trade={currentTrade} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
