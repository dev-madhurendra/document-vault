import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchDocuments } from "../api";
import UploadForm from "../components/UploadForm";
import DocumentCard from "../components/DocumentCard";
import PreviewModal from "../components/PreviewModal";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

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

  return (
    <div className="shell">
      <div className="topbar">
        <a className="brand" href="/dashboard">
          Doc<span>Vault</span>
        </a>
        <div className="topbar-right">
          <span>{user?.name}</span>
          <button className="linklike" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

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