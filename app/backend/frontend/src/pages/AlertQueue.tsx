import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAlerts, getAlertSummary } from "../api";
import { Sev, Loading, Tile, fmtDate } from "../components/ui";

const SEVERITIES = ["", "critical", "high", "medium", "low"];

export function AlertQueue() {
  const nav = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sev, setSev] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlertSummary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sev) params.set("severity", sev);
    if (type) params.set("alert_type", type);
    const qs = params.toString() ? `?${params}` : "";
    getAlerts(qs).then((r) => { setAlerts(r); setLoading(false); }).catch(() => setLoading(false));
  }, [sev, type]);

  const t = summary?.totals || {};
  return (
    <>
      <h1 className="page-title">Alert Queue</h1>
      <p className="page-sub">Fraud & AML alerts across nine detection families — do less, get more with Unity Catalog.</p>

      <div className="tiles">
        <Tile label="Total alerts" value={t.total ?? "—"} />
        <Tile label="Critical" value={<span style={{ color: "var(--critical)" }}>{t.critical ?? "—"}</span>} />
        <Tile label="Entities flagged" value={t.entities ?? "—"} />
        <Tile label="Detection families" value={summary?.by_type?.length ?? "—"} />
      </div>

      <div className="panel">
        <div style={{ marginBottom: 14 }}>
          <strong>Severity:</strong>{" "}
          {SEVERITIES.map((s) => (
            <span key={s || "all"} className={`chip ${sev === s ? "active" : ""}`} onClick={() => setSev(s)}>
              {s || "all"}
            </span>
          ))}
        </div>
        <div>
          <strong>Type:</strong>{" "}
          <span className={`chip ${type === "" ? "active" : ""}`} onClick={() => setType("")}>all</span>
          {(summary?.by_type || []).map((r: any) => (
            <span key={r.alert_type} className={`chip ${type === r.alert_type ? "active" : ""}`}
              onClick={() => setType(r.alert_type)}>
              {r.alert_type} ({r.cnt})
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        {loading ? <Loading what="alerts" /> : (
          <table>
            <thead>
              <tr><th>Type</th><th>Severity</th><th>Entity</th><th>Score</th><th>Triggered</th><th>Explanation</th></tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.alert_id} className="clickable" onClick={() => nav(`/alerts/${a.alert_id}`)}>
                  <td>{a.alert_type}</td>
                  <td><Sev s={a.severity} /></td>
                  <td className="mono">{a.primary_entity_id || "—"}</td>
                  <td>{Number(a.score).toFixed(2)}</td>
                  <td className="muted">{fmtDate(a.triggered_at)}</td>
                  <td style={{ maxWidth: 380 }}>{a.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
