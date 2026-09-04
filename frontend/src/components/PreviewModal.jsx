import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { getDownloadUrl, replaceDocumentFile } from "../api";

// PDF.js worker setup using reliable cdnjs fallback
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function PreviewModal({ document, onClose, onChanged }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const replaceInputRef = useRef(null);

  const format = (document?.format || "").toLowerCase();
  const isPdf = format === "pdf";
  const isImage = ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(format);
  const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(format);

  // Fetch PDF as Blob to bypass CORS / Auth token restrictions
useEffect(() => {
  if (!document || !isPdf || !document.viewUrl) return;

  let active = true;
  setLoadingPdf(true);
  setPdfError(null);

  // Get token if stored in localStorage/cookies
  const token = localStorage.getItem("token");

  fetch(document.viewUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: Unable to fetch document`);
      return res.blob();
    })
    .then((blob) => {
      if (active) {
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
        setLoadingPdf(false);
      }
    })
    .catch((err) => {
      if (active) {
        setPdfError(err.message);
        setLoadingPdf(false);
      }
    });

  return () => {
    active = false;
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [document, isPdf]);
  if (!document) return null;

  const handleDownload = async () => {
    try {
      const { downloadUrl } = await getDownloadUrl(document._id);
      window.location.href = downloadUrl;
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReplaceFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { document: updated } = await replaceDocumentFile(document._id, file);
      onChanged(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <p className="modal-title" title={document.name}>{document.name}</p>
          <button className="modal-close" onClick={onClose} aria-label="Close preview">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flexDirection: "column" }}>
          {isPdf ? (
            <div className="pdf-viewer-container">
              {loadingPdf && (
                <div className="pdf-status"><p>Loading PDF preview…</p></div>
              )}

              {pdfError && (
                <div className="pdf-status pdf-error">
                  <p>Unable to load PDF preview.</p>
                  <button className="btn btn-ghost" onClick={handleDownload}>
                    Download to view
                  </button>
                </div>
              )}

              {pdfBlobUrl && !loadingPdf && !pdfError && (
                <Document
                  file={pdfBlobUrl}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setPageNumber(1);
                  }}
                  onLoadError={(err) => setPdfError(err.message)}
                >
                  <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} width={580} />
                </Document>
              )}
            </div>
          ) : isOfficeDoc ? (
            <iframe
              title={document.name}
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.viewUrl)}`}
              className="modal-frame"
            />
          ) : isImage ? (
            <img src={document.viewUrl} alt={document.name} className="modal-image" />
          ) : (
            <div className="modal-no-preview">
              <p>No inline preview for .{format} files.</p>
            </div>
          )}
        </div>

        {/* Multi-Page Pagination */}
        {isPdf && numPages > 1 && (
          <div className="pdf-pagination">
            <button className="btn btn-ghost" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
              Previous
            </button>
            <span>Page {pageNumber} of {numPages}</span>
            <button className="btn btn-ghost" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => replaceInputRef.current?.click()}>Replace file</button>
          <button className="btn" onClick={handleDownload}>Download</button>
          <input ref={replaceInputRef} type="file" className="visually-hidden" onChange={handleReplaceFile} />
        </div>
      </div>
    </div>
  );
}