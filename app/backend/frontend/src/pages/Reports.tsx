import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getWeeklyReport } from "../api";
import { Loading, num } from "../components/ui";

export function Reports() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getWeeklyReport().then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const data = rows.map((r) => ({ type: r.alert_type, count: num(r.this_week), critical: num(r.critical) }));
  const totalThisWeek = data.reduce((s, r) => s + r.count, 0);
  const totalCritical = data.reduce((s, r) => s + r.critical, 0);
  const rings = num(rows.find((r) => r.alert_type === "circular_flow")?.this_week);
  const travel = num(rows.find((r) => r.alert_type === "impossible_travel")?.this_week);

  return (
    <>
      <h1 className="page-title">Reports</h1>
      <p className="page-sub">Weekly fraud & AML summary — backed by governed metric views so numbers reconcile.</p>

      {loading ? <Loading what="report" /> : (
        <>
          <div className="panel">
            <h3>This week</h3>
            <div className="explain" style={{ fontSize: 15 }}>
              This week: <strong>{totalThisWeek}</strong> new alerts,{" "}
              <strong>{totalCritical}</strong> critical, including{" "}
              <strong>{rings}</strong> circular-flow ring alerts and{" "}
              <strong>{travel}</strong> impossible-travel cards.
            </div>
          </div>

          <div className="panel">
            <h3>Alerts by type (last 7 days)</h3>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 40 }}>
                <XAxis dataKey="type" angle={-30} textAnchor="end" interval={0} tick={{ fill: "#8b93a7", fontSize: 11 }} height={70} />
                <YAxis tick={{ fill: "#8b93a7", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1c2230", border: "1px solid #2a3140", borderRadius: 8, color: "#e6e9ef" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.map((d, i) => <Cell key={i} fill={d.critical > 0 ? "#ff4d4f" : "#2272b4"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="muted" style={{ fontSize: 12 }}>Red = families containing critical alerts. Ask deeper questions in the "Fraud & AML Analyst" Genie space.</p>
          </div>
        </>
      )}
    </>
  );
}
