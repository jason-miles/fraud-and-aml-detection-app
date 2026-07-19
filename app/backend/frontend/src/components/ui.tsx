import React, { createContext, useContext, useEffect, useState } from "react";
import { getPersonas } from "../api";

export function Sev({ s }: { s: string }) {
  return <span className={`badge sev-${s}`}>{s}</span>;
}
export function Loading({ what = "data" }: { what?: string }) {
  return <div className="loading">Loading {what}…</div>;
}
export function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
export function money(v: any): string {
  return "$" + num(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
export function fmtDate(v: any): string {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-US", { dateStyle: "medium" }); }
  catch { return String(v); }
}

// ── Persona ("View As") context ──────────────────────────────────────────
export type Persona = { analyst_id: string; analyst_name: string; team_id: string; team_name: string };
type Ctx = { personas: Persona[]; current?: Persona; setCurrent: (p: Persona) => void };
const PersonaCtx = createContext<Ctx>({ personas: [], setCurrent: () => {} });
export const usePersona = () => useContext(PersonaCtx);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [current, setCurrent] = useState<Persona>();
  useEffect(() => {
    getPersonas().then((ps: Persona[]) => {
      setPersonas(ps);
      const sarah = ps.find((p) => p.analyst_name === "Sarah Chen") || ps[0];
      setCurrent(sarah);
    }).catch(() => {});
  }, []);
  return <PersonaCtx.Provider value={{ personas, current, setCurrent }}>{children}</PersonaCtx.Provider>;
}
