import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import { deleteDocument, renameDocument, replaceDocumentFile, getDownloadUrl } from "../api";

function formatBytes(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function DocumentCard({ 
    document, 
    onView, 
    onChanged, 
    onDeleted, 
    onMoveSingle, 
    isSelected, 
    hasSelection,
    onToggleSelect 
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState(document.name);
    const [busy, setBusy] = useState(false);
    const [replaceProgress, setReplaceProgress] = useState(null);
    const menuRef = useRef(null);
    const replaceInputRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        window.document.addEventListener("mousedown", onClickOutside);
        return () => window.document.removeEventListener("mousedown", onClickOutside);
    }, [menuOpen]);

    const extension = (document.format || document.originalFileName?.split(".").pop() || "file").slice(0, 4);

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        const trimmed = nameDraft.trim();
        if (!trimmed || trimmed === document.name) {
            setEditing(false);
            setNameDraft(document.name);
            return;
        }
        setBusy(true);
        try {
            const { document: updated } = await renameDocument(document._id, trimmed);
            onChanged(updated);
        } catch (err) {
            alert(err.message);
            setNameDraft(document.name);
        } finally {
            setBusy(false);
            setEditing(false);
        }
    };

    const handleReplaceFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setReplaceProgress(0);
        try {
            const { document: updated } = await replaceDocumentFile(document._id, file, setReplaceProgress);
            onChanged(updated);
        } catch (err) {
            alert(err.message);
        } finally {
            setReplaceProgress(null);
            if (replaceInputRef.current) replaceInputRef.current.value = "";
        }
    };

    const handleDownload = async () => {
        setBusy(true);
        try {
            const { downloadUrl } = await getDownloadUrl(document._id);
            window.location.href = downloadUrl;
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handlePdfDownload = async () => {
        setBusy(true);
        try {
            const { downloadUrl } = await getDownloadUrl(document._id);
            const isPdfAlready = extension.toLowerCase() === "pdf";

            if (isPdfAlready) {
                const link = window.document.createElement("a");
                link.href = downloadUrl;
                link.download = `${document.name}.pdf`;
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
                return;
            }

            const res = await fetch(downloadUrl);
            const blob = await res.blob();

            const img = new Image();
            img.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Failed to load document preview."));
            });

            const orientation = img.width > img.height ? "landscape" : "portrait";
            const pdf = new jsPDF({
                orientation,
                unit: "px",
                format: [img.width, img.height],
            });

            pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
            pdf.save(`${document.name}.pdf`);
            URL.revokeObjectURL(img.src);
        } catch (err) {
            alert(`PDF Conversion Error: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Remove "${document.name}"? This can't be undone.`)) return;
        setBusy(true);
        try {
            await deleteDocument(document._id);
            onDeleted(document._id);
        } catch (err) {
            alert(err.message);
            setBusy(false);
        }
    };

    return (
        <div className={`doc-card ${isSelected ? "selected" : ""}`}>
            {/* Display checkbox if item is selected, multi-selection is active, or hovered */}
            <div className={`doc-select-box ${hasSelection || isSelected ? "force-visible" : ""}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(document._id)}
                    aria-label={`Select ${document.name}`}
                />
            </div>

            <button
                className="doc-thumb"
                onClick={() => onView(document)}
                aria-label={`View ${document.name}`}
            >
                {document.thumbnailUrl ? (
                    <img src={document.thumbnailUrl} alt="" />
                ) : (
                    <span className="doc-thumb-ext">{extension}</span>
                )}
                {replaceProgress !== null && (
                    <span className="doc-thumb-progress">Replacing… {replaceProgress}%</span>
                )}
            </button>

            <div className="doc-card-body">
                {editing ? (
                    <form onSubmit={handleRenameSubmit} className="doc-rename-form">
                        <input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={handleRenameSubmit}
                            disabled={busy}
                        />
                    </form>
                ) : (
                    <p className="doc-name" title={document.name}>
                        {document.name}
                    </p>
                )}
                <p className="doc-meta">
                    {formatDate(document.createdAt)} · {formatBytes(document.bytes)}
                </p>
            </div>

            <div className="doc-menu" ref={menuRef}>
                <button
                    className="doc-menu-trigger"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Document options"
                    disabled={busy}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                </button>
                {menuOpen && (
                    <div className="doc-menu-panel">
                        <button onClick={() => { onView(document); setMenuOpen(false); }}>View</button>
                        <button onClick={() => { setEditing(true); setMenuOpen(false); }}>Rename</button>
                        <button onClick={() => { onMoveSingle(document._id); setMenuOpen(false); }}>
                            📁 Move to workspace
                        </button>
                        <button onClick={() => { replaceInputRef.current?.click(); setMenuOpen(false); }}>
                            Replace file
                        </button>
                        <button onClick={() => { handleDownload(); setMenuOpen(false); }}>
                            Download
                        </button>
                        <button onClick={() => { handlePdfDownload(); setMenuOpen(false); }}>
                            Download as PDF
                        </button>
                        <button className="doc-menu-danger" onClick={() => { handleDelete(); setMenuOpen(false); }}>
                            Delete
                        </button>
                    </div>
                )}
                <input
                    ref={replaceInputRef}
                    type="file"
                    className="visually-hidden"
                    onChange={handleReplaceFile}
                />
            </div>
        </div>
    );
}