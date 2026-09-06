import { useState } from "react";
import { createPortal } from "react-dom";
import { createShareLink } from "../api";

export default function ShareModal({ document, onClose }) {
    // Custom hours state (defaults to 24 hours)
    const [customHours, setCustomHours] = useState(24);
    const [isNever, setIsNever] = useState(false);
    const [permission, setPermission] = useState("view");
    const [creating, setCreating] = useState(false);
    const [link, setLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        setCreating(true);
        try {
            // Convert custom hours to seconds (1 hour = 3600s), or null if set to never expire
            const seconds = isNever ? null : Math.max(1, Number(customHours)) * 3600;

            const res = await createShareLink(document._id, {
                expiresIn: seconds,
                permission,
            });

            const shareUrl = res?.link?.url || res?.link || res?.shareUrl || res?.url;
            setLink({ url: shareUrl });
        } catch (err) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = () => {
        if (!link?.url) return;
        navigator.clipboard.writeText(link.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Share "{document.name}"</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="share-create-row">
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <label>
                            Expiration (Hours)
                            <input
                                type="number"
                                min="1"
                                step="1"
                                disabled={isNever}
                                value={customHours}
                                onChange={(e) => setCustomHours(e.target.value)}
                                placeholder="Enter hours..."
                                className="custom-hours-input"
                            />
                        </label>

                        <label>
                            Access
                            <select value={permission} onChange={(e) => setPermission(e.target.value)}>
                                <option value="view">Viewer only</option>
                                <option value="download">Viewer + Download</option>
                            </select>
                        </label>
                    </div>

                    {/* Never Expire Toggle & Quick Presets */}
                    <div className="share-expiry-options">
                        <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={isNever}
                                onChange={(e) => setIsNever(e.target.checked)}
                            />
                            Never expire
                        </label>

                        {!isNever && (
                            <div className="quick-presets" style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                {[1, 6, 12, 24, 48, 72].map((hrs) => (
                                    <button
                                        key={hrs}
                                        type="button"
                                        onClick={() => setCustomHours(hrs)}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 12,
                                            borderRadius: 4,
                                            background: Number(customHours) === hrs ? "var(--primary)" : "var(--bg-subtle)",
                                            color: Number(customHours) === hrs ? "#ffffff" : "var(--text-main)",
                                            border: "1px solid var(--border-light)",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {hrs}h
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                        {creating ? "Creating…" : "Create link"}
                    </button>
                </div>

                {link?.url && (
                    <div className="share-links-list">
                        <div className="share-link-row">
                            <div className="share-link-info">
                                <input readOnly value={link.url} className="share-link-input" />
                            </div>
                            <div className="share-link-actions">
                                <button className="btn-primary" onClick={handleCopy}>
                                    {copied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        window.document.body
    );
}