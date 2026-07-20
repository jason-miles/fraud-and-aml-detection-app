import { useEffect, useState } from "react";
import { getScreening, getPkyc, getPkycSummary, getAnomalies, getModelGovernance } from "../api";
import { Loading, num, money } from "../components/ui";

function Badge({ s }: { s: string }) {
  const map: Record<string, string> = { confirmed: "critical", probable: "high", possible: "medium",
    critical: "critical", high: "high", medium: "medium", low: "low" };
  return <span className={`badge sev-${map[s] || "medium"}`}>{s}</span>;
}

export function Compliance() {
  const [tab, setTab] = useState<"screening" | "pkyc" | "anomaly" | "model">("screening");
  return (
    <>
      <h1 className="page-title">Compliance & Risk</h1>
      <p className="page-sub">Sanctions & watchlist screening · perpetual KYC · behavioural peer-group anomaly detection · model governance.</p>
      <div className="tabs">
        <button className={tab === "screening" ? "active" : ""} onClick={() => setTab("screening")}>Sanctions Screening</button>
        <button className={tab === "pkyc" ? "active" : ""} onClick={() => setTab("pkyc")}>Perpetual KYC</button>
        <button className={tab === "anomaly" ? "active" : ""} onClick={() => setTab("anomaly")}>Peer Anomalies</button>
        <button className={tab === "model" ? "active" : ""} onClick={() => setTab("model")}>Model Governance</button>
      </div>
      {tab === "screening" && <Screening />}
      {tab === "pkyc" && <Pkyc />}
      {tab === "anomaly" && <Anomaly />}
      {tab === "model" && <ModelGovernance />}
    </>
  );
}

