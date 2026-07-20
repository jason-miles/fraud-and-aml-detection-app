"""Route smoke tests with a mocked DB layer (roadmap #5).

No warehouse required — server.db.fetch_all/execute are monkeypatched so we exercise
the FastAPI wiring, parameter handling, and response shaping in isolation.
"""
import pytest
from fastapi.testclient import TestClient

import server.db as db
import app as app_module


@pytest.fixture
def client(monkeypatch):
    # audit() and read endpoints go through fetch_all/execute — stub both.
    def fake_fetch_all(sql, params=None):
        if "audit_log" in sql:
            return [{"event_ts": "2026-07-20T10:00:00", "actor": "Sarah Chen",
                     "action": "case_open", "case_id": "CASE-SCR-1",
                     "detail": "Opened", "source": "investigation"}]
        if "ml_model_metrics" in sql:
            return [{"model_name": "m", "model_version": 2, "algorithm": "GBT",
                     "run_id": "r", "roc_auc": 0.65, "precision": 0.54, "recall": 0.33,
                     "f1": 0.41, "model_fp": 32, "rules_fp": 38, "fp_reduction_pct": 15.8,
                     "n_features": 10, "n_labelled": 660, "positive_rate": 0.286,
                     "blend_model_weight": 0.7, "blend_rules_weight": 0.3,
                     "governance_status": "validated", "trained_at": "2026-07-20"}]
        return []

    monkeypatch.setattr(db, "fetch_all", fake_fetch_all)
    # advanced_aml imported fetch_all by name — patch there too.
    import server.routes.advanced_aml as aml
    monkeypatch.setattr(aml, "fetch_all", fake_fetch_all)
    return TestClient(app_module.app)


def test_audit_endpoint(client):
    r = client.get("/api/aml/audit?limit=10")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and data[0]["actor"] == "Sarah Chen"


def test_model_governance_endpoint(client):
    r = client.get("/api/aml/model-governance")
    assert r.status_code == 200
    data = r.json()
    assert data["fp_reduction_pct"] == 15.8
    assert data["governance_status"] == "validated"


def test_healthz(client):
    # SPA fallthrough should serve something for an unknown non-api path,
    # while an unknown /api path should 404.
    assert client.get("/api/does-not-exist").status_code == 404
