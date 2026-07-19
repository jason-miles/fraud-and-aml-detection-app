import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { sarGenerate, sarSubmit } from "../api";
import { Loading, usePersona, money } from "../components/ui";

export function SarFiling() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { current } = usePersona();
  const [sar, setSar] = useState<any>(null);
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setBusy(true);
    sarGenerate({ case_id: caseId }).then((r) => {
      setSar(r); setNarrative(r.narrative || ""); setBusy(false);
    }).catch(() => setBusy(false));
  }, [caseId]);

  async function regenerate() {
    setBusy(true);
    const r = await sarGenerate({ case_id: caseId });
    setSar(r); setNarrative(r.narrative || ""); setBusy(false);
  }
  async function submit() {
    await sarSubmit({
      case_id: caseId, customer_name: sar.customer_name, scenario: sar.scenario,
      narrative, decision: "SAR Filed", filed_by: current?.analyst_name,
    });
    setSubmitted(true);
  }

  if (!sar && busy) return <Loading what="SAR draft (AI generating)" />;
  if (!sar) return <Loading what="SAR" />;

  return (
    <>
      <Link to={`/investigation/${caseId}`} className="muted">← Back to Investigation</Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>SAR Filing</h1>
      <p className="page-sub">Suspicious Activity Report · case <span className="mono">{caseId}</span></p>

      <div className="grid-2">
        <div className="panel">
          <h3 className="left">Case Metadata <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(pre-populated by agents)</span></h3>
          <div className="kv"><span className="k">Customer</span><span>{sar.customer_name}</span></div>
          <div className="kv"><span className="k">Scenario</span><span>{sar.scenario}</span></div>
          <div className="kv"><span className="k">Priority</span><span style={{ textTransform: "capitalize" }}>{sar.priority}</span></div>
          <div className="kv"><span className="k">Risk Score</span><span>{sar.risk_score}/100</span></div>
          <div className="kv"><span className="k">Amount</span><span>{money(sar.amount)}</span></div>
        </div>
        <div className="panel">
          <h3 className="left">Filing Details</h3>
          <div className="kv"><span className="k">Filed by</span><span>{current?.analyst_name}</span></div>
          <div className="kv"><span className="k">Team</span><span>{current?.team_name}</span></div>
          <div className="kv"><span className="k">Decision</span><span>SAR Filed</span></div>
          <div className="kv"><span className="k">Format</span><span>Institution SAR spec</span></div>
        </div>
      </div>

      <div className="panel">
        <h3 className="left">AI-Generated SAR Narrative</h3>
        <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} style={{ width: "100%", minHeight: 260, lineHeight: 1.6 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn ghost" onClick={regenerate} disabled={busy}>{busy ? "Regenerating…" : "↻ Regenerate with Agent"}</button>
          <button className="btn" onClick={submit} disabled={submitted}>{submitted ? "✓ SAR Filed" : "Generate PDF & Submit SAR"}</button>
        </div>
        {submitted && (
          <div className="explain" style={{ marginTop: 14 }}>
            SAR filed and pushed to the backend audit trail — fully traceable from an auditability perspective.
            <div style={{ marginTop: 8 }}><button className="btn sm ghost" onClick={() => nav("/investigation")}>Return to Queue</button></div>
          </div>
        )}
      </div>
    </>
  );
}
