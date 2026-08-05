import { useState } from "react";

const DESK_LABELS = {
  SETTLEMENT: "Settlement",
  CONFIRMATION: "Confirmation",
  MO: "Middle Office",
  RECONCILIATION: "Reconciliation",
};

const Icon = ({ name }) => {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch(name) {
    case 'inbox': return <svg {...props}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
    case 'unread': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
    case 'flagged': return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>;
    case 'sent': return <svg {...props}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
    case 'drafts': return <svg {...props}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;
    case 'archive': return <svg {...props}><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
    case 'deleted': return <svg {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
    case 'group': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
    default: return null;
  }
};

export default function FolderNav({ channel, currentFolder, switchFolder, inboxData, desk, userId }) {
  const [groupExpanded, setGroupExpanded] = useState(true);

  // ── Count unread items (messages not sent by current user and not read) ──
  const unreadCount = (inboxData || []).filter(item => {
    if (channel === "SYSTEM") {
      return item.conversation && !item.conversation.read;
    }
    if (!item.lastMsg) return false;
    if (item.lastMsg.sender === userId) return false; // Sent by me
    if ((item.conversation.readBy || []).includes(userId)) return false; // Read by me
    return true;
  }).length;

  // Internal System Mailbox: Inbox only
  if (channel === "SYSTEM") {
    return (
      <div className="folder-nav">
        <div className="folder-item active">
          <span className="folder-icon">🏢</span>
          <span>Static Data Team Inbox</span>
        </div>
      </div>
    );
  }

  const folders = [
    { key: "inbox", icon: "inbox", label: "Inbox", count: unreadCount },
    { key: "unread", icon: "unread", label: "Unread", count: unreadCount },
    { key: "flagged", icon: "flagged", label: "Flagged", count: null },
  ];

  const placeholders = [
    { key: "sent", icon: "sent", label: "Sent Items" },
    { key: "drafts", icon: "drafts", label: "Drafts" },
    { key: "archive", icon: "archive", label: "Archive" },
    { key: "deleted", icon: "deleted", label: "Deleted Items" },
  ];

  const deskKeys = Object.keys(DESK_LABELS);

  return (
    <div className="folder-nav">
      {/* Primary folders */}
      {folders.map(f => (
        <div
          key={f.key}
          className={`folder-item ${currentFolder === f.key ? "active" : ""}`}
          onClick={() => switchFolder(f.key)}
        >
          <span className="folder-icon"><Icon name={f.icon} /></span>
          <span className="folder-label">{f.label}</span>
          {f.count > 0 && <span className="folder-badge">{f.count}</span>}
        </div>
      ))}

      <div className="folder-divider" />

      {/* Placeholder folders */}
      {placeholders.map(f => (
        <div
          key={f.key}
          className={`folder-item ${currentFolder === f.key ? "active" : ""} folder-placeholder`}
          onClick={() => switchFolder(f.key)}
        >
          <span className="folder-icon"><Icon name={f.icon} /></span>
          <span className="folder-label">{f.label}</span>
        </div>
      ))}

      <div className="folder-divider" />

      {desk === "SETTLEMENT" && channel !== "SYSTEM" && (
        <>
          <div className="folder-item folder-group-header">
            <span className="folder-icon"><Icon name="inbox" /></span>
            <span className="folder-label">Static Data Team</span>
          </div>
          <div
            className={`folder-item folder-sub ${currentFolder === "system" ? "active" : ""}`}
            onClick={() => switchFolder("system")}
          >
            <span className="folder-indent" />
            <span className="folder-label">Static Data Team Inbox</span>
          </div>
          <div className="folder-divider" />
        </>
      )}

      {/* Group Inbox — collapsible */}
      <div
        className="folder-item folder-group-header"
        onClick={() => setGroupExpanded(!groupExpanded)}
      >
        <span className="folder-icon"><Icon name="group" /></span>
        <span className="folder-label">Group Inbox</span>
        <span className={`folder-chevron ${groupExpanded ? "expanded" : ""}`}>▸</span>
      </div>

      {groupExpanded && deskKeys.map(deskKey => (
        <div
          key={deskKey}
          className={`folder-item folder-sub ${currentFolder === `group_${deskKey}` ? "active" : ""}`}
          onClick={() => switchFolder(`group_${deskKey}`)}
        >
          <span className="folder-indent" />
          <span className="folder-label">{DESK_LABELS[deskKey]}</span>
        </div>
      ))}
    </div>
  );
}
