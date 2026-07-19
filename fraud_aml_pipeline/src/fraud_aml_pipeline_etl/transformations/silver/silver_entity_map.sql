-- Silver: convenience map source_id -> entity_id, used by detection + graph.
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entity_map AS
SELECT source_id, party_type, entity_id, cluster_size
FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entities;
