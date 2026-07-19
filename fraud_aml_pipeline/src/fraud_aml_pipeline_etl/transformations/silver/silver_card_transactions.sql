-- Silver conform: card_transactions (dedupe latest ingest per card_txn_id)
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.card_transactions AS
SELECT * EXCEPT (rn) FROM (
  SELECT *, row_number() OVER (PARTITION BY card_txn_id ORDER BY _ingested_at DESC) rn
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze.card_transactions
) WHERE rn = 1;
