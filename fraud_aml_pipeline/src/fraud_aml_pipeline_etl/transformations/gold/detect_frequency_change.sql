-- 6.2 Change in frequency: today's txn count deviates from the account's own
-- trailing 90-day baseline by >= freq_z standard deviations.
CREATE OR REFRESH PRIVATE MATERIALIZED VIEW detect_frequency_change AS
WITH cfg AS (SELECT * FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold.alert_config),
daily AS (
  SELECT account_id, date(txn_ts) d, count(*) c
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.transactions
  GROUP BY 1,2
),
baseline AS (
  SELECT account_id, avg(c) avg_c, stddev(c) std_c
  FROM daily WHERE d < current_date() GROUP BY 1
),
today AS (
  SELECT account_id, c AS today_count FROM daily WHERE d = current_date()
),
scored AS (
  SELECT t.account_id, t.today_count, b.avg_c,
         (t.today_count - b.avg_c) / nullif(b.std_c,0) AS z
  FROM today t JOIN baseline b USING (account_id)
)
SELECT
  concat('ALRT-FQ-', s.account_id)                        AS alert_id,
  'frequency_change'                                      AS alert_type,
  CASE WHEN abs(s.z) >= 5 THEN 'critical' ELSE 'high' END AS severity,
  em.entity_id                                            AS primary_entity_id,
  CAST(array() AS ARRAY<STRING>)                          AS related_entity_ids,
  array(s.account_id)                                     AS account_ids,
  CAST(array() AS ARRAY<STRING>)                          AS transaction_ids,
  current_timestamp()                                     AS triggered_at,
  least(1.0, round(abs(s.z)/10.0, 3))                     AS score,
  concat('Account ', s.account_id, ' had ', cast(s.today_count AS STRING),
         ' txns today vs baseline ', cast(round(s.avg_c,1) AS STRING),
         ' (z=', cast(round(s.z,2) AS STRING), ').')       AS explanation,
  map('today_count', cast(s.today_count AS STRING), 'z', cast(round(s.z,2) AS STRING)) AS evidence,
  'new'                                                   AS status,
  CAST(NULL AS STRING)                                    AS analyst_feedback
FROM scored s
CROSS JOIN cfg
LEFT JOIN elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.accounts a ON a.account_id = s.account_id
LEFT JOIN elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entity_map em
  ON em.source_id = a.customer_id AND em.party_type = 'customer'
WHERE abs(s.z) >= cfg.freq_z;
