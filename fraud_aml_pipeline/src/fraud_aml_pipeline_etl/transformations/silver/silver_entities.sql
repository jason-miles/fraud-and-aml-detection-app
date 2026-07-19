-- Silver ENTITY RESOLUTION (PRD §5, "the key"): resolve customers + third
-- parties to a stable entity_id via deterministic keys (national_id / tax_number)
-- with a fuzzy fallback (soundex(name)+city). Cluster size > 1 => a resolved
-- customer<->third-party match (same beneficial owner).
CREATE OR REFRESH MATERIALIZED VIEW elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.entities AS
WITH parties_raw AS (
  SELECT customer_id AS source_id, 'customer' AS party_type,
         full_name, national_id, tax_number, city, country, dob
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.customers
  UNION ALL
  SELECT third_party_id AS source_id, 'third_party' AS party_type,
         full_name, national_id, tax_number, city, country, CAST(NULL AS DATE) AS dob
  FROM elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver.third_parties
),
keyed AS (
  SELECT *,
    coalesce(nullif(national_id, ''), nullif(tax_number, '')) AS det_key,
    concat(soundex(coalesce(full_name, '')), '|', upper(coalesce(city, ''))) AS fuzzy_key
  FROM parties_raw
),
clustered AS (
  SELECT *, coalesce(det_key, fuzzy_key) AS cluster_key FROM keyed
)
SELECT
  concat('ENT', lpad(cast(dense_rank() OVER (ORDER BY cluster_key) AS BIGINT), 8, '0')) AS entity_id,
  source_id, party_type, full_name, national_id, tax_number, city, country, dob, cluster_key,
  count(*) OVER (PARTITION BY cluster_key) AS cluster_size
FROM clustered;
