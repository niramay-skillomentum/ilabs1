export default function ReplyModal({
  replyModalOpen, setReplyModalOpen, currentTrade, userId, getSenderInfo,
  currentMessages, getRecipientLabel, desk, channel, buildSubject,
  replyBody, setReplyBody, formatDateFull, sendReply, isSendingReply
}) {
  if (!replyModalOpen) return null;
  return (
    <>
      <div className="modal-overlay" onClick={() => setReplyModalOpen(false)} />
      <div className="compose-modal" style={{display:"flex"}}>
        <div className="compose-titlebar">
          <span className="compose-titlebar-text">↩ Reply — {currentTrade?.tradeRef}</span>
          <button className="compose-close" onClick={() => setReplyModalOpen(false)}>✕</button>
        </div>
        <div className="compose-fields">
          <div className="compose-field-row">
            <span className="compose-label">From:</span>
            <span className="compose-value-text">{userId} &lt;{getSenderInfo(userId, currentTrade).email}&gt;</span>
          </div>
          <div className="compose-field-row">
            <span className="compose-label">To:</span>
            <span className="compose-value-text">
              {(() => {
                const lastMsg = currentMessages.length ? currentMessages[currentMessages.length - 1] : null;
                if (lastMsg && (lastMsg.sender === "FO" || lastMsg.sender === "CPTY" || lastMsg.sender === "COUNTERPARTY")) {
                  const s = getSenderInfo(lastMsg.sender, currentTrade);
                  return `${s.name} <${s.email}>`;
                }
                return getRecipientLabel(userId, currentTrade, desk, channel, userId, null);
              })()}
            </span>
          </div>
          <div className="compose-field-row">
            <span className="compose-label">Subject:</span>
            <input type="text" className="compose-value" readOnly value={"RE: " + buildSubject(currentTrade)} />
          </div>
        </div>
        <div className="compose-body-area">
          <textarea className="compose-textarea" placeholder="Type your reply here..."
            value={replyBody} onChange={e => setReplyBody(e.target.value)} autoFocus />
          {currentMessages.length > 0 && (
            <div className="compose-quoted">
              <div className="quoted-header">— Previous messages —</div>
              {[...currentMessages].reverse().map((msg, i) => {
                const s = getSenderInfo(msg.sender, currentTrade);
                return (
                  <div key={i} className="quoted-message">
                    <span className="qm-from">{s.name}</span>
                    <span className="qm-date">{formatDateFull(msg.timestamp)}</span>
                    <div className="qm-body">{msg.body.replace(/<[^>]*>/g, "")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="compose-footer">
          <button className="btn-send" onClick={sendReply} disabled={isSendingReply}>
            {isSendingReply ? "Sending..." : "Send"}
          </button>
          <button className="btn-discard" onClick={() => setReplyModalOpen(false)} disabled={isSendingReply}>Discard</button>
        </div>
      </div>
    </>
  );
}
