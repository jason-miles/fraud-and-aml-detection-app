"""Unit tests for goAML SAR XML generation and evidence briefing (roadmap #5).

Pure-logic tests — no warehouse required. They exercise goaml_from_evidence() and
_evidence_brief() against a synthetic evidence pack.
"""
import xml.dom.minidom as minidom

from server.routes.sar_agents import goaml_from_evidence, _evidence_brief, _x


EV = {
    "case": {
        "case_id": "CASE-SCR-1", "alert_num": 90001, "customer_id": "CUSTFRAUD01",
        "customer_name": "Marco Silva", "scenario": "Sanctions/Watchlist Hit",
        "priority": "critical", "status": "new", "team_name": "Sanctions & Watchlist Screening",
        "analyst_name": "Lisa Wang", "risk_score": 99, "amount": 5420000.0, "days_open": 24,
    },
    "transactions": [
        {"transaction_id": "TXN1", "amount": 900000.0, "direction": "credit",
         "channel": "wire", "txn_ts": "2026-07-01T10:00:00", "counterparty_id": "TP1"},
        {"transaction_id": "TXN2", "amount": 850000.0, "direction": "debit",
         "channel": "wire", "txn_ts": "2026-07-01T14:00:00", "counterparty_id": "TP2"},
    ],
    "network": [{"counterparty_id": "TP1", "full_name": "Onyx Capital", "country": "KY", "entity_kind": "company"}],
    "screening": [{"watch_name": "OFAC SDN — Marco Silva", "list_type": "sanctions",
                   "list_source": "OFAC", "severity": "high", "confidence": "confirmed", "match_score": 0.97}],
    "pkyc": {"dynamic_risk": 92, "risk_band": "critical", "edd_review_required": True,
             "risk_drivers": "sanctions_hit,adverse_media", "alert_count": 3, "severe_alerts": 2,
             "sanction_hits": 1, "media_hits": 1},
}


def test_goaml_is_well_formed():
    xml = goaml_from_evidence(EV, narrative="Test narrative.")
    # Raises if not well-formed:
    doc = minidom.parseString(xml)
    assert doc.documentElement.tagName == "report"


def test_goaml_contains_key_elements():
    xml = goaml_from_evidence(EV, narrative="N")
    for token in ("<report_code>STR</report_code>", "Marco Silva", "CUSTFRAUD01",
                  "<currency_code>ZAR</currency_code>", "<transaction>", "TXN1",
                  "OFAC SDN", "<narrative>N</narrative>"):
        assert token in xml, f"missing {token}"


def test_goaml_transaction_count_capped():
    many = {**EV, "transactions": EV["transactions"] * 20}  # 40 txns
    xml = goaml_from_evidence(many, "")
    assert xml.count("<transaction>") == 10  # capped at 10


def test_goaml_empty_evidence():
    assert goaml_from_evidence({}, "") == "<report/>"
    assert goaml_from_evidence({"case": None}, "") == "<report/>"


def test_x_escapes_and_skips_empty():
    assert _x("t", None) == ""
    assert _x("t", "") == ""
    assert _x("t", "a<b&c") == "    <t>a&lt;b&amp;c</t>\n"


def test_evidence_brief_mentions_signals():
    brief = _evidence_brief(EV)
    assert "Marco Silva" in brief
    assert "Sanctions/Watchlist Hit" in brief
    assert "sanctions/watchlist hits" in brief
    assert "Perpetual-KYC" in brief
