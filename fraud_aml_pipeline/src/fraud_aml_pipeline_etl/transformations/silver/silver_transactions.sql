-- Silver conform: transactions (dedupe latest ingest per transaction_id)
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.transactions AS
SELECT * EXCEPT (rn) FROM (
  SELECT *, row_number() OVER (PARTITION BY transaction_id ORDER BY _ingested_at DESC) rn
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze.transactions
) WHERE rn = 1;
