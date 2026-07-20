"""Multi-agent SAR orchestration + goAML XML (NEXT_STEPS #4).

A supervisor pattern over Mosaic AI (ai_query) specialist agents with a SHARED,
auto-gathered evidence pack:

  1. gather_evidence() assembles the full evidence pack for a case from the real
     gold/silver tables (case, flagged transactions, counterparty network, prior
     alerts, sanctions/watchlist hits, perpetual-KYC risk) — cutting the analyst's
     manual correlation to ~zero.
  2. Specialist agents (transaction-analysis, adverse-media, policy) each reason over
     that shared context and return a finding.
  3. The supervisor synthesises a regulator-ready SAR narrative citing the findings.
  4. build_goaml_xml() emits a goAML-format (UN/UNODC standard) SAR XML from the case
     + evidence — a real structured filing artifact, not just a narrative + "PDF".

All ai_query prompts are bound as parameters (never string-interpolated into SQL).
"""
import html
from typing import Optional
from fastapi import APIRouter, Response
from pydantic import BaseModel

from ..db import fetch_all
from ..config import GOLD_SCHEMA, SILVER_SCHEMA

router = APIRouter(prefix="/api/sar", tags=["sar-agents"])

LLM = "databricks-meta-llama-3-3-70b-instruct"

# Reporting-entity constants for the goAML header (the filing institution).
RE = {
    "id": "INVESTEC-ZA",
    "name": "Investec Bank Limited",
    "type": "BANK",
    "country": "ZA",
    "contact": "Financial Crime Intelligence Unit",
}


def _one(sql: str, params):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def gather_evidence(case_id: str) -> dict:
    """Auto-assemble the full evidence pack for a case from real tables."""
    p = [{"name": "cid", "value": case_id}]
    case = _one(f"""
SELECT case_id, alert_num, customer_id, customer_name, scenario, priority, status,
       team_name, analyst_name, risk_score, amount, days_open
FROM {GOLD_SCHEMA}.sherlock_cases WHERE case_id = :cid
""", p)
    if not case:
        return {}
    cust = case.get("customer_id")
    cp = [{"name": "cust", "value": cust}]

    txns = fetch_all(f"""
SELECT t.transaction_id, t.amount, t.direction, t.channel, t.txn_ts, t.counterparty_id
FROM {SILVER_SCHEMA}.transactions t
JOIN {SILVER_SCHEMA}.accounts a ON a.account_id = t.account_id
WHERE a.customer_id = :cust
ORDER BY t.amount DESC LIMIT 10
""", cp) if cust else []

    network = fetch_all(f"""
SELECT DISTINCT t.counterparty_id, tp.full_name, tp.country, tp.entity_kind
FROM {SILVER_SCHEMA}.transactions t
JOIN {SILVER_SCHEMA}.accounts a ON a.account_id = t.account_id
LEFT JOIN {SILVER_SCHEMA}.third_parties tp ON tp.third_party_id = t.counterparty_id
WHERE a.customer_id = :cust AND t.counterparty_id IS NOT NULL
LIMIT 10
""", cp) if cust else []

    # sanctions / watchlist hits for this subject (by name)
    screening = fetch_all(f"""
SELECT watch_name, list_type, list_source, severity, confidence, match_score
FROM {GOLD_SCHEMA}.sanctions_screening_hits
WHERE entity_name = :name
ORDER BY match_score DESC LIMIT 10
""", [{"name": "name", "value": case.get("customer_name")}])

    pkyc = _one(f"""
SELECT dynamic_risk, risk_band, edd_review_required, risk_drivers,
       alert_count, severe_alerts, sanction_hits, media_hits
FROM {GOLD_SCHEMA}.pkyc_customer_risk WHERE customer_id = :cust
""", cp) if cust else None

    return {"case": case, "transactions": txns, "network": network,
            "screening": screening, "pkyc": pkyc}


