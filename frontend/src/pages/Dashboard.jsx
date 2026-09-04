import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchWorkspaces,
  createWorkspace,
  fetchDocuments,
  fetchCredentials,
  createCredential,
  renameWorkspace,
  deleteWorkspace,
  moveDocuments,
} from "../api";

import Sidebar from "../components/Sidebar";
import UploadForm from "../components/UploadForm";
import DocumentCard from "../components/DocumentCard";
import CredentialCard from "../components/CredentialCard";
import CredentialForm from "../components/CredentialForm";
import PreviewModal from "../components/PreviewModal";
import { getAvatarColor } from "../utils/avatarColor";
import EmptyFolderIllustration from "../../public/assets/png/emtpy-folder-svg.png";

const ITEMS_PER_PAGE = 8;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Workspaces & Sidebar State
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Content Items
  const [documents, setDocuments] = useState([]);
  const [credentials, setCredentials] = useState([]);

  // Selection & Move Modal State
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [moveModalDocs, setMoveModalDocs] = useState(null);
  const [targetWsId, setTargetWsId] = useState("");

  // Query & Pagination State
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI Panels
  const [activePanel, setActivePanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

  // Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetchWorkspaces();
      const wsList = res.workspaces || [];
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        setActiveWorkspaceId(wsList[0]._id || wsList[0].id);
      } else {
        setActiveWorkspaceId("");
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    setSelectedDocIds([]);
    try {
      const params = {
        workspaceId: activeWorkspaceId,
        search,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      const [docRes, credRes] = await Promise.all([
        fetchDocuments(params),
        fetchCredentials(params),
      ]);

      setDocuments(docRes.documents || []);
      setCredentials(credRes.credentials || []);

      const totalItems = (docRes.total || 0) + (credRes.total || 0);
      setTotalCount(totalItems);
      setTotalPages(Math.ceil(totalItems / ITEMS_PER_PAGE) || 1);
    } catch (err) {
      setError(err.message || "Failed to load workspace items.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, search, currentPage]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadItems();
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadItems]);

  const toggleSelectDocument = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d._id));
    }
  };

  const handleConfirmMove = async () => {
    if (!moveModalDocs || moveModalDocs.length === 0 || !targetWsId) return;
    try {
      await moveDocuments(moveModalDocs, targetWsId);
      setMoveModalDocs(null);
      setSelectedDocIds([]);
      loadItems();
    } catch (err) {
      alert(err.message || "Failed to move documents.");
    }
  };

  const handleAddWorkspace = async (name, icon) => {
    try {
      const newWs = await createWorkspace({ name, icon });
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs._id);
    } catch (err) {
      setError(err.message || "Failed to create workspace.");
    }
  };

  const handleRenameWorkspace = async (id, updates) => {
    try {
      const updated = await renameWorkspace(id, updates);
      setWorkspaces((prev) =>
        prev.map((w) => (w._id === id ? { ...w, ...updated } : w))
      );
    } catch (err) {
      setError(err.message || "Failed to rename workspace.");
    }
  };

  const handleDeleteWorkspace = async (id) => {
    try {
      await deleteWorkspace(id);
      setWorkspaces((prev) => {
        const remaining = prev.filter((w) => w._id !== id);
        if (activeWorkspaceId === id) {
          setActiveWorkspaceId(remaining.length > 0 ? remaining[0]._id : "");
        }
        return remaining;
      });
    } catch (err) {
      setError(err.message || "Failed to delete workspace.");
    }
  };

  const handleDocumentUploaded = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setTotalCount((prev) => prev + 1);
    setActivePanel(null);
  };

  const handleCredentialCreated = async (credentialData) => {
    try {
      const created = await createCredential({
        ...credentialData,
        workspaceId: activeWorkspaceId || null,
      });
      setCredentials((prev) => [created, ...prev]);
      setTotalCount((prev) => prev + 1);
      setActivePanel(null);
    } catch (err) {
      setError(err.message || "Failed to create credential.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userName = user?.name || "User";
  const firstLetter = userName.charAt(0).toUpperCase();
  const avatarStyle = getAvatarColor(userName);
  const hasSelection = selectedDocIds.length > 0;

  return (
    <div className="dashboard-layout">
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelect={(id) => {
          setActiveWorkspaceId(id);
          setCurrentPage(1);
          setIsSidebarOpen(false);
        }}
        onCreate={handleAddWorkspace}
        onRename={handleRenameWorkspace}
        onDelete={handleDeleteWorkspace}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Navigation Sidebar"
            >
              ☰
            </button>
            <a className="brand" href="/dashboard">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Doc<span>Vault</span>
            </a>
          </div>

          <div className="topbar-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            <div className="user-profile-badge">
              <span
                className="user-avatar"
                style={{
                  backgroundColor: avatarStyle.bg,
                  color: avatarStyle.text,
                  borderColor: avatarStyle.border,
                }}
              >
                {firstLetter}
              </span>
              <span className="user-name-text">{userName}</span>
            </div>

            <button className="btn-logout" onClick={handleLogout} title="Log out">
              Log out
            </button>
          </div>
        </header>

        <div className="dashboard-head">
          <h1>
            {workspaces.find((w) => w._id === activeWorkspaceId)?.name || "No Workspace Selected"}
          </h1>
          <p>Retrieve stored documents and AES-256 encrypted credentials securely.</p>
        </div>

        <div className="action-toolbar">
          <div className="toolbar-buttons">
            <button
              className={`btn ${activePanel === "upload" ? "btn-active" : "btn-ghost"}`}
              onClick={() => setActivePanel(activePanel === "upload" ? null : "upload")}
            >
              📄 Upload Document
            </button>
            <button
              className={`btn ${activePanel === "credential" ? "btn-active" : "btn-ghost"}`}
              onClick={() => setActivePanel(activePanel === "credential" ? null : "credential")}
            >
              🔐 Add Credential / Secret
            </button>
          </div>
        </div>

        {activePanel === "upload" && (
          <div className="panel-container">
            <UploadForm
              workspaceId={activeWorkspaceId}
              onUploaded={handleDocumentUploaded}
            />
          </div>
        )}

        {activePanel === "credential" && (
          <div className="panel-container secret-panel">
            <h3>New Credential Entry</h3>
            <CredentialForm
              onSubmit={handleCredentialCreated}
              onCancel={() => setActivePanel(null)}
            />
          </div>
        )}

        <div className="search-row">
          <input
            type="text"
            placeholder="Search documents or dynamic credentials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <span className="doc-count">{totalCount} item(s)</span>
        </div>

        {/* Bulk Action Controls appear when at least one document is selected */}
        {hasSelection && (
          <div className="bulk-selection-bar">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectedDocIds.length === documents.length && documents.length > 0}
                onChange={toggleSelectAll}
              />
              Select All ({selectedDocIds.length} selected)
            </label>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setMoveModalDocs(selectedDocIds)}
            >
              📁 Move Selected ({selectedDocIds.length})
            </button>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="empty-state">Loading workspace items...</p>
        ) : documents.length === 0 && credentials.length === 0 ? (
          <div className="empty-state">
            <img src={EmptyFolderIllustration} alt="No entries found" className="no-image-found-illustration" />
            <h3>No entries found</h3>
            <p>Upload a document or create encrypted credentials in this workspace.</p>
          </div>
        ) : (
          <div className="doc-grid">
            {credentials.map((cred, index) => (
              <CredentialCard
                key={cred._id || `cred-${index}`}
                credential={cred}
                onDeleted={(id) => {
                  setCredentials((prev) => prev.filter((c) => c._id !== id));
                  setTotalCount((prev) => prev - 1);
                }}
              />
            ))}

            {documents.map((doc, index) => (
              <DocumentCard
                key={doc._id || `doc-${index}`}
                document={doc}
                onView={setActiveDoc}
                onChanged={(updated) =>
                  setDocuments((prev) => prev.map((d) => (d._id === updated._id ? updated : d)))
                }
                onDeleted={(id) => {
                  setDocuments((prev) => prev.filter((d) => d._id !== id));
                  setTotalCount((prev) => prev - 1);
                }}
                onMoveSingle={(id) => setMoveModalDocs([id])}
                isSelected={selectedDocIds.includes(doc._id)}
                hasSelection={hasSelection}
                onToggleSelect={toggleSelectDocument}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-ghost"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}

        <PreviewModal document={activeDoc} onClose={() => setActiveDoc(null)} />

        {moveModalDocs && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: "420px" }}>
              <div className="modal-header">
                <h3>Move {moveModalDocs.length} Document(s)</h3>
                <button className="modal-close" onClick={() => setMoveModalDocs(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-body" style={{ minHeight: "auto", padding: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Select Target Workspace:
                </label>
                <select
                  value={targetWsId}
                  onChange={(e) => setTargetWsId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-main)",
                  }}
                >
                  <option value="">-- Choose a Workspace --</option>
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      {ws.icon} {ws.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn-ghost" onClick={() => setMoveModalDocs(null)}>
                  Cancel
                </button>
                <button
                  className="btn"
                  disabled={!targetWsId}
                  onClick={handleConfirmMove}
                >
                  Confirm Move
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}