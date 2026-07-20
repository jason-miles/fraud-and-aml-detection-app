import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { sarOrchestrate, sarSubmit, goamlUrl, goamlValidate } from "../api";
import { Loading, usePersona, money } from "../components/ui";

const AGENT_LABEL: Record<string, string> = {
  transaction_analysis: "Transaction Analysis",
  adverse_media: "Adverse Media & Screening",
  policy: "Policy & Typology",
};

export function SarFiling() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { current } = usePersona();
  const [sar, setSar] = useState<any>(null);
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [valid, setValid] = useState<any>(null);
  const [approver, setApprover] = useState("");
  const [submitErr, setSubmitErr] = useState("");

  const run = () => {
    setBusy(true);
    sarOrchestrate({ case_id: caseId }).then((r) => {
      setSar(r); setNarrative(r.narrative || ""); setBusy(false);
    }).catch(() => setBusy(false));
  };
  useEffect(() => {
    run();
    goamlValidate(caseId!).then(setValid).catch(() => setValid(null));
  }, [caseId]);

  async function submit() {
    setSubmitErr("");
    const r: any = await sarSubmit({
      case_id: caseId, customer_name: sar.customer_name, scenario: sar.scenario,
      narrative, decision: "SAR Filed", filed_by: current?.analyst_name, approved_by: approver,
    });
    if (r && r.ok === false) { setSubmitErr(r.error || "SAR filing rejected."); return; }
    setSubmitted(true);
  }

  if (!sar && busy) return <Loading what="multi-agent SAR workflow (gathering evidence + agents)" />;
  if (!sar) return <Loading what="SAR" />;

  const ev = sar.evidence || {};
  return (
    <>
      <Link to={`/investigation/${caseId}`} className="muted">← Back to Investigation</Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>SAR Filing</h1>
      <p className="page-sub">Suspicious Activity Report · case <span className="mono">{caseId}</span> · multi-agent orchestration + goAML output</p>

      <div className="grid-2">
        <div className="panel">
          <h3 className="left">Auto-Gathered Evidence Pack <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(assembled by agents)</span></h3>
          <div className="kv"><span className="k">Customer</span><span>{sar.customer_name}</span></div>
          <div className="kv"><span className="k">Scenario</span><span>{sar.scenario}</span></div>
          <div className="kv"><span className="k">Amount</span><span>{money(sar.amount)}</span></div>
          <div className="kv"><span className="k">Flagged txns</span><span>{(ev.transactions || []).length}</span></div>
          <div className="kv"><span className="k">Counterparties</span><span>{(ev.network || []).length}</span></div>
          <div className="kv"><span className="k">Watchlist hits</span><span style={{ color: (ev.screening || []).length ? "var(--critical)" : undefined }}>{(ev.screening || []).length}</span></div>
          <div className="kv"><span className="k">Adverse media</span><span>{(ev.adverse_media || []).length} retrieved</span></div>
          <div className="kv"><span className="k">pKYC band</span><span>{ev.pkyc?.risk_band || "—"}</span></div>
        </div>
        <div className="panel">
          <h3 className="left">Filing Details</h3>
          <div className="kv"><span className="k">Filed by</span><span>{current?.analyst_name}</span></div>
          <div className="kv"><span className="k">Team</span><span>{current?.team_name}</span></div>
          <div className="kv"><span className="k">Decision</span><span>SAR Filed</span></div>
          <div className="kv"><span className="k">Format</span><span>goAML STR (UN/UNODC)</span></div>
        </div>
      </div>

      {(ev.adverse_media || []).length > 0 && (
        <div className="panel">
          <h3 className="left">Grounded Adverse Media <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(vector-search retrieved — cited in the narrative)</span></h3>
          <table>
            <thead><tr><th>Headline</th><th>Source</th><th>Published</th><th>Relevance</th></tr></thead>
            <tbody>
              {ev.adverse_media.map((a: any, i: number) => (
                <tr key={i}>
                  <td>{a.headline}</td>
                  <td className="muted">{a.source}</td>
                  <td className="muted mono">{a.published_at}</td>
                  <td><span style={{ fontWeight: 700, color: a.score >= 0.7 ? "var(--critical)" : "var(--navy)" }}>{a.score != null ? a.score.toFixed(2) : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3 className="left">Multi-Agent Trace</h3>
        {(sar.agent_trace || []).map((t: any, i: number) => (
          <div key={i} className="explain" style={{ marginBottom: 8, borderLeft: "3px solid var(--accent)" }}>
            <span className="muted" style={{ fontWeight: 700, marginRight: 8 }}>✦ {AGENT_LABEL[t.agent] || t.agent}</span>{t.finding}
          </div>
        ))}
        <div className="explain" style={{ borderLeft: "3px solid var(--navy)" }}>
          <span className="muted" style={{ fontWeight: 700, marginRight: 8 }}>▣ Supervisor synthesis</span>
          feeds the narrative below.
        </div>
      </div>

      <div className="panel">
        <h3 className="left">SAR Narrative <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(supervisor-synthesised, editable)</span></h3>
        <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} style={{ width: "100%", minHeight: 240, lineHeight: 1.6 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn ghost" onClick={run} disabled={busy}>{busy ? "Re-running agents…" : "↻ Re-run agents"}</button>
          <a className="btn ghost" href={goamlUrl(caseId!, narrative)} download>⤓ Download goAML XML</a>
          {valid && (
            <span className="badge" title={(valid.issues || []).join("; ")}
              style={{ alignSelf: "center", background: valid.valid ? "var(--navy)" : "var(--critical)", color: "#fff" }}>
              {valid.valid ? "✓ goAML schema valid" : "✗ goAML issues"} ({valid.checks_passed}/{valid.checks_total})
            </span>
          )}
          <button className="btn" onClick={submit}
            disabled={submitted || !approver.trim() || approver.trim().toLowerCase() === (current?.analyst_name || "").toLowerCase()}>
            {submitted ? "✓ SAR Filed" : "File SAR"}
          </button>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="k" style={{ fontWeight: 600 }}>Four-eyes approver</span>
          <input value={approver} onChange={(e) => setApprover(e.target.value)}
            placeholder="second approver (must differ from filer)" style={{ minWidth: 280 }} />
          <span className="muted" style={{ fontSize: 12 }}>
            Filing requires a second, distinct approver — {current?.analyst_name} is the filer.
          </span>
        </div>
        {submitErr && <div className="explain" style={{ marginTop: 10, borderLeft: "3px solid var(--critical)" }}>{submitErr}</div>}
        {valid && !valid.valid && (valid.issues || []).length > 0 && (
          <ul className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
            {valid.issues.map((iss: string, i: number) => <li key={i}>{iss}</li>)}
          </ul>
        )}
        {submitted && (
          <div className="explain" style={{ marginTop: 14 }}>
            SAR filed and captured in the audit trail — traceable end-to-end. The goAML XML is ready for FIC submission.
            <div style={{ marginTop: 8 }}><button className="btn sm ghost" onClick={() => nav("/investigation")}>Return to Queue</button></div>
          </div>
        )}
      </div>
    </>
  );
}
