export default function ComposeModal({
  composeModalOpen, setComposeModalOpen, userId, getSenderInfo, currentTrade,
  composeTo, composeToDisabled, handleComposeToChange, composeTrade,
  handleComposeTradeChange, composeTrades, formatAmount, composeSubject,
  setComposeSubject, composeBody, setComposeBody, sendCompose, isSendingCompose
}) {
  if (!composeModalOpen) return null;
  return (
    <>
      <div className="modal-overlay" onClick={() => setComposeModalOpen(false)} />
      <div className="compose-modal" style={{display:"flex"}}>
        <div className="compose-titlebar">
          <span className="compose-titlebar-text">✏️ New Email</span>
          <button className="compose-close" onClick={() => setComposeModalOpen(false)}>✕</button>
        </div>
        <div className="compose-fields">
          <div className="compose-field-row">
            <span className="compose-label">From:</span>
            <span className="compose-value-text">{userId} &lt;{getSenderInfo(userId, currentTrade).email}&gt;</span>
          </div>
          <div className="compose-field-row">
            <span className="compose-label">To:</span>
            <select className="compose-value" value={composeTo} disabled={composeToDisabled}
              onChange={e => handleComposeToChange(e.target.value)}>
              <option value="FO">Front Office Trading Desk &lt;fo.trading@sgb.com&gt;</option>
              <option value="COUNTERPARTY">Counterparty Operations</option>
            </select>
          </div>
          <div className="compose-field-row">
            <span className="compose-label">Trade:</span>
            <select className="compose-value" value={composeTrade}
              onChange={e => handleComposeTradeChange(e.target.value)}>
              {composeTrades.map(t => (
                <option key={t.tradeRef} value={t.tradeRef}>
                  {t.tradeRef} — {t.counterparty} — {t.currency} {formatAmount(t.amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="compose-field-row">
            <span className="compose-label">Subject:</span>
            <input type="text" className="compose-value" value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)} placeholder="Enter subject..." />
          </div>
        </div>
        <div className="compose-body-area">
          <textarea className="compose-textarea" placeholder="Compose your email..."
            value={composeBody} onChange={e => setComposeBody(e.target.value)} autoFocus />
        </div>
        <div className="compose-footer">
          <button className="btn-send" onClick={sendCompose} disabled={isSendingCompose}>
            {isSendingCompose ? "Sending..." : "Send"}
          </button>
          <button className="btn-discard" onClick={() => setComposeModalOpen(false)} disabled={isSendingCompose}>Discard</button>
        </div>
      </div>
    </>
  );
}
