import { useState, useEffect, useRef } from "react";
import { getDeskBadge } from "./utils";

export default function InboxList({
  searchQuery, setSearchQuery, folderTitle, isLoading, currentFolder,
  filteredInbox, userId, formatDate, getStatusBadge, selectedTradeRef,
  channel, loadConversation, openNewCompose
}) {
  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  // Reset visible count when folder or search changes
  useEffect(() => {
    setVisibleCount(20);
  }, [currentFolder, searchQuery, filteredInbox.length]);

  // Intersection Observer for lazy rendering (infinite scroll effect)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 20, filteredInbox.length));
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [filteredInbox.length]);

  const visibleInbox = filteredInbox.slice(0, visibleCount);

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
        {channel !== "SYSTEM" && (
          <button className="btn-compose" onClick={openNewCompose}>
            ✏️ New Message
          </button>
        )}
      </div>
      <div className="email-list">
        {isLoading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div><div>Loading emails...</div></div>
        ) : (currentFolder === "inbox" || currentFolder === "group" || currentFolder === "unread" || currentFolder === "flagged" || currentFolder.startsWith("group_")) ? (
          filteredInbox.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><div>No emails in this folder</div></div>
          ) : (
            <>
              {visibleInbox.map(item => {
                const senderInfo = (() => {
                  if (item.lastMsg.sender === userId) return { name: "You" };
                  if (item.lastMsg.sender === "FO") return { name: "Front Office Trading Desk" };
                  if (item.lastMsg.sender === "COUNTERPARTY" || item.lastMsg.sender === "CPTY") return { name: (item.trade.counterparty || "Cpty") + " Ops" };
                  return { name: item.lastMsg.sender };
                })();
                const time = formatDate(item.lastMsg.timestamp);
                const badge = getStatusBadge(item.trade);
                const deskBadge = (currentFolder === "inbox" || currentFolder === "unread") ? getDeskBadge(item.trade) : null;
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
                      {deskBadge}
                      <span className="email-subject">{item.subject}</span>
                      {badge}
                    </div>
                    <div className="email-preview">{preview}</div>
                  </div>
                );
              })}
              {visibleCount < filteredInbox.length && (
                <div ref={observerTarget} style={{ height: "20px" }} />
              )}
            </>
          )
        ) : (
          <div className="empty-state">
            <div className="empty-icon">{currentFolder === "sent" ? "📤" : currentFolder === "drafts" ? "📝" : currentFolder === "archive" ? "📁" : "🗑️"}</div>
            <div>{currentFolder === "sent" ? "No sent items" : currentFolder === "drafts" ? "No drafts" : currentFolder === "archive" ? "No archived items" : "No deleted items"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
