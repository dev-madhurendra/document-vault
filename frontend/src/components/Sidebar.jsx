import { useState } from "react";
const ICON_CHOICES = ["📁", "📄", "🧾", "🎓", "🔐", "💼", "🏠", "🚗", "🏥", "🎯"];

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  isOpen,
  onClose,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ICON_CHOICES[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim(), newIcon);
    setNewName("");
    setNewIcon(ICON_CHOICES[0]);
    setIsCreating(false);
  };

  const startEdit = (ws) => {
    setEditingId(ws._id);
    setEditName(ws.name);
    setOpenMenuId(null);
  };

  const submitEdit = async (e, ws) => {
    e.preventDefault();
    if (editName.trim() && editName.trim() !== ws.name) {
      await onRename(ws._id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile scrim, only visible when the drawer is open */}
      {isOpen && <div className="sidebar-scrim" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Workspaces</span>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="sidebar-list">
          {workspaces.map((ws, index) => (
            <div key={ws._id || ws.id || `ws-${index}`} className={`sidebar-item ${activeWorkspaceId === ws._id ? "active" : ""}`}>
              {editingId === ws._id ? (
                <form className="sidebar-edit-form" onSubmit={(e) => submitEdit(e, ws)}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => setEditingId(null)}
                  />
                </form>
              ) : (
                <>
                  <button
                    className="sidebar-item-btn"
                    onClick={() => {
                      onSelect(ws._id);
                      onClose();
                    }}
                  >
                    <span className="sidebar-item-icon">{ws.icon}</span>
                    <span className="sidebar-item-name">{ws.name}</span>
                    <span className="sidebar-item-count">{ws.itemCount}</span>
                  </button>

                  {!ws.isDefault && (
                    <div className="sidebar-item-menu">
                      <button
                        className="sidebar-item-menu-trigger"
                        onClick={() => setOpenMenuId(openMenuId === ws._id ? null : ws._id)}
                        aria-label="Workspace options"
                      >
                        ⋯
                      </button>
                      {openMenuId === ws._id && (
                        <div className="sidebar-item-menu-panel">
                          <button onClick={() => startEdit(ws)}>Rename</button>
                          <button
                            className="danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              onDelete(ws._id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!isCreating ? (
            <button className="sidebar-add-btn" onClick={() => setIsCreating(true)}>
              + New workspace
            </button>
          ) : (
            <form className="sidebar-create-form" onSubmit={handleCreate}>
              <div className="icon-picker">
                {ICON_CHOICES.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    className={`icon-choice ${newIcon === icon ? "selected" : ""}`}
                    onClick={() => setNewIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Workspace name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="sidebar-create-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm">
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}