def _evidence_brief(ev: dict) -> str:
    """Compact, factual context string handed to every agent (shared memory)."""
    c = ev["case"]
    lines = [
        f"Case {c['case_id']} — customer {c['customer_name']} ({c['customer_id']}). "
        f"Scenario: {c['scenario']}. Priority: {c['priority']}. Rules risk {c['risk_score']}/100. "
        f"Amount ZAR {c['amount']}. {c['days_open']} days open. Team {c['team_name']}.",
    ]
    if ev.get("transactions"):
        t = ev["transactions"]
        lines.append(f"{len(t)} flagged transactions; largest ZAR "
                     f"{max((x['amount'] or 0) for x in t):.0f}; directions "
                     f"{sorted(set(x['direction'] for x in t))}.")
    if ev.get("network"):
        cps = [x for x in ev["network"] if x.get("counterparty_id")]
        countries = sorted({x['country'] for x in cps if x.get('country')})
        lines.append(f"{len(cps)} counterparties across {countries or ['n/a']}.")
    if ev.get("screening"):
        s = ev["screening"]
        lines.append(f"{len(s)} sanctions/watchlist hits: "
                     + "; ".join(f"{x['watch_name']} ({x['list_type']}/{x['confidence']})" for x in s[:4]) + ".")
    if ev.get("pkyc"):
        k = ev["pkyc"]
        lines.append(f"Perpetual-KYC dynamic risk {k['dynamic_risk']} band {k['risk_band']}; "
                     f"EDD required: {k['edd_review_required']}; drivers: {k['risk_drivers']}.")
    return " ".join(lines)


def _agent(system: str, brief: str, task: str) -> str:
    prompt = (f"{system}\n\nShared case evidence: {brief}\n\nTask: {task} "
              "Be factual, cite the evidence above, 2-3 sentences.")
    row = _one("SELECT ai_query(:m, :p) AS a",
               [{"name": "m", "value": LLM}, {"name": "p", "value": prompt}])
    return (row or {}).get("a", "") or ""


SPECIALISTS = [
    ("transaction_analysis",
     "You are the Transaction Analysis agent in an AML SAR team.",
     "Assess the transaction pattern and what makes it consistent with the detected typology."),
    ("adverse_media",
     "You are the Adverse Media & Screening agent in an AML SAR team.",
     "Assess reputational / sanctions / watchlist exposure for this subject."),
    ("policy",
     "You are the AML Policy & Typology agent in an AML SAR team.",
     "State which AML/CFT typology and reporting obligation applies and why a SAR is warranted."),
]


class OrchestrateReq(BaseModel):
    case_id: str


@router.post("/orchestrate")
def orchestrate(req: OrchestrateReq):
    """Run the full multi-agent SAR workflow with auto-gathered evidence."""
    ev = gather_evidence(req.case_id)
    if not ev:
        return {"detail": "not found"}
    brief = _evidence_brief(ev)

    trace = []
    for key, system, task in SPECIALISTS:
        trace.append({"agent": key, "finding": _agent(system, brief, task)})

    findings = " ".join(f"[{t['agent']}] {t['finding']}" for t in trace)
    supervisor = _agent(
        "You are the AML Multi-Agent Supervisor. You have received findings from your "
        "specialist agents (transaction analysis, adverse media, policy).",
        brief,
        "Synthesise a concise, regulator-ready SAR narrative with: (1) summary of "
        "suspicious activity, (2) the pattern detected, (3) why it is suspicious with "
        f"reference to the specialist findings, (4) recommended action. Specialist findings: {findings}",
    )
    c = ev["case"]
    return {
        "case_id": c["case_id"], "customer_name": c["customer_name"],
        "scenario": c["scenario"], "priority": c["priority"],
        "risk_score": c["risk_score"], "amount": c["amount"],
        "evidence": {
            "transactions": ev["transactions"], "network": ev["network"],
            "screening": ev["screening"], "pkyc": ev["pkyc"],
        },
        "agent_trace": trace,
        "narrative": supervisor,
    }


