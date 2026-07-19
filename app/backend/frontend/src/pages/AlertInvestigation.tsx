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

export function AlertInvestigation() {
  const nav = useNavigate();
  const { current } = usePersona();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    getQueue(current.analyst_id).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [current]);

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
      <h1 className="page-title">My Queue — {current?.analyst_name}</h1>
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
          <thead><tr><th>Alert ID</th><th>Customer</th><th>Scenario</th><th>Risk Score</th><th>Priority</th><th>Amount</th><th>Days</th><th>Action</th></tr></thead>
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
        <td><span style={{ color: "var(--navy)", fontWeight: 700 }}>{a.risk_score}</span></td>
        <td><Sev s={a.priority} /></td>
        <td style={{ fontWeight: 600 }}>{money(a.amount)}</td>
        <td style={{ color: num(a.days_open) > 90 ? "var(--critical)" : undefined }}>{a.days_open}</td>
        <td style={{ display: "flex", gap: 6 }}>
          <button className="btn sm ghost" onClick={ai} disabled={busy} title="AI: why this matters">✦</button>
          <button className="btn sm" onClick={() => nav(`/investigation/${a.case_id}`)}>Investigate</button>
        </td>
      </tr>
      {blurb && (
        <tr><td colSpan={8} style={{ background: "var(--canvas)", borderLeft: "3px solid var(--accent)" }}>
          <span className="muted" style={{ fontWeight: 700, marginRight: 8 }}>✦ AI</span>{blurb}
        </td></tr>
      )}
    </>
  );
}
