"""Alert Queue, Alert Detail, and feedback write-back (PRD §9 pages 1-2, §7.3)."""
import uuid
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from ..db import fetch_all, execute
from ..config import GOLD_SCHEMA

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
def list_alerts(alert_type: Optional[str] = None, severity: Optional[str] = None,
                status: Optional[str] = None, limit: int = 200):
    """Filterable alert queue (page 1)."""
    where = ["1=1"]
    params = []
    if alert_type:
        where.append("alert_type = :alert_type")
        params.append({"name": "alert_type", "value": alert_type})
    if severity:
        where.append("severity = :severity")
        params.append({"name": "severity", "value": severity})
    if status:
        where.append("status = :status")
        params.append({"name": "status", "value": status})
    sql = f"""
SELECT alert_id, alert_type, severity, primary_entity_id, account_ids,
       triggered_at, score, explanation, status
FROM {GOLD_SCHEMA}.fraud_alerts
WHERE {' AND '.join(where)}
ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                       WHEN 'medium' THEN 2 ELSE 3 END, triggered_at DESC
LIMIT {int(limit)}
"""
    return fetch_all(sql, params or None)


@router.get("/alerts/summary")
def alert_summary():
    """Header tiles: counts by type + severity."""
    by_type = fetch_all(f"""
SELECT alert_type, count(*) AS cnt,
       sum(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical
FROM {GOLD_SCHEMA}.fraud_alerts GROUP BY alert_type ORDER BY cnt DESC
""")
    totals = fetch_all(f"""
SELECT count(*) AS total,
       sum(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical,
       count(DISTINCT primary_entity_id) AS entities
FROM {GOLD_SCHEMA}.fraud_alerts
""")
    return {"by_type": by_type, "totals": totals[0] if totals else {}}


@router.get("/alerts/{alert_id}")
def alert_detail(alert_id: str):
    """Full alert detail incl. evidence map + entity + latest feedback (page 2)."""
    rows = fetch_all(f"""
SELECT alert_id, alert_type, severity, primary_entity_id, related_entity_ids,
       account_ids, transaction_ids, triggered_at, score, explanation, evidence, status
FROM {GOLD_SCHEMA}.fraud_alerts
WHERE alert_id = :alert_id
""", [{"name": "alert_id", "value": alert_id}])
    if not rows:
        return {"detail": "not found"}
    alert = rows[0]
    fb = fetch_all(f"""
SELECT status, analyst_feedback, analyst, created_at
FROM {GOLD_SCHEMA}.alert_feedback
WHERE alert_id = :alert_id ORDER BY created_at DESC LIMIT 5
""", [{"name": "alert_id", "value": alert_id}])
    alert["feedback_history"] = fb
    return alert


class Feedback(BaseModel):
    alert_id: str
    status: str            # confirmed | dismissed | reviewing
    reason: str = ""
    analyst: str = "demo_analyst"


@router.post("/alerts/feedback")
def submit_feedback(fb: Feedback):
    """Analyst confirm/dismiss + reason -> alert_feedback write-back (feedback loop)."""
    execute(f"""
INSERT INTO {GOLD_SCHEMA}.alert_feedback
  (feedback_id, alert_id, status, analyst_feedback, analyst, created_at)
VALUES (:fid, :alert_id, :status, :reason, :analyst, current_timestamp())
""", [
        {"name": "fid", "value": str(uuid.uuid4())},
        {"name": "alert_id", "value": fb.alert_id},
        {"name": "status", "value": fb.status},
        {"name": "reason", "value": fb.reason},
        {"name": "analyst", "value": fb.analyst},
    ])
    return {"ok": True}
