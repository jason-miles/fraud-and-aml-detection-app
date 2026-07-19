-- Gold: alert threshold config (PRD §6 — "surface them in a config table so
-- the room can tune live"). Single-row MV of tunable parameters; detection
-- rules cross-join this. To tune in the demo, edit here and refresh, or
-- override the underlying table.
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold.alert_config AS
SELECT
  0.90   AS passthrough_ratio,   -- 6.1 rapid movement: outflow/inflow ratio
  250000 AS rapid_min_amount,    -- 6.1 minimum inflow to consider
  3.0    AS freq_z,              -- 6.2 z-score threshold for velocity spike
  5      AS max_ring_hops,       -- 6.3 max recursion depth for circular flows
  180    AS dormant_days,        -- 6.4 days of inactivity to be "dormant"
  500000 AS dormant_high_value,  -- 6.4 high-value reactivation threshold
  2      AS risk_jump,           -- 6.5 risk-band jump to alert on
  3500000 AS ato_amount,         -- 6.8 high-value debit after auth anomaly
  900.0  AS max_feasible_kmh;    -- 6.9 impossible-travel implied speed (km/h)
