import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAlert, postFeedback } from "../api";
import { Sev, Loading, fmtDate } from "../components/ui";

export function AlertDetail() {
  const { alertId } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState("");

  const load = () => getAlert(alertId!).then(setA).catch(() => {});
  useEffect(() => { load(); }, [alertId]);

  if (!a) return <Loading what="alert" />;

  const evidence: Record<string, string> = a.evidence || {};
  async function feedback(status: string) {
    await postFeedback({ alert_id: a.alert_id, status, reason });
    setSaved(status);
    load();
  }

  return (
    <>
      <Link to="/" className="muted">← Alert Queue</Link>
      <h1 className="page-title" style={{ marginTop: 10 }}>
        {a.alert_type} <Sev s={a.severity} />
      </h1>
      <p className="page-sub mono">{a.alert_id}</p>

      <div className="row">
        <div className="col">
          <div className="panel">
            <h3>Explanation</h3>
            <div className="explain">{a.explanation}</div>
          </div>
          <div className="panel">
            <h3>Evidence</h3>
            {Object.keys(evidence).length === 0 ? <span className="muted">No structured evidence.</span> :
              Object.entries(evidence).map(([k, v]) => (
                <div className="kv" key={k}><span className="k">{k}</span><span className="mono">{String(v)}</span></div>
              ))}
          </div>
        </div>
        <div className="col">
          <div className="panel">
            <h3>Details</h3>
            <div className="kv"><span className="k">Primary entity</span>
              <Link className="mono" to={`/network/${a.primary_entity_id}`}>{a.primary_entity_id}</Link></div>
            <div className="kv"><span className="k">Score</span><span>{Number(a.score).toFixed(2)}</span></div>
            <div className="kv"><span className="k">Status</span><span>{a.status}</span></div>
            <div className="kv"><span className="k">Triggered</span><span className="muted">{fmtDate(a.triggered_at)}</span></div>
            <div className="kv"><span className="k">Accounts</span><span className="mono">{(a.account_ids || []).join(", ") || "—"}</span></div>
          </div>

          <div className="panel">
            <h3>Analyst feedback</h3>
            <textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)}
              style={{ width: "100%", minHeight: 70, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={() => feedback("confirmed")}>Confirm fraud</button>
              <button className="btn ghost" onClick={() => feedback("dismissed")}>Dismiss</button>
              <button className="btn secondary" onClick={() => feedback("reviewing")}>Mark reviewing</button>
            </div>
            {saved && <p className="muted" style={{ marginTop: 10 }}>Saved: {saved} ✓</p>}
            {(a.feedback_history || []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ marginBottom: 6 }}>History</div>
                {a.feedback_history.map((f: any, i: number) => (
                  <div className="kv" key={i}>
                    <span className="k">{f.status} · {f.analyst}</span>
                    <span className="muted">{fmtDate(f.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
