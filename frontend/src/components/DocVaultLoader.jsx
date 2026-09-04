import React from "react";

export default function DocVaultLoader({ text = "Unlocking your vault..." }) {
  return (
    <div className="docvault-loader-container">
      <div className="docvault-loader-card">
        <div className="docvault-vault-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="8" y="12" width="8" height="6" rx="1" className="vault-door" />
            <circle cx="12" cy="15" r="1" className="vault-lock" />
          </svg>
          <div className="docvault-pulse-ring" />
        </div>
        <div className="docvault-loader-brand">
          Doc<span>Vault</span>
        </div>
        <p className="docvault-loader-text">{text}</p>
        <div className="docvault-loader-bar">
          <div className="docvault-loader-progress" />
        </div>
      </div>
    </div>
  );
}