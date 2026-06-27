export default function FolderNav({ channel, currentFolder, switchFolder }) {
  return (
    <div className="folder-nav">
      {[
        { key: "inbox", icon: "📥", label: "Inbox" },
        { key: "group", icon: "👥", label: "Group Inbox" },
      ].map(f => (
        <div key={f.key} className={`folder-item ${currentFolder === f.key ? "active" : ""}`} onClick={() => switchFolder(f.key)}>
          <span className="folder-icon">{f.icon}</span>
          <span>{f.label}</span>
        </div>
      ))}
      <div className="folder-divider" />
      {[
        { key: "sent", icon: "📤", label: "Sent" },
        { key: "drafts", icon: "📝", label: "Drafts" },
        { key: "deleted", icon: "🗑️", label: "Deleted Items" },
      ].map(f => (
        <div key={f.key} className={`folder-item ${currentFolder === f.key ? "active" : ""}`} onClick={() => switchFolder(f.key)}>
          <span className="folder-icon">{f.icon}</span>
          <span>{f.label}</span>
        </div>
      ))}
    </div>
  );
}
