import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getQueue, casePrioritize } from "../api";
import { Sev, Loading, usePersona, num, money } from "../components/ui";

// Investec tonal palette: slate-navy shades + gold + muted blue-grey.
const SCEN_COLORS: Record<string, string> = {
  "Cash Structuring Detection": "#30384a", "Dormant Account Reactivation": "#4a5468",
  "Rapid Fund Movement": "#6a7183", "Related Account Movement": "#c9a24b",
  "Round Dollar Pattern": "#8aa0b6", "PEP/Sanctions Alert": "#b42318",
  "High-Risk Geography Transfer": "#b54708", "Beneficiary Mismatch": "#8a6d3b",
  "Third-Party Deposit Pattern": "#aeb6c4",
};

function sinceLabel(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

function LiveDot({ on }: { on: boolean }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: on ? "var(--low)" : "var(--muted)", marginRight: 4,
    boxShadow: on ? "0 0 0 3px color-mix(in srgb, var(--low) 25%, transparent)" : "none" }} />;
}

const REFRESH_MS = 20000; // near-real-time queue refresh cadence

export function AlertInvestigation() {
  const nav = useNavigate();
  const { current } = usePersona();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [, setTick] = useState(0); // ticks so the "updated Ns ago" label stays fresh

  // Initial load (with spinner) whenever the persona changes.
  useEffect(() => {
    if (!current) return;
    setLoading(true);
    getQueue(current.analyst_id).then((d) => { setData(d); setUpdatedAt(Date.now()); setLoading(false); }).catch(() => setLoading(false));
  }, [current]);

  // Live polling — silent refresh (no spinner), pausable.
  useEffect(() => {
    if (!current || !live) return;
    const id = setInterval(() => {
      getQueue(current.analyst_id).then((d) => { setData(d); setUpdatedAt(Date.now()); }).catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [current, live]);

  // Keep the "updated Ns ago" label fresh between refreshes.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  if (loading || !data) return <Loading what="my queue" />;
  const k = data.kpis || {};

  // pivot weekly -> stacked by scenario
  const weeks: Record<string, any> = {};
  const scenarios = new Set<string>();
  (data.weekly || []).forEach((r: any) => {
    const wk = new Date(r.week).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks[wk] = weeks[wk] || { week: `Week of ${wk}` };
    weeks[wk][r.scenario] = num(r.alerts);
    scenarios.add(r.scenario);
  });
  const weekData = Object.values(weeks);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 className="page-title">My Queue — {current?.analyst_name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
          <span className="muted"><LiveDot on={live} /> {live ? "Live" : "Paused"}{updatedAt ? ` · updated ${sinceLabel(updatedAt)}` : ""}</span>
          <button className="btn sm ghost" onClick={() => setLive((v) => !v)}>{live ? "Pause" : "Resume"}</button>
        </div>
      </div>
      <p className="page-sub">{current?.team_name}</p>

      <div className="kpis">
        <div className="kpi"><div className="label"><span className="dot" style={{ background: "var(--critical)" }} />Critical</div><div className="value navy">{k.critical || 0}</div></div>
        <div className="kpi"><div className="label"><span className="dot" style={{ background: "var(--medium)" }} />High</div><div className="value navy">{k.high || 0}</div></div>
        <div className="kpi"><div className="label">Total Alerts</div><div className="value navy">{k.total || 0}</div></div>
        <div className="kpi"><div className="label">New Alerts</div><div className="value" style={{ color: "var(--royal)" }}>{k.new_alerts || 0}</div></div>
      </div>

      <div className="panel">
        <h3 className="left">Daily Alerts by Scenario — {current?.analyst_name}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={weekData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
            <XAxis dataKey="week" tick={{ fill: "#6b7794", fontSize: 11 }} />
            <YAxis tick={{ fill: "#6b7794", fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {[...scenarios].map((s) => (
              <Bar key={s} dataKey={s} stackId="a" fill={SCEN_COLORS[s] || "#94a3b8"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="left">Active Alerts</h3>
        <table>
          <thead><tr><th>Alert ID</th><th>Customer</th><th>Scenario</th><th>Rules Score</th><th>AI Risk</th><th>Priority</th><th>Amount</th><th>Days</th><th>SLA</th><th>Action</th></tr></thead>
          <tbody>
            {(data.active_alerts || []).map((a: any) => <AlertRow key={a.case_id} a={a} nav={nav} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AlertRow({ a, nav }: { a: any; nav: any }) {
  const [blurb, setBlurb] = useState("");
  const [busy, setBusy] = useState(false);
  async function ai() {
    setBusy(true);
    try { const r = await casePrioritize({ case_id: a.case_id }); setBlurb(r.blurb || ""); } catch { setBlurb("AI unavailable."); }
    setBusy(false);
  }
  return (
    <>
      <tr>
        <td className="mono">{a.alert_num}</td>
        <td>{a.customer_name}</td>
        <td>{a.scenario}</td>
        <td><span style={{ color: "var(--muted)", fontWeight: 600 }}>{a.risk_score}</span></td>
        <td>{a.ai_risk != null
          ? <span title={`Served model v${a.model_version}`} style={{ color: num(a.ai_risk) >= 80 ? "var(--critical)" : "var(--navy)", fontWeight: 800 }}>{a.ai_risk}<span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 3 }}>✦AI</span></span>
          : <span className="muted">—</span>}</td>
        <td><Sev s={a.priority} /></td>
        <td style={{ fontWeight: 600 }}>{money(a.amount)}</td>
        <td style={{ color: num(a.days_open) > 90 ? "var(--critical)" : undefined }}>{a.days_open}</td>
        <td>{a.sla ? <SlaBadge sla={a.sla} /> : <span className="muted">—</span>}</td>
        <td style={{ display: "flex", gap: 6 }}>
          <button className="btn sm ghost" onClick={ai} disabled={busy} title="AI: why this matters">✦</button>
          <button className="btn sm" onClick={() => nav(`/investigation/${a.case_id}`)}>Investigate</button>
        </td>
      </tr>
      {blurb && (
        <tr><td colSpan={10} style={{ background: "var(--canvas)", borderLeft: "3px solid var(--accent)" }}>
          <span className="muted" style={{ fontWeight: 700, marginRight: 8 }}>✦ AI</span>{blurb}
        </td></tr>
      )}
    </>
  );
}

export function SlaBadge({ sla }: { sla: any }) {
  const color: Record<string, string> = { on_track: "var(--navy)", at_risk: "#b54708", breached: "var(--critical)" };
  const label: Record<string, string> = { on_track: "On track", at_risk: "At risk", breached: "Breached" };
  const s = sla.status || "on_track";
  const tip = sla.breached
    ? `${-sla.days_remaining}d over ${sla.target_days}d SLA`
    : `${sla.days_remaining}d left of ${sla.target_days}d SLA`;
  return <span className="badge" title={tip} style={{ background: color[s], color: "#fff" }}>{label[s] || s}</span>;
}
