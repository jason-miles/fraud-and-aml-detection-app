"""Impossible-travel map (PRD §9 page 6) and Reports (page 5)."""
from fastapi import APIRouter
from ..db import fetch_all
from ..config import GOLD_SCHEMA, SILVER_SCHEMA

router = APIRouter(prefix="/api", tags=["travel", "reports"])


@router.get("/impossible-travel")
def impossible_travel():
    """Flagged card journeys with from/to coords + implied speed for the map.

    Reconstructs the two legs behind each impossible_travel alert from
    silver.card_transactions so the map can draw the journey.
    """
    alerts = fetch_all(f"""
SELECT alert_id, account_ids[0] AS account_id, triggered_at, score, explanation,
       evidence['from_city'] AS from_city, evidence['to_city'] AS to_city,
       evidence['implied_kmh'] AS implied_kmh
FROM {GOLD_SCHEMA}.fraud_alerts
WHERE alert_type = 'impossible_travel'
ORDER BY triggered_at DESC
""")
    # Attach the underlying card taps (lat/lon) for each flagged account.
    for a in alerts:
        acct = a.get("account_id")
        if acct:
            a["legs"] = fetch_all(f"""
SELECT city, country, lat, lon, txn_ts, merchant
FROM {SILVER_SCHEMA}.card_transactions
WHERE account_id = :acct
ORDER BY txn_ts DESC LIMIT 4
""", [{"name": "acct", "value": acct}])
    return alerts


@router.get("/reports/weekly")
def weekly_report():
    """Genie-style narrative numbers for the weekly report (PRD §7.2)."""
    return fetch_all(f"""
SELECT alert_type, count(*) AS this_week,
       sum(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical
FROM {GOLD_SCHEMA}.fraud_alerts
WHERE triggered_at >= current_timestamp() - INTERVAL 7 DAYS
GROUP BY alert_type ORDER BY this_week DESC
""")
