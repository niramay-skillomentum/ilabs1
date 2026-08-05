import { useState, useRef, useEffect } from "react";

function ThreadEmail({ msg, sender, toLabel, isLatest, snippet, formatDateFull, previousMessages, trade, userId, desk, channel, getSenderInfo, getRecipientLabel }) {
  const [collapsed, setCollapsed] = useState(!isLatest);
  const [showQuoted, setShowQuoted] = useState(false);
  return (
    <div className={`thread-email ${isLatest ? "latest" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="thread-email-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="thread-avatar" style={{ background: sender.color }}>{sender.initials}</div>
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
      <div className="thread-email-body">
        <div dangerouslySetInnerHTML={{ __html: msg.body }} />

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
                  const pToEmail = pToLabel.includes("<") ? pToLabel.split("<")[1].replace(">", "") : pToLabel.toLowerCase().replace(/\s+/g, ".") + "@skillomentum.com";

                  return (
                    <div key={i} className="qh-item">
                      {i === previousMessages.length - 1 && <div className="qh-separator-text">-------- Original message --------</div>}
                      <div className="qh-header-block">
                        <div><strong>From:</strong> {pSender.name} &lt;{pSender.email}&gt;</div>
                        <div><strong>Date:</strong> {formatDateFull(pMsg.timestamp)}</div>
                        <div><strong>To:</strong> {pToLabel} &lt;{pToEmail}&gt;</div>
                        <div><strong>Subject:</strong> RE: {trade.tradeRef}</div>
                      </div>
                      <div className="qh-body" dangerouslySetInnerHTML={{ __html: pMsg.body }} />
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
}

export default function MessageThread({
  selectedTradeRef, currentTrade, buildSubject, currentMessages,
  openReplyModal, resolveState, resolveConversation, getSenderInfo,
  userId, desk, channel, getRecipientLabel, formatDateFull, isResolving, readOnly, openSendSSIModal
}) {
  const threadRef = useRef(null);
  const prevTradeRef = useRef(null);
  const prevMessagesLenRef = useRef(0);
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Smart auto-scroll: only scroll on initial load, switching conversations, or when near bottom
  useEffect(() => {
    if (!threadRef.current || !currentMessages) return;

    const isNewConversation = prevTradeRef.current !== selectedTradeRef;
    const isNewMessageAdded = currentMessages.length > prevMessagesLenRef.current;

    if (isNewConversation || prevMessagesLenRef.current === 0) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    } else if (isNewMessageAdded) {
      const { scrollTop, scrollHeight, clientHeight } = threadRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    }

    prevTradeRef.current = selectedTradeRef;
    prevMessagesLenRef.current = currentMessages.length;
  }, [currentMessages, selectedTradeRef]);
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
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Subject Header */}
        <div className="email-header">
          <div className="email-header-subject">{buildSubject(currentTrade)}</div>
          <div className="email-header-meta">
            <div className="meta-item"><span className="meta-label">Status:</span> {currentTrade.currentStatus || "N/A"}</div>
            <div className="meta-item"><span className="meta-label">Messages:</span> {currentMessages.length}</div>
            {currentTrade.counterparty && <div className="meta-item"><span className="meta-label">Counterparty:</span> {currentTrade.counterparty}</div>}
          </div>
        </div>

        {/* Actions Bar — hidden for the read-only Static Data Team Mailbox */}
        {readOnly ? (
          <div className="email-actions-bar">
            <span className="resolve-status">🏢 Static Data Team notification — read only</span>
          </div>
        ) : (
          <div className="email-actions-bar">
            <button className="btn-action primary" onClick={openReplyModal}>↩ Reply</button>
            {currentTrade.direction === "SELL" && currentTrade.settlementType === "BILATERAL" && desk === "SETTLEMENT" && channel !== "FO" && (
              <button className="btn-action" style={{ backgroundColor: "#0078d4", color: "white" }} onClick={openSendSSIModal}>✉ Send SSI</button>
            )}
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
            <div className="empty-state" style={{ padding: "40px" }}><div className="empty-icon">💬</div><div>No messages yet</div></div>
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
                <ThreadEmail 
                  key={idx} msg={msg} sender={sender} toLabel={toLabel} 
                  isLatest={isLatest} snippet={snippet} formatDateFull={formatDateFull}
                  previousMessages={currentMessages.slice(0, idx)}
                  trade={currentTrade} userId={userId} desk={desk} channel={channel}
                  getSenderInfo={getSenderInfo} getRecipientLabel={getRecipientLabel}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
