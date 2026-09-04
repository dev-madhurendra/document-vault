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
  isLoading = false,
  userPlan = "basic"
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ICON_CHOICES[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const isBasic = userPlan === "basic";

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
          {/* Permanent "All Items" Workspace Option */}
          <div className={`sidebar-item ${activeWorkspaceId === "" ? "active" : ""}`}>
            <button
              className="sidebar-item-btn"
              onClick={() => {
                onSelect("");
                localStorage.setItem("activeWorkspaceId", "");
                onClose();
              }}
            >
              <span className="sidebar-item-icon">🗂️</span>
              <span className="sidebar-item-name">All Workspaces</span>
            </button>
          </div>

          <div style={{ height: "1px", backgroundColor: "var(--border-light)", margin: "8px 0" }} />

          {/* 👈 2. Conditional Skeleton Loader Rendering */}
          {isLoading ? (
            <div className="sidebar-skeleton-container">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="sidebar-skeleton-item skeleton-pulse" />
              ))}
            </div>
          ) : (
            /* Dynamic User Workspaces */
            workspaces.map((ws, index) => (
              <div
                key={ws._id || ws.id || `ws-${index}`}
                className={`sidebar-item ${activeWorkspaceId === ws._id ? "active" : ""}`}
              >
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
                        localStorage.setItem("activeWorkspaceId", ws._id);
                        onClose();
                      }}
                    >
                      <span className="sidebar-item-icon">{ws.icon || "📁"}</span>
                      <span className="sidebar-item-name">{ws.name}</span>
                      {ws.itemCount !== undefined && (
                        <span className="sidebar-item-count">{ws.itemCount}</span>
                      )}
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
            ))
          )}
        </nav>

        <div className="sidebar-footer">
          {isBasic ? (
            <button
              className="sidebar-add-btn disabled-basic"
              onClick={() => alert("Workspace creation requires a Premium Subscription.")}
              title="Upgrade to Premium to add custom workspaces"
            >
              🔒 + New workspace (Premium)
            </button>
          ) :
            !isCreating ? (
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
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setIsCreating(false)}
                  >
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