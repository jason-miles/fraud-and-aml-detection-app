import React from "react";

export function Sev({ s }: { s: string }) {
  return <span className={`badge sev-${s}`}>{s}</span>;
}

export function Loading({ what = "data" }: { what?: string }) {
  return <div className="loading">Loading {what}…</div>;
}

export function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="tile">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

// Databricks numbers often arrive as strings — format safely.
export function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
export function money(v: any): string {
  return "R" + num(v).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}
export function fmtDate(v: any): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(v);
  }
}
