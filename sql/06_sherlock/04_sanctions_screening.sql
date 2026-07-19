-- Feature 1: Sanctions & Watchlist screening.
-- A watchlist (sanctions / PEP / adverse) + fuzzy-match screening of resolved
-- entities (customers + third parties) against it. Produces scored hits that
-- feed a sanctions_screening alert family. Fuzzy match uses a Jaro-Winkler-style
-- similarity so near-name matches (transliteration, spacing) surface.
--
-- Schema: elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold

USE CATALOG elexon_app_for_settlement_acc_catalog;

-- ── Watchlist ────────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE investec_fraud_aml_gold.sanctions_watchlist AS
SELECT * FROM VALUES
  ('WL0001','Marco Silva','sanctions','OFAC SDN','Mauritius','Trade-based laundering designation', 'critical'),
  ('WL0002','Priya Patel','pep','EU PEP List','South Africa','Politically exposed associate','high'),
  ('WL0003','Onyx Capital','sanctions','UK OFSI','Mauritius','Shell-company sanctions network','critical'),
  ('WL0004','Vanguard Nominees','sanctions','OFAC SDN','UAE','Sanctions evasion network','critical'),
  ('WL0005','Summit Trust','adverse','Internal Watchlist','United Kingdom','Layering via trust structures','high'),
  ('WL0006','Dmitri Volkov','sanctions','OFAC SDN','Russia','Sanctioned oligarch','critical'),
  ('WL0007','Global Trade FZE','sanctions','UN Consolidated','UAE','Front company','critical'),
  ('WL0008','Ahmed Hassan','pep','World-Check','Egypt','Senior public official','high'),
  ('WL0009','Meridian Holdings','adverse','Adverse Media','Mauritius','Offshore tax-evasion ruling','medium'),
  ('WL0010','Chen Wei','pep','EU PEP List','Hong Kong','State-enterprise executive','medium')
AS t(watchlist_id, watch_name, list_type, list_source, country, reason, severity);

-- ── Screening hits ───────────────────────────────────────────────────────
-- Fuzzy match resolved entities against the watchlist. jaro_winkler is available
-- in Databricks SQL; we normalise case and keep hits above a confidence floor.
CREATE OR REPLACE TABLE investec_fraud_aml_gold.sanctions_screening_hits AS
WITH entities AS (
  SELECT DISTINCT entity_id, source_id, party_type, full_name, country
  FROM investec_fraud_aml_silver.entities
),
scored AS (
  SELECT
    e.entity_id, e.source_id, e.party_type, e.full_name AS entity_name, e.country AS entity_country,
    w.watchlist_id, w.watch_name, w.list_type, w.list_source, w.reason, w.severity,
    round(jaro_winkler(lower(e.full_name), lower(w.watch_name)), 3) AS match_score,
    (lower(e.full_name) = lower(w.watch_name)) AS exact_match
  FROM entities e
  CROSS JOIN investec_fraud_aml_gold.sanctions_watchlist w
)
SELECT
  concat('SCR-', entity_id, '-', watchlist_id) AS screening_id,
  entity_id, source_id, party_type, entity_name, entity_country,
  watchlist_id, watch_name, list_type, list_source, reason, severity,
  match_score, exact_match,
  CASE WHEN exact_match THEN 'confirmed'
       WHEN match_score >= 0.92 THEN 'probable'
       ELSE 'possible' END AS confidence
FROM scored
WHERE match_score >= 0.88;   -- confidence floor; tuneable
