-- Investec Fraud & AML — Synthetic seeder (1/4): customers, accounts, third parties
-- SQL-authored generation. Names/entities are clearly synthetic (no real individuals).
-- Volumes per PRD §10: ~5,000 customers, ~12,000 accounts, ~3,000 third parties.

USE CATALOG elexon_app_for_settlement_acc_catalog;

-- ── CUSTOMERS (5,000) ────────────────────────────────────────────────────
-- Deterministic synthetic identities keyed off an integer id.
INSERT OVERWRITE investec_fraud_aml_bronze.customers
WITH ids AS (SELECT id FROM range(1, 5001))
SELECT
  concat('CUST', lpad(id, 6, '0'))                                   AS customer_id,
  concat(
    element_at(array('Ava','Liam','Noah','Olivia','Ethan','Mia','Kai','Zara','Leo','Nia',
                     'Thabo','Lerato','Sipho','Naledi','Anele','Kagiso','Bongani','Amara'),
              cast(pmod(id * 7,  18) + 1 AS INT)), ' ',
    element_at(array('Mokoena','Nkosi','Dlamini','Botha','Naidoo','Khan','Pillay','Vermaak',
                     'Sithole','Marais','Adams','Fourie','Jacobs','Meyer','Zulu','Ncube'),
              cast(pmod(id * 13, 16) + 1 AS INT))
  )                                                                  AS full_name,
  date_add('1955-01-01', cast(pmod(id * 97, 16000) AS INT))          AS dob,
  concat('ID', lpad(cast(pmod(id * 999983, 9999999999) AS BIGINT), 10, '0')) AS national_id,
  concat('TAX', lpad(cast(pmod(id * 88883, 999999999) AS BIGINT), 9, '0'))   AS tax_number,
  concat('customer', id, '@example.co.za')                          AS email,
  concat('+2782', lpad(cast(pmod(id * 31, 9999999) AS INT), 7, '0')) AS phone,
  concat(cast(pmod(id, 200) + 1 AS INT), ' ', element_at(array('Rivonia','Sandton','Umhlanga','Claremont','Melrose'), cast(pmod(id,5)+1 AS INT)), ' Rd') AS address,
  element_at(array('Johannesburg','Cape Town','Durban','Pretoria','Stellenbosch'), cast(pmod(id, 5) + 1 AS INT)) AS city,
  'South Africa'                                                     AS country,
  element_at(array('private_wealth','ultra_high_net_worth','high_net_worth','affluent'), cast(pmod(id, 4) + 1 AS INT)) AS segment,
  cast(date_add('2018-01-01', cast(pmod(id * 17, 2900) AS INT)) AS TIMESTAMP) AS onboarded_at,
  element_at(array('data_vault','tabular','crm'), cast(pmod(id, 3) + 1 AS INT)) AS source_system,
  current_timestamp()                                                AS _ingested_at
FROM ids;

-- ── THIRD PARTIES (3,000) ────────────────────────────────────────────────
INSERT OVERWRITE investec_fraud_aml_bronze.third_parties
WITH ids AS (SELECT id FROM range(1, 3001))
SELECT
  concat('TP', lpad(id, 6, '0'))                                     AS third_party_id,
  CASE WHEN pmod(id,3)=0
       THEN concat(element_at(array('Aurora','Summit','Delta','Onyx','Vanguard','Meridian','Cobalt','Zenith'), cast(pmod(id*3,8)+1 AS INT)), ' ',
                   element_at(array('Holdings','Trust','Capital','Ventures','Trading','Nominees'), cast(pmod(id*5,6)+1 AS INT)))
       ELSE concat(element_at(array('Sena','Otto','Priya','Marco','Yusuf','Elena','Dumi','Chen'), cast(pmod(id*7,8)+1 AS INT)), ' ',
                   element_at(array('Rossouw','Patel','Ndlovu','Silva','Abrahams','Kruger'), cast(pmod(id*11,6)+1 AS INT)))
  END                                                                AS full_name,
  element_at(array('individual','company','trust'), cast(pmod(id,3)+1 AS INT)) AS entity_kind,
  concat('ID', lpad(cast(pmod(id * 777767, 9999999999) AS BIGINT), 10, '0')) AS national_id,
  concat('TAX', lpad(cast(pmod(id * 66653, 999999999) AS BIGINT), 9, '0'))   AS tax_number,
  concat(cast(pmod(id, 300) + 1 AS INT), ' Commissioner St')         AS address,
  element_at(array('Johannesburg','Cape Town','London','Dubai','Mauritius','Durban'), cast(pmod(id, 6) + 1 AS INT)) AS city,
  element_at(array('South Africa','South Africa','United Kingdom','UAE','Mauritius','South Africa'), cast(pmod(id, 6) + 1 AS INT)) AS country,
  cast(date_add('2015-01-01', cast(pmod(id * 23, 3500) AS INT)) AS TIMESTAMP) AS registered_at,
  element_at(array('register','kyc_doc'), cast(pmod(id,2)+1 AS INT)) AS source_system,
  current_timestamp()                                                AS _ingested_at
FROM ids;

-- ── ACCOUNTS (~12,000: 1–4 per customer) ─────────────────────────────────
INSERT OVERWRITE investec_fraud_aml_bronze.accounts
WITH cust AS (SELECT id FROM range(1, 5001)),
     -- give each customer between 1 and 4 accounts, ~2.4 avg -> ~12k
     expanded AS (
       SELECT c.id AS cust_num, e.n AS acct_seq
       FROM cust c
       LATERAL VIEW explode(sequence(1, cast(pmod(c.id, 4) + 1 AS INT))) e AS n
     )
SELECT
  concat('ACC', lpad(cast(cust_num * 10 + acct_seq AS BIGINT), 8, '0')) AS account_id,
  concat('CUST', lpad(cust_num, 6, '0'))                             AS customer_id,
  element_at(array('current','savings','investment','card'), cast(pmod(cust_num + acct_seq, 4) + 1 AS INT)) AS account_type,
  'ZAR'                                                              AS currency,
  cast(date_add('2018-06-01', cast(pmod(cust_num * 7 + acct_seq, 2700) AS INT)) AS TIMESTAMP) AS opened_at,
  -- ~8% dormant (candidates for reactivation planting later)
  CASE WHEN pmod(cust_num * 3 + acct_seq, 12) = 0 THEN 'dormant' ELSE 'active' END AS status,
  CASE WHEN pmod(cust_num * 3 + acct_seq, 12) = 0
       THEN date_sub(current_date(), cast(200 + pmod(cust_num, 160) AS INT))
       ELSE date_sub(current_date(), cast(pmod(cust_num, 30) AS INT)) END AS last_activity_before_ts,
  round(pmod(cust_num * 9973, 5000000) + 50000, 2)                  AS balance,
  element_at(array('data_vault','tabular','crm'), cast(pmod(cust_num, 3) + 1 AS INT)) AS source_system,
  current_timestamp()                                                AS _ingested_at
FROM expanded;
