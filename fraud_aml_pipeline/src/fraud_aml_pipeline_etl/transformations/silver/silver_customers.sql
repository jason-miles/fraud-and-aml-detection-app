-- Silver conform: customers (dedupe latest ingest per customer_id)
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.customers AS
SELECT * EXCEPT (rn) FROM (
  SELECT *, row_number() OVER (PARTITION BY customer_id ORDER BY _ingested_at DESC) rn
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze.customers
) WHERE rn = 1;
