-- Investec Fraud & AML — Synthetic seeder (4/4): PLANTED FRAUD SCENARIOS
-- Guarantees every alert family fires on demo day (PRD §10).
-- All planted IDs use a FRAUD_ / F prefix so they are easy to trace in the demo.
--
-- Scenarios planted:
--   A. Rapid movement of funds (layering passthrough)      -> rule 6.1
--   B. Change in frequency (velocity spike)                -> rule 6.2
--   C. Round-trip / circular ring (4 accounts)             -> rule 6.3
--   D. Dormant reactivation with high value (5 cases)      -> rule 6.4
--   E. Risk-rating jump                                    -> rule 6.5
--   F. Adverse-media hit (entity matches media corpus)     -> rule 6.6
--   G. Beneficial-ownership change                         -> rule 6.7
--   H. Account-takeover sequence                           -> rule 6.8
--   I. Impossible travel (3 cards, JHB -> London 30 min)   -> rule 6.9

USE CATALOG elexon_app_for_settlement_acc_catalog;

-- Dedicated fraud customers + accounts + third parties -------------------
INSERT INTO investec_fraud_aml_bronze.customers VALUES
  ('CUSTFRAUD01','Marco Silva', DATE'1974-03-12','ID7000000001','TAX700000001','msilva@example.co.za','+27820000001','1 Nominee Way','Johannesburg','South Africa','ultra_high_net_worth', TIMESTAMP'2020-01-05 09:00:00','crm', current_timestamp()),
  ('CUSTFRAUD02','Priya Patel', DATE'1981-08-22','ID7000000002','TAX700000002','ppatel@example.co.za','+27820000002','2 Shell St','Cape Town','South Africa','private_wealth', TIMESTAMP'2019-06-15 09:00:00','crm', current_timestamp()),
  ('CUSTFRAUD03','Dumi Ndlovu', DATE'1969-11-02','ID7000000003','TAX700000003','dndlovu@example.co.za','+27820000003','3 Ring Rd','Durban','South Africa','high_net_worth', TIMESTAMP'2018-02-20 09:00:00','crm', current_timestamp()),
  ('CUSTFRAUD04','Elena Kruger', DATE'1988-05-30','ID7000000004','TAX700000004','ekruger@example.co.za','+27820000004','4 Loop Ave','Pretoria','South Africa','private_wealth', TIMESTAMP'2021-09-01 09:00:00','crm', current_timestamp()),
  ('CUSTFRAUD05','Yusuf Abrahams', DATE'1977-01-19','ID7000000005','TAX700000005','yabrahams@example.co.za','+27820000005','5 Transit Rd','Johannesburg','South Africa','ultra_high_net_worth', TIMESTAMP'2020-07-11 09:00:00','crm', current_timestamp());

