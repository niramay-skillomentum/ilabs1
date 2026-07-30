import { useState } from "react";

const DESK_LABELS = {
  SETTLEMENT: "Settlement",
  CONFIRMATION: "Confirmation",
  MO: "Middle Office",
  RECONCILIATION: "Reconciliation",
};

export default function FolderNav({ channel, currentFolder, switchFolder, inboxData, desk }) {
  const [groupExpanded, setGroupExpanded] = useState(true);

  // ── Count unread items (messages not sent by current user) ──
  const unreadCount = (inboxData || []).filter(item => {
    if (!item.lastMsg) return false;
    return item.lastMsg.sender !== "USER";
  }).length;

  // Internal System Mailbox: Inbox only
  if (channel === "SYSTEM") {
    return (
      <div className="folder-nav">
        <div className="folder-item active">
          <span className="folder-icon">🖥️</span>
          <span>System Inbox</span>
        </div>
      </div>
    );
  }

  const folders = [
    { key: "inbox", icon: "📥", label: "Inbox", count: unreadCount },
    { key: "unread", icon: "📬", label: "Unread", count: unreadCount },
    { key: "flagged", icon: "🚩", label: "Flagged", count: null },
  ];

  const placeholders = [
    { key: "sent", icon: "📤", label: "Sent Items" },
    { key: "drafts", icon: "📝", label: "Drafts" },
    { key: "archive", icon: "📁", label: "Archive" },
    { key: "deleted", icon: "🗑️", label: "Deleted Items" },
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
          <span className="folder-icon">{f.icon}</span>
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
          <span className="folder-icon">{f.icon}</span>
          <span className="folder-label">{f.label}</span>
        </div>
      ))}

      <div className="folder-divider" />

      {/* Group Inbox — collapsible */}
      <div
        className="folder-item folder-group-header"
        onClick={() => setGroupExpanded(!groupExpanded)}
      >
        <span className="folder-icon">👥</span>
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