# ─────────────────────────── goAML SAR XML ────────────────────────────────
def _x(tag: str, val, indent: int = 4) -> str:
    if val is None or val == "":
        return ""
    return f"{' ' * indent}<{tag}>{html.escape(str(val))}</{tag}>\n"


def build_goaml_xml(case_id: str, narrative: str = "") -> str:
    """Gather evidence for a case and emit its goAML SAR XML."""
    ev = gather_evidence(case_id)
    if not ev:
        return "<report/>"
    return goaml_from_evidence(ev, narrative)


def goaml_from_evidence(ev: dict, narrative: str = "") -> str:
    """Pure: emit a goAML-format (UN/UNODC standard) SAR XML from an evidence dict.
    Structure follows goAML's report → reporting-person/entity → activity →
    transaction/involved-parties shape (demo-faithful, not schema-validated).
    Separated from I/O so it is unit-testable without a warehouse."""
    if not ev or not ev.get("case"):
        return "<report/>"
    c = ev["case"]
    txns = ev.get("transactions") or []

    tx_xml = ""
    for t in txns[:10]:
        tx_xml += "      <transaction>\n"
        tx_xml += _x("transactionnumber", t.get("transaction_id"), 8)
        tx_xml += _x("transaction_type", t.get("direction"), 8)
        tx_xml += _x("amount_local", round(t.get("amount") or 0, 2), 8)
        tx_xml += _x("transaction_channel", t.get("channel"), 8)
        tx_xml += _x("date_transaction", str(t.get("txn_ts") or "")[:19], 8)
        tx_xml += _x("counterparty", t.get("counterparty_id"), 8)
        tx_xml += "      </transaction>\n"

    hits = ev.get("screening") or []
    reason = c["scenario"]
    if hits:
        reason += "; watchlist: " + ", ".join(h["watch_name"] for h in hits[:3])

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<report xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
    xml += _x("rentity_id", RE["id"])
    xml += _x("rentity_branch", RE["contact"])
    xml += _x("submission_code", "E")           # E = electronic
    xml += _x("report_code", "STR")             # STR = suspicious transaction report
    xml += _x("entity_reference", c["case_id"])
    xml += _x("submission_date", str(c.get("days_open")) and "")  # stamped at submit time
    xml += "  <reporting_person>\n"
    xml += _x("first_name", c.get("analyst_name"), 4)
    xml += _x("entity", RE["name"], 4)
    xml += _x("country", RE["country"], 4)
    xml += "  </reporting_person>\n"
    xml += "  <activity>\n"
    xml += "    <report_indicators>\n"
    xml += _x("indicator", c["scenario"], 6)
    xml += _x("indicator", f"rules_risk_{c['risk_score']}", 6)
    if ev.get("pkyc"):
        xml += _x("indicator", f"pkyc_{ev['pkyc']['risk_band']}", 6)
    xml += "    </report_indicators>\n"
    xml += "    <suspicious_party>\n"
    xml += _x("party_name", c["customer_name"], 6)
    xml += _x("party_reference", c["customer_id"], 6)
    xml += "    </suspicious_party>\n"
    xml += "    <goods_services>\n"
    xml += _x("item_type", "FUNDS", 6)
    xml += _x("total_amount", round(c.get("amount") or 0, 2), 6)
    xml += _x("currency_code", "ZAR", 6)
    xml += "    </goods_services>\n"
    xml += "    <transactions>\n" + tx_xml + "    </transactions>\n"
    xml += _x("reason", reason)
    xml += _x("action", "Escalated to FIC; funds monitored")
    if narrative:
        xml += _x("narrative", narrative)
    xml += "  </activity>\n"
    xml += "</report>\n"
    return xml


@router.get("/goaml/{case_id}")
def goaml(case_id: str, narrative: str = ""):
    """Download the goAML SAR XML for a case."""
    xml = build_goaml_xml(case_id, narrative)
    return Response(
        content=xml, media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="SAR_goAML_{case_id}.xml"'},
    )
