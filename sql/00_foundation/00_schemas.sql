-- Investec Fraud & AML — Foundation: catalog/schema/volume DDL
-- NOTE: Co-located in elexon_app_for_settlement_acc_catalog with an
-- investec_fraud_aml_ prefix because the workspace user lacks metastore
-- CREATE CATALOG. See README "Physical layout".

CREATE SCHEMA IF NOT EXISTS elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze
  COMMENT 'Investec Fraud & AML demo — Bronze: raw landed feeds.';

CREATE SCHEMA IF NOT EXISTS elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver
  COMMENT 'Investec Fraud & AML demo — Silver: conformed, deduplicated, entity-resolved.';

CREATE SCHEMA IF NOT EXISTS elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold
  COMMENT 'Investec Fraud & AML demo — Gold: fraud_alerts, entity_network, customer_360, alert_feedback, metric views.';

-- Volume for KYC packs, source-of-funds letters, adverse-media PDFs
-- (fed to ai_parse_document / ai_extract in the Intelligence phase).
CREATE VOLUME IF NOT EXISTS elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze.documents
  COMMENT 'KYC packs, source-of-funds letters, adverse-media PDFs.';
