-- Silver conform: accounts (dedupe latest ingest per account_id)
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.accounts AS
SELECT * EXCEPT (rn) FROM (
  SELECT *, row_number() OVER (PARTITION BY account_id ORDER BY _ingested_at DESC) rn
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze.accounts
) WHERE rn = 1;