-- Ring + passthrough + travel accounts (fixed IDs) ------------------------
INSERT INTO investec_fraud_aml_bronze.accounts VALUES
  ('ACCFRAUD01','CUSTFRAUD01','current','ZAR', TIMESTAMP'2020-01-06 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 8200000.00,'crm', current_timestamp()),
  ('ACCFRAUD02','CUSTFRAUD02','current','ZAR', TIMESTAMP'2019-06-16 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 5400000.00,'crm', current_timestamp()),
  ('ACCFRAUD03','CUSTFRAUD03','current','ZAR', TIMESTAMP'2018-02-21 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 3100000.00,'crm', current_timestamp()),
  ('ACCFRAUD04','CUSTFRAUD04','current','ZAR', TIMESTAMP'2021-09-02 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 2750000.00,'crm', current_timestamp()),
  -- passthrough (rapid movement) account
  ('ACCFRAUD05','CUSTFRAUD05','current','ZAR', TIMESTAMP'2020-07-12 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 900000.00,'crm', current_timestamp()),
  -- card account for impossible travel (3 cards belong to 3 fraud customers)
  ('ACCFRAUDC1','CUSTFRAUD01','card','ZAR', TIMESTAMP'2020-01-06 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 120000.00,'crm', current_timestamp()),
  ('ACCFRAUDC2','CUSTFRAUD02','card','ZAR', TIMESTAMP'2019-06-16 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 90000.00,'crm', current_timestamp()),
  ('ACCFRAUDC3','CUSTFRAUD03','card','ZAR', TIMESTAMP'2018-02-21 09:00:00','active', cast(date_sub(current_date(),1) AS TIMESTAMP), 60000.00,'crm', current_timestamp()),
  -- 5 dormant accounts to be reactivated
  ('ACCDORM01','CUSTFRAUD01','savings','ZAR', TIMESTAMP'2019-01-01 09:00:00','dormant', cast(date_sub(current_date(),300) AS TIMESTAMP), 1500000.00,'crm', current_timestamp()),
  ('ACCDORM02','CUSTFRAUD02','savings','ZAR', TIMESTAMP'2019-01-01 09:00:00','dormant', cast(date_sub(current_date(),365) AS TIMESTAMP), 2200000.00,'crm', current_timestamp()),
  ('ACCDORM03','CUSTFRAUD03','savings','ZAR', TIMESTAMP'2019-01-01 09:00:00','dormant', cast(date_sub(current_date(),400) AS TIMESTAMP), 1800000.00,'crm', current_timestamp()),
  ('ACCDORM04','CUSTFRAUD04','savings','ZAR', TIMESTAMP'2019-01-01 09:00:00','dormant', cast(date_sub(current_date(),250) AS TIMESTAMP), 950000.00,'crm', current_timestamp()),
  ('ACCDORM05','CUSTFRAUD05','savings','ZAR', TIMESTAMP'2019-01-01 09:00:00','dormant', cast(date_sub(current_date(),210) AS TIMESTAMP), 3000000.00,'crm', current_timestamp()),
  -- ATO target account
  ('ACCATO01','CUSTFRAUD04','current','ZAR', TIMESTAMP'2021-09-02 09:00:00','active', cast(date_sub(current_date(),2) AS TIMESTAMP), 4100000.00,'crm', current_timestamp());

-- Adverse-media / UBO third party (matches adverse_media corpus) ----------
-- NOTE: TPFRAUD01/02 deliberately SHARE the national_id + tax_number of
-- CUSTFRAUD01 (Marco Silva) and CUSTFRAUD02 (Priya Patel) respectively, so
-- silver entity resolution collapses each customer+third-party pair into one
-- entity_id — proving the PRD's "same beneficial owner" ontology point.
INSERT INTO investec_fraud_aml_bronze.third_parties VALUES
  ('TPFRAUD01','Onyx Capital','company','ID7000000001','TAX700000001','9 Offshore Rd','Mauritius','Mauritius', TIMESTAMP'2017-01-01 09:00:00','register', current_timestamp()),
  ('TPFRAUD02','Vanguard Nominees','company','ID7000000002','TAX700000002','10 Nominee Rd','Dubai','UAE', TIMESTAMP'2016-05-01 09:00:00','register', current_timestamp()),
  ('TPFRAUD03','Summit Trust','trust','ID7100000003','TAX710000003','11 Trust Ln','London','United Kingdom', TIMESTAMP'2015-03-01 09:00:00','register', current_timestamp());

-- ── A. RAPID MOVEMENT OF FUNDS (passthrough within 24h) ──────────────────
-- Big credit in, near-equal debit out, both within the last few hours.
INSERT INTO investec_fraud_aml_bronze.transactions VALUES
  ('TXNFRAUDA1','ACCFRAUD05', 'ACCFRAUD01','ACCFRAUD05','credit', 4000000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 6 HOURS AS TIMESTAMP),'Inbound wire','ledger', current_timestamp()),
  ('TXNFRAUDA2','ACCFRAUD05', 'ACCFRAUD05','ACCFRAUD02','debit', 3850000.00,'ZAR','TPFRAUD02','wire', cast(current_timestamp() - INTERVAL 2 HOURS AS TIMESTAMP),'Outbound wire','ledger', current_timestamp());

-- ── B. CHANGE IN FREQUENCY (velocity spike today) ────────────────────────
-- 40 transactions today on ACCFRAUD01 vs a low baseline.
INSERT INTO investec_fraud_aml_bronze.transactions
SELECT concat('TXNFRAUDB', lpad(n,3,'0')), 'ACCFRAUD01', 'ACCFRAUD01',
       concat('ACC', lpad(cast(pmod(n*17,125000)+1 AS BIGINT),8,'0')), 'debit',
       round(50000 + n*1000, 2), 'ZAR', 'TPFRAUD03', 'app',
       cast(current_timestamp() - make_interval(0,0,0,0, cast(pmod(n,12) AS INT), cast(pmod(n*5,60) AS INT),0) AS TIMESTAMP),
       'Rapid app transfer', 'ledger', current_timestamp()
FROM range(1,41) t(n);

-- ── C. ROUND-TRIP / CIRCULAR RING (4 accounts, closed loop) ──────────────
-- FRAUD01 -> FRAUD02 -> FRAUD03 -> FRAUD04 -> FRAUD01
INSERT INTO investec_fraud_aml_bronze.transactions VALUES
  ('TXNRING01','ACCFRAUD01','ACCFRAUD01','ACCFRAUD02','debit', 1200000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 20 HOURS AS TIMESTAMP),'Ring leg 1','ledger', current_timestamp()),
  ('TXNRING02','ACCFRAUD02','ACCFRAUD02','ACCFRAUD03','debit', 1180000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 16 HOURS AS TIMESTAMP),'Ring leg 2','ledger', current_timestamp()),
  ('TXNRING03','ACCFRAUD03','ACCFRAUD03','ACCFRAUD04','debit', 1150000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 12 HOURS AS TIMESTAMP),'Ring leg 3','ledger', current_timestamp()),
  ('TXNRING04','ACCFRAUD04','ACCFRAUD04','ACCFRAUD01','debit', 1120000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 8 HOURS AS TIMESTAMP),'Ring leg 4 (closes loop)','ledger', current_timestamp());

-- ── D. DORMANT REACTIVATION (high value on 5 dormant accounts) ───────────
INSERT INTO investec_fraud_aml_bronze.transactions VALUES
  ('TXNDORM01','ACCDORM01','TPFRAUD01','ACCDORM01','credit', 1400000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 2 DAYS AS TIMESTAMP),'Dormant reactivation','ledger', current_timestamp()),
  ('TXNDORM02','ACCDORM02','TPFRAUD02','ACCDORM02','credit', 2100000.00,'ZAR','TPFRAUD02','wire', cast(current_timestamp() - INTERVAL 3 DAYS AS TIMESTAMP),'Dormant reactivation','ledger', current_timestamp()),
  ('TXNDORM03','ACCDORM03','TPFRAUD03','ACCDORM03','credit', 1750000.00,'ZAR','TPFRAUD03','wire', cast(current_timestamp() - INTERVAL 1 DAYS AS TIMESTAMP),'Dormant reactivation','ledger', current_timestamp()),
  ('TXNDORM04','ACCDORM04','TPFRAUD01','ACCDORM04','credit', 900000.00,'ZAR','TPFRAUD01','wire', cast(current_timestamp() - INTERVAL 4 DAYS AS TIMESTAMP),'Dormant reactivation','ledger', current_timestamp()),
  ('TXNDORM05','ACCDORM05','TPFRAUD02','ACCDORM05','credit', 2900000.00,'ZAR','TPFRAUD02','wire', cast(current_timestamp() - INTERVAL 5 DAYS AS TIMESTAMP),'Dormant reactivation','ledger', current_timestamp());

-- ── E. RISK-RATING JUMP (band 1 -> band 4) ───────────────────────────────
INSERT INTO investec_fraud_aml_bronze.risk_ratings VALUES
  ('RRFRAUD01A','CUSTFRAUD01','customer',1, TIMESTAMP'2026-03-01 09:00:00','kyc_engine','baseline', current_timestamp()),
  ('RRFRAUD01B','CUSTFRAUD01','customer',4, cast(current_timestamp() - INTERVAL 2 DAYS AS TIMESTAMP),'kyc_engine','adverse media + SAR trigger', current_timestamp()),
  ('RRFRAUD02A','CUSTFRAUD02','customer',2, TIMESTAMP'2026-03-01 09:00:00','kyc_engine','baseline', current_timestamp()),
  ('RRFRAUD02B','CUSTFRAUD02','customer',5, cast(current_timestamp() - INTERVAL 1 DAYS AS TIMESTAMP),'kyc_engine','PEP escalation', current_timestamp());

-- ── F. ADVERSE MEDIA HIT — handled at detection time by matching
--       CUSTFRAUD01 (Marco Silva) / TPFRAUD01 (Onyx Capital) etc. against
--       bronze.adverse_media named_entities. No extra rows needed here.

-- ── G. BENEFICIAL-OWNERSHIP CHANGE (UBO flips) ───────────────────────────
INSERT INTO investec_fraud_aml_bronze.beneficial_ownership VALUES
  ('UBOFRAUD01A','TPFRAUD01','TPFRAUD02', 60.0, TIMESTAMP'2024-01-01 09:00:00','register', current_timestamp()),
  ('UBOFRAUD01B','TPFRAUD01','TPFRAUD03', 75.0, cast(current_timestamp() - INTERVAL 3 DAYS AS TIMESTAMP),'kyc_doc', current_timestamp());

-- ── H. ACCOUNT TAKEOVER (new device/geo + high-value debit < 1h) ─────────
INSERT INTO investec_fraud_aml_bronze.auth_events VALUES
  ('AEFRAUD01','ACCATO01', cast(current_timestamp() - INTERVAL 90 MINUTES AS TIMESTAMP), true, true, true,'DEV99999999','102.65.10.4','Lagos', current_timestamp());
INSERT INTO investec_fraud_aml_bronze.transactions VALUES
  ('TXNATO01','ACCATO01','ACCATO01','ACCFRAUD05','debit', 3500000.00,'ZAR','TPFRAUD02','app', cast(current_timestamp() - INTERVAL 45 MINUTES AS TIMESTAMP),'Post-takeover drain','ledger', current_timestamp());

-- ── I. IMPOSSIBLE TRAVEL (3 cards: JHB tap then London tap ~30 min later) ─
-- JHB (-26.2041, 28.0473) -> London (51.5074, -0.1278): ~9000 km in 0.5h.
INSERT INTO investec_fraud_aml_bronze.card_transactions VALUES
  ('CTXFRAUD01A','CARDFRAUD01','ACCFRAUDC1', 2500.00,'ZAR','Sandton City','chip', -26.1076, 28.0567,'Johannesburg','South Africa', cast(current_timestamp() - INTERVAL 5 HOURS AS TIMESTAMP), current_timestamp()),
  ('CTXFRAUD01B','CARDFRAUD01','ACCFRAUDC1', 8900.00,'GBP','Harrods London','applepay', 51.4994, -0.1632,'London','United Kingdom', cast(current_timestamp() - INTERVAL 5 HOURS + INTERVAL 30 MINUTES AS TIMESTAMP), current_timestamp()),
  ('CTXFRAUD02A','CARDFRAUD02','ACCFRAUDC2', 1800.00,'ZAR','V&A Waterfront','contactless', -33.9036, 18.4207,'Cape Town','South Africa', cast(current_timestamp() - INTERVAL 8 HOURS AS TIMESTAMP), current_timestamp()),
  ('CTXFRAUD02B','CARDFRAUD02','ACCFRAUDC2', 5400.00,'AED','Dubai Mall','applepay', 25.1972, 55.2796,'Dubai','UAE', cast(current_timestamp() - INTERVAL 8 HOURS + INTERVAL 40 MINUTES AS TIMESTAMP), current_timestamp()),
  ('CTXFRAUD03A','CARDFRAUD03','ACCFRAUDC3', 3200.00,'ZAR','Gateway Durban','chip', -29.7264, 31.0662,'Durban','South Africa', cast(current_timestamp() - INTERVAL 10 HOURS AS TIMESTAMP), current_timestamp()),
  ('CTXFRAUD03B','CARDFRAUD03','ACCFRAUDC3', 7600.00,'USD','JFK Terminal 4','applepay', 40.6413, -73.7781,'New York','United States', cast(current_timestamp() - INTERVAL 10 HOURS + INTERVAL 25 MINUTES AS TIMESTAMP), current_timestamp());