function ModelGovernance() {
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getModelGovernance().then((r) => { setM(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Loading what="model validation record" />;
  if (!m || m.model_version == null) return <p className="muted">No registered model metrics found. Train &amp; score the SAR model first.</p>;
  const pct = (x: any) => `${(num(x) * 100).toFixed(1)}%`;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="label">False Positives ↓</div><div className="value red">{num(m.fp_reduction_pct).toFixed(1)}%</div></div>
        <div className="kpi"><div className="label">ROC-AUC</div><div className="value navy">{num(m.roc_auc).toFixed(3)}</div></div>
        <div className="kpi"><div className="label">Precision</div><div className="value navy">{pct(m.precision)}</div></div>
        <div className="kpi"><div className="label">Recall</div><div className="value navy">{pct(m.recall)}</div></div>
      </div>

      <div className="panel">
        <h3 className="left">Model Validation Record — SAR-propensity classifier</h3>
        <p className="muted" style={{ margin: "4px 0 14px" }}>
          At an equal alert budget, the served model surfaces <strong>{num(m.fp_reduction_pct).toFixed(1)}% fewer false positives</strong> than
          the legacy rules score ({m.model_fp} vs {m.rules_fp} on the held-out test set) — the same true-positive workload, fewer wasted investigations.
          The displayed AI risk blends the model ({pct(m.blend_model_weight)}) with rules ({pct(m.blend_rules_weight)}), with rules as a floor.
        </p>
        <table>
          <tbody>
            <tr><td>Model</td><td className="mono">{m.model_name}</td></tr>
            <tr><td>Version</td><td><span className="badge">v{m.model_version}</span> · {m.governance_status}</td></tr>
            <tr><td>Algorithm</td><td>{m.algorithm}</td></tr>
            <tr><td>Registry</td><td>Unity Catalog Model Registry (MLflow)</td></tr>
            <tr><td>MLflow run</td><td className="mono">{m.run_id}</td></tr>
            <tr><td>Features</td><td>{m.n_features}</td></tr>
            <tr><td>Labelled cases</td><td>{m.n_labelled} ({pct(m.positive_rate)} SAR-filed)</td></tr>
            <tr><td>F1</td><td>{num(m.f1).toFixed(3)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function Screening() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getScreening("", 200).then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Loading what="screening hits" />;
  const confirmed = rows.filter((r) => r.confidence === "confirmed").length;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="label">Total Hits</div><div className="value navy">{rows.length}</div></div>
        <div className="kpi"><div className="label">Confirmed</div><div className="value red">{confirmed}</div></div>
        <div className="kpi"><div className="label">Sanctions</div><div className="value navy">{rows.filter((r) => r.list_type === "sanctions").length}</div></div>
        <div className="kpi"><div className="label">PEP</div><div className="value navy">{rows.filter((r) => r.list_type === "pep").length}</div></div>
      </div>
      <div className="panel">
        <h3 className="left">Screening Hits — customers & counterparties vs sanctions / PEP / adverse watchlists</h3>
        <table>
          <thead><tr><th>Entity</th><th>Type</th><th>Watchlist Match</th><th>List</th><th>Source</th><th>Confidence</th><th>Score</th><th>Reason</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.screening_id}>
                <td style={{ fontWeight: 600 }}>{r.entity_name}</td>
                <td className="muted">{r.party_type}</td>
                <td>{r.watch_name}</td>
                <td><Badge s={r.list_type} /></td>
                <td className="muted">{r.list_source}</td>
                <td><Badge s={r.confidence} /></td>
                <td>{Number(r.match_score).toFixed(2)}</td>
                <td className="muted" style={{ maxWidth: 260 }}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pkyc() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([getPkyc(20, 100), getPkycSummary()]).then(([r, s]) => { setRows(r); setSummary(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Loading what="perpetual KYC" />;
  const band = (b: string) => num((summary?.bands || []).find((x: any) => x.risk_band === b)?.customers);
  const eddTotal = (summary?.bands || []).reduce((s: number, x: any) => s + num(x.edd_required), 0);
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="label">Critical Risk</div><div className="value red">{band("critical")}</div></div>
        <div className="kpi"><div className="label">High Risk</div><div className="value navy">{band("high")}</div></div>
        <div className="kpi"><div className="label">Medium Risk</div><div className="value navy">{band("medium")}</div></div>
        <div className="kpi"><div className="label">EDD Reviews Due</div><div className="value red">{eddTotal}</div></div>
      </div>
      <div className="panel">
        <h3 className="left">Dynamic Customer Risk — continuously recomputed from alerts, sanctions, adverse media, geography & exposure</h3>
        <table>
          <thead><tr><th>Customer</th><th>Segment</th><th>Country</th><th>Dynamic Risk</th><th>Band</th><th>EDD</th><th>Risk Drivers</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id}>
                <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                <td className="muted">{r.segment}</td>
                <td>{r.country}</td>
                <td><strong>{r.dynamic_risk}</strong>/100</td>
                <td><Badge s={r.risk_band} /></td>
                <td>{String(r.edd_review_required) === "true" ? <span className="badge sev-high">Required</span> : <span className="muted">—</span>}</td>
                <td className="muted" style={{ maxWidth: 340 }}>{r.risk_drivers || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Anomaly() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAnomalies(100).then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Loading what="peer anomalies" />;
  return (
    <>
      <div className="panel">
        <h3 className="left">Behavioural Peer-Group Anomalies — customers behaving unlike their segment peers (unsupervised, 3σ+)</h3>
        <p className="muted" style={{ marginTop: 0 }}>Catches novel typologies fixed thresholds miss — the false-positive-reduction story.</p>
        <table>
          <thead><tr><th>Customer</th><th>Segment</th><th>Txns (90d)</th><th>Peer Avg</th><th>Anomaly σ</th><th>Severity</th><th>Explanation</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id}>
                <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                <td className="muted">{r.segment}</td>
                <td>{r.txn_count}</td>
                <td className="muted">{Number(r.peer_avg_txns).toFixed(0)}</td>
                <td><strong>{Number(r.anomaly_score).toFixed(1)}σ</strong></td>
                <td><Badge s={r.severity} /></td>
                <td className="muted" style={{ maxWidth: 400 }}>{r.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
