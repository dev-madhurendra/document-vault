import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function SharePage() {
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [numPages, setNumPages] = useState(null);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/share/${token}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Link not available");
                setState({ loading: false, error: null, data });
            })
            .catch((err) => setState({ loading: false, error: err.message, data: null }));
    }, [token]);

    if (state.loading) return <div className="share-page">Loading…</div>;
    if (state.error) return <div className="share-page">{state.error}</div>;

    const { mode, name, viewUrl, downloadUrl, format } = state.data;
    const isPdf = name?.toLowerCase().endsWith(".pdf") || format === "pdf";

    return (
        <div className="share-page">
            <h2>{name}</h2>
            {mode === "download" ? (
                <a className="btn-primary" href={downloadUrl} download>Download</a>
            ) : isPdf ? (
                <div onContextMenu={(e) => e.preventDefault()}>
                    <Document file={viewUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                        {Array.from({ length: numPages || 0 }, (_, i) => (
                            <Page
                                key={i}
                                pageNumber={i + 1}
                                width={800}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        ))}
                    </Document>
                </div>
            ) : (
                <img
                    src={viewUrl}
                    alt={name}
                    onContextMenu={(e) => e.preventDefault()}
                />
            )}
        </div>
    );
}