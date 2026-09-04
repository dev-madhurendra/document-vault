import { useState } from "react";
import { revealCredential, deleteCredential } from "../api";

export default function CredentialCard({ credential, onDeleted }) {
  const [revealedFields, setRevealedFields] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedLabel, setCopiedLabel] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleReveal = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await revealCredential(credential._id);
      setRevealedFields(data.fields || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = () => setRevealedFields(null);

  const handleCopy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(""), 1500);
    } catch {
      // clipboard API unavailable
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm(`Delete "${credential.title}"? This can't be undone.`)) return;
    await deleteCredential(credential._id);
    onDeleted(credential._id);
  };

  const displayFields = revealedFields || credential.fieldLabels || credential.fields || [];

  return (
    <div className="credential-card">
      <div className="credential-card-header">
        <h4 title={credential.title}>{credential.title}</h4>
        <div className="credential-card-menu">
          <button className="doc-menu-trigger" onClick={() => setMenuOpen((v) => !v)} aria-label="Options">
            ⋮
          </button>
          {menuOpen && (
            <div className="doc-menu-panel">
              <button className="doc-menu-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="credential-fields">
        {displayFields.map((field, idx) => {
          const valText = revealedFields
            ? field.value
            : field.isSecret !== false
            ? "••••••••"
            : "Tap reveal to view";

          return (
            <div className="credential-field-row" key={field.label || idx}>
              <span className="credential-field-label" title={field.label}>
                {field.label || "Field"}
              </span>
              <span className="credential-field-value" title={revealedFields ? field.value : ""}>
                {valText}
              </span>
              {revealedFields && (
                <button
                  type="button"
                  className="credential-copy-btn"
                  onClick={() => handleCopy(field.label, field.value)}
                >
                  {copiedLabel === field.label ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {credential.notes && <p className="credential-notes">{credential.notes}</p>}

      <div className="credential-card-actions">
        {!revealedFields ? (
          <button className="btn-ghost btn-sm" onClick={handleReveal} disabled={loading}>
            {loading ? "Unlocking…" : "Reveal"}
          </button>
        ) : (
          <button className="btn-ghost btn-sm" onClick={handleHide}>
            Hide
          </button>
        )}
      </div>
    </div>
  );
}