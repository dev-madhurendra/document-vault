import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchDocuments } from "../api";
import UploadForm from "../components/UploadForm";
import DocumentCard from "../components/DocumentCard";
import PreviewModal from "../components/PreviewModal";
import { getAvatarColor } from "../utils/avatarColor";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const load = useCallback(async (searchTerm) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDocuments(searchTerm);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 250);
    return () => clearTimeout(timeout);
  }, [search, load]);

  const handleUploaded = (doc) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleChanged = (updatedDoc) => {
    setDocuments((prev) => prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d)));
    setActiveDoc((prev) => (prev && prev._id === updatedDoc._id ? updatedDoc : prev));
  };

  const handleDeleted = (id) => {
    setDocuments((prev) => prev.filter((d) => d._id !== id));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Avatar initial letter and custom color scheme
  const userName = user?.name || "User";
  const firstLetter = userName.charAt(0).toUpperCase();
  const avatarStyle = getAvatarColor(userName);

  return (
    <div className="shell">
      {/* Top Navbar */}
      <div className="topbar">
        <a className="brand" href="/dashboard">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Doc<span>Vault</span>
        </a>

        <div className="topbar-right">
          {/* Theme Switcher Button */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle Theme">
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          {/* User Profile Avatar with First Letter */}
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

          {/* Logout Button */}
          <button className="btn-logout" onClick={handleLogout} title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Dashboard Header */}
      <div className="dashboard-head">
        <h1>Your documents</h1>
        <p>Upload once, find it in seconds — no more digging through folders.</p>
      </div>

      <UploadForm onUploaded={handleUploaded} />

      <div className="search-row">
        <input
          type="text"
          placeholder="Search by document name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="doc-count">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Upload your first document above to get started.</p>
        </div>
      ) : (
        <div className="doc-grid">
          {documents.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              onView={setActiveDoc}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <PreviewModal document={activeDoc} onClose={() => setActiveDoc(null)} onChanged={handleChanged} />
    </div>
  );
}