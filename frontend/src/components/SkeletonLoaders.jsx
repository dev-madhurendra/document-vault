import React from "react";

export function CardSkeleton() {
  return (
    <div className="doc-card skeleton-card">
      <div className="skeleton-thumb skeleton-pulse" />
      <div className="doc-card-body">
        <div className="skeleton-line skeleton-title skeleton-pulse" />
        <div className="skeleton-line skeleton-subtext skeleton-pulse" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="doc-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SidebarSkeleton({ count = 5 }) {
  return (
    <div className="sidebar-skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sidebar-skeleton-item skeleton-pulse" />
      ))}
    </div>
  );
}