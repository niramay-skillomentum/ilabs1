export default function InboxList({
  searchQuery, setSearchQuery, folderTitle, isLoading, currentFolder,
  filteredInbox, userId, formatDate, getStatusBadge, selectedTradeRef,
  channel, loadConversation
}) {
  return (
    <div className="email-list-panel">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input type="text" className="search-input" placeholder="Search mail (subject, sender, content...)"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>
      <div className="email-list-toolbar">
        <span className="toolbar-title">{folderTitle()}</span>
      </div>
      <div className="email-list">
        {isLoading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div><div>Loading emails...</div></div>
        ) : (currentFolder === "inbox" || currentFolder === "group") ? (
          filteredInbox.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><div>No emails in this folder</div></div>
          ) : (
            filteredInbox.map(item => {
              const senderInfo = (() => {
                if (item.lastMsg.sender === userId) return { name: "You" };
                if (item.lastMsg.sender === "FO") return { name: "Front Office" };
                if (item.lastMsg.sender === "COUNTERPARTY" || item.lastMsg.sender === "CPTY") return { name: (item.trade.counterparty || "Cpty") + " Ops" };
                return { name: item.lastMsg.sender };
              })();
              const time = formatDate(item.lastMsg.timestamp);
              const badge = getStatusBadge(item.trade);
              const preview = item.lastMsg.body.substring(0, 80).replace(/\n/g, " ").replace(/<[^>]*>/g, "");
              const isUnread = item.lastMsg.sender !== userId;
              return (
                <div key={item.trade.tradeRef}
                  className={`email-item ${selectedTradeRef === item.trade.tradeRef ? "selected" : ""} ${isUnread ? "unread" : ""}`}
                  onClick={() => loadConversation(item.trade.tradeRef, channel, null, true)}>
                  <div className="email-item-top">
                    <span className="email-sender">{senderInfo.name}</span>
                    <span className="email-time">{time}</span>
                  </div>
                  <div className="email-subject-row">
                    <span className="email-subject">{item.subject}</span>
                    {badge}
                  </div>
                  <div className="email-preview">{preview}</div>
                </div>
              );
            })
          )
        ) : (
          <div className="empty-state">
            <div className="empty-icon">{currentFolder === "sent" ? "📤" : currentFolder === "drafts" ? "📝" : "🗑️"}</div>
            <div>{currentFolder === "sent" ? "No sent items" : currentFolder === "drafts" ? "No drafts" : "No deleted items"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
