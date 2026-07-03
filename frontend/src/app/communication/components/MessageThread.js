import { useState } from "react";

function ThreadEmail({ msg, sender, toLabel, isLatest, snippet, formatDateFull }) {
  const [collapsed, setCollapsed] = useState(!isLatest);
  return (
    <div className={`thread-email ${isLatest ? "latest" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="thread-email-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="thread-avatar" style={{background: sender.color}}>{sender.initials}</div>
        <div className="thread-meta">
          <div className="thread-from-row">
            <span className="thread-sender">{sender.name}</span>
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
}

export default function MessageThread({
  selectedTradeRef, currentTrade, buildSubject, currentMessages,
  openReplyModal, resolveState, resolveConversation, getSenderInfo,
  userId, desk, channel, getRecipientLabel, formatDateFull, isResolving, readOnly
}) {
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

  return (
    <div className="reading-pane">
      <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
        {/* Subject Header */}
        <div className="email-header">
          <div className="email-header-subject">{buildSubject(currentTrade)}</div>
          <div className="email-header-meta">
            <div className="meta-item"><span className="meta-label">Status:</span> {currentTrade.currentStatus || "N/A"}</div>
            <div className="meta-item"><span className="meta-label">Messages:</span> {currentMessages.length}</div>
            {currentTrade.counterparty && <div className="meta-item"><span className="meta-label">Counterparty:</span> {currentTrade.counterparty}</div>}
          </div>
        </div>

        {/* Actions Bar — hidden for the read-only System Mailbox */}
        {readOnly ? (
          <div className="email-actions-bar">
            <span className="resolve-status">🖥️ System notification — read only</span>
          </div>
        ) : (
          <div className="email-actions-bar">
            <button className="btn-action primary" onClick={openReplyModal}>↩ Reply</button>
            <button className="btn-action resolve" disabled={resolveState.disabled || isResolving}
              onClick={resolveState.isClose ? () => window.close() : resolveConversation}>
              {isResolving ? "Resolving..." : resolveState.text}
            </button>
            <span className="resolve-status">{resolveState.statusText}</span>
          </div>
        )}

        {/* Email Thread */}
        <div className="email-thread">
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
                <ThreadEmail key={idx} msg={msg} sender={sender} toLabel={toLabel} isLatest={isLatest} snippet={snippet} formatDateFull={formatDateFull} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
