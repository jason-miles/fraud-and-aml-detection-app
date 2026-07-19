-- Gold: fraud_alerts — the published union of all 9 detection families.
-- Common schema per PRD §6. This is the primary surface for the app alert queue.
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold.fraud_alerts AS
SELECT * FROM detect_rapid_movement
UNION ALL SELECT * FROM detect_frequency_change
UNION ALL SELECT * FROM detect_circular_flow
UNION ALL SELECT * FROM detect_dormant_reactivation
UNION ALL SELECT * FROM detect_risk_rating_change
UNION ALL SELECT * FROM detect_adverse_media
UNION ALL SELECT * FROM detect_ubo_change
UNION ALL SELECT * FROM detect_account_takeover
UNION ALL SELECT * FROM detect_impossible_travel;
