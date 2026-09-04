import { useState } from "react";

let fieldIdCounter = 0;
function nextFieldId() {
  fieldIdCounter += 1;
  return `f${fieldIdCounter}`;
}

const FIELD_PRESETS = [
  "Roll No",
  "Registration No",
  "Username",
  "Email",
  "Password",
  "PIN",
];

function emptyField(label = "") {
  return { id: nextFieldId(), label, value: "", isSecret: true };
}

export default function CredentialForm({ onSubmit, onCancel, initialTitle = "" }) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState([emptyField("Username"), emptyField("Password")]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = (id, patch) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addField = (label = "") => {
    setFields((prev) => [...prev, emptyField(label)]);
  };

  const removeField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Give this credential a title, e.g. 'IBPS SO IT 2026'.");
      return;
    }
    const cleanFields = fields
      .map((f) => ({ label: f.label.trim(), value: f.value, isSecret: f.isSecret }))
      .filter((f) => f.label);

    if (cleanFields.length === 0) {
      setError("Add at least one field (e.g. Roll No, Password).");
      return;
    }
    if (cleanFields.some((f) => !f.value)) {
      setError("Every field needs a value before saving.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), notes: notes.trim(), fields: cleanFields });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="credential-form" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>Title</label>
        <input
          type="text"
          placeholder="e.g. IBPS SO IT 2026, Netflix, Home Wifi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="dynamic-fields">
        <label className="dynamic-fields-label">Fields</label>

        {fields.map((field) => (
          <div className="dynamic-field-row" key={field.id}>
            <input
              type="text"
              className="dynamic-field-label"
              placeholder="Label (e.g. Roll No)"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
            />
            <input
              type={field.isSecret ? "password" : "text"}
              className="dynamic-field-value"
              placeholder="Value"
              value={field.value}
              onChange={(e) => updateField(field.id, { value: e.target.value })}
            />
            <label className="dynamic-field-secret-toggle" title="Mask this value by default">
              <input
                type="checkbox"
                checked={field.isSecret}
                onChange={(e) => updateField(field.id, { isSecret: e.target.checked })}
              />
              Mask
            </label>
            <button
              type="button"
              className="dynamic-field-remove"
              onClick={() => removeField(field.id)}
              aria-label="Remove field"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="dynamic-field-presets">
          {FIELD_PRESETS.map((preset) => (
            <button type="button" key={preset} className="preset-chip" onClick={() => addField(preset)}>
              + {preset}
            </button>
          ))}
          <button type="button" className="preset-chip preset-chip-custom" onClick={() => addField()}>
            + Custom field
          </button>
        </div>
      </div>

      <div className="field">
        <label>Notes (optional)</label>
        <input
          type="text"
          placeholder="Anything else worth remembering about this"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="panel-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save credential"}
        </button>
      </div>
    </form>
  );
}