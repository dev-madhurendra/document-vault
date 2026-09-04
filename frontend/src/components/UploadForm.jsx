import { useState, useRef } from "react";
import { uploadDocument } from "../api";

export default function UploadForm({ onUploaded }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected || null);
    // Pre-fill the name field from the file, but let the user override it.
    if (selected && !name) {
      setName(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (!name.trim()) {
      setError("Give the document a name so you can search for it later.");
      return;
    }
    setProgress(0);
    try {
      const data = await uploadDocument(file, name.trim(), setProgress);
      onUploaded(data.document);
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="upload-panel">
      <h2>Add a document</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="upload-row">
          <div className="file-picker">
            <label className="file-picker-btn" htmlFor="file-input">
              {file ? file.name : "Choose a PDF, image, or any file…"}
            </label>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              onChange={onFileChange}
            />
          </div>
          <div className="field">
            <label htmlFor="doc-name">Document name</label>
            <input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aadhaar card, Rent agreement 2026"
            />
          </div>
          <button className="btn" type="submit" disabled={progress !== null}>
            {progress !== null ? `Uploading ${progress}%` : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}
