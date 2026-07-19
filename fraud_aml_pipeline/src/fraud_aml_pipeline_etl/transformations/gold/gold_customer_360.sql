-- Gold: customer_360 (CDP) — the high-wealth-desk 360° view: profile, account
-- rollup, latest risk rating, recent alert count. Feeds the Customer 360 page.
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold.customer_360 AS
WITH acct_rollup AS (
  SELECT customer_id, count(*) AS num_accounts, sum(balance) AS total_balance
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.accounts
  GROUP BY customer_id
),
latest_risk AS (
  SELECT entity_id, risk_rating, rated_at FROM (
    SELECT entity_id, risk_rating, rated_at,
           row_number() OVER (PARTITION BY entity_id ORDER BY rated_at DESC) rn
    FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.risk_ratings
    WHERE entity_type = 'customer'
  ) WHERE rn = 1
),
alert_counts AS (
  -- "recent" = last 30 days (the column/tile is labelled Recent alerts).
  SELECT em.source_id AS customer_id, count(*) AS recent_alerts
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold.fraud_alerts fa
  JOIN elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entity_map em
    ON em.entity_id = fa.primary_entity_id AND em.party_type = 'customer'
  WHERE fa.triggered_at >= current_timestamp() - INTERVAL 30 DAYS
  GROUP BY em.source_id
)
SELECT
  c.customer_id, c.full_name, c.segment, c.city, c.country, c.onboarded_at,
  em.entity_id,
  coalesce(ar.num_accounts, 0)   AS num_accounts,
  coalesce(ar.total_balance, 0)  AS total_balance,
  lr.risk_rating                 AS current_risk_rating,
  coalesce(ac.recent_alerts, 0)  AS recent_alerts
FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.customers c
LEFT JOIN elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entity_map em
  ON em.source_id = c.customer_id AND em.party_type = 'customer'
LEFT JOIN acct_rollup ar  ON ar.customer_id = c.customer_id
LEFT JOIN latest_risk lr  ON lr.entity_id = c.customer_id
LEFT JOIN alert_counts ac ON ac.customer_id = c.customer_id;
