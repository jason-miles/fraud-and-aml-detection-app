-- Investec Fraud & AML — Synthetic seeder (2/4): bulk ledger + card transactions
-- Target ~2-3M ledger transactions over the trailing 12 months (PRD §10).

USE CATALOG elexon_app_for_settlement_acc_catalog;

-- ── LEDGER TRANSACTIONS ──────────────────────────────────────────────────
-- ~200 txns per account on average across active accounts -> ~2.4M rows.
INSERT OVERWRITE investec_fraud_aml_bronze.transactions
WITH acct AS (
  SELECT account_id, customer_id,
         cast(regexp_replace(account_id, '^ACC0*', '') AS BIGINT) AS acct_num
  FROM investec_fraud_aml_bronze.accounts
  WHERE status = 'active'
),
txn AS (
  SELECT a.account_id, a.acct_num, e.n AS txn_seq
  FROM acct a
  LATERAL VIEW explode(sequence(1, cast(150 + pmod(a.acct_num, 120) AS INT))) e AS n
)
SELECT
  concat('TXN', lpad(cast(acct_num * 1000 + txn_seq AS BIGINT), 12, '0')) AS transaction_id,
  account_id,
  CASE WHEN pmod(txn_seq,2)=0 THEN account_id
       ELSE concat('ACC', lpad(cast(pmod(acct_num * 31 + txn_seq, 125000) + 1 AS BIGINT), 8, '0')) END AS from_acct,
  CASE WHEN pmod(txn_seq,2)=0
       THEN concat('ACC', lpad(cast(pmod(acct_num * 17 + txn_seq, 125000) + 1 AS BIGINT), 8, '0'))
       ELSE account_id END AS to_acct,
  CASE WHEN pmod(txn_seq,2)=0 THEN 'debit' ELSE 'credit' END AS direction,
  round(pmod(acct_num * 7 + txn_seq * 13, 200000) + 100, 2) AS amount,
  'ZAR' AS currency,
  concat('TP', lpad(cast(pmod(acct_num * 19 + txn_seq, 3000) + 1 AS INT), 6, '0')) AS counterparty_id,
  element_at(array('wire','card','app','branch'), cast(pmod(txn_seq, 4) + 1 AS INT)) AS channel,
  cast(current_timestamp() - make_interval(0,0,0, cast(pmod(acct_num * 3 + txn_seq * 7, 365) AS INT), cast(pmod(txn_seq*11,24) AS INT), cast(pmod(txn_seq*7,60) AS INT),0) AS TIMESTAMP) AS txn_ts,
  element_at(array('EFT payment','Card purchase','Salary','Transfer','Investment top-up','Fee'), cast(pmod(txn_seq,6)+1 AS INT)) AS description,
  'ledger' AS source_system,
  current_timestamp() AS _ingested_at
FROM txn;

-- ── CARD / TAP TRANSACTIONS (geo, for impossible-travel) ─────────────────
-- Card-type accounts get ~80 tap transactions each within SA metro coords.
INSERT OVERWRITE investec_fraud_aml_bronze.card_transactions
WITH cards AS (
  SELECT account_id, customer_id,
         cast(regexp_replace(account_id, '^ACC0*', '') AS BIGINT) AS acct_num
  FROM investec_fraud_aml_bronze.accounts
  WHERE account_type = 'card' AND status = 'active'
),
taps AS (
  SELECT c.account_id, c.acct_num, e.n AS tap_seq
  FROM cards c
  LATERAL VIEW explode(sequence(1, cast(50 + pmod(c.acct_num, 60) AS INT))) e AS n
),
geo AS (
  SELECT *, pmod(acct_num + tap_seq, 5) AS gidx FROM taps
)
SELECT
  concat('CTX', lpad(cast(acct_num * 1000 + tap_seq AS BIGINT), 12, '0')) AS card_txn_id,
  concat('CARD', lpad(acct_num, 8, '0')) AS card_id,
  account_id,
  round(pmod(acct_num * 3 + tap_seq * 7, 15000) + 20, 2) AS amount,
  'ZAR' AS currency,
  element_at(array('Woolworths','Checkers','Vida','BP','Takealot','Uber'), cast(pmod(tap_seq,6)+1 AS INT)) AS merchant,
  element_at(array('chip','contactless','applepay','online'), cast(pmod(tap_seq,4)+1 AS INT)) AS channel,
  -- five SA metros; a card mostly stays in one metro
  element_at(array(-26.2041,-33.9249,-29.8587,-25.7479,-33.9321), cast(gidx+1 AS INT)) + (pmod(tap_seq,100)/1000.0) AS lat,
  element_at(array( 28.0473, 18.4241, 31.0218, 28.2293, 18.8602), cast(gidx+1 AS INT)) + (pmod(tap_seq,100)/1000.0) AS lon,
  element_at(array('Johannesburg','Cape Town','Durban','Pretoria','Stellenbosch'), cast(gidx+1 AS INT)) AS city,
  'South Africa' AS country,
  cast(current_timestamp() - make_interval(0,0,0, cast(pmod(acct_num + tap_seq*3, 180) AS INT), cast(pmod(tap_seq*5,24) AS INT), cast(pmod(tap_seq*13,60) AS INT),0) AS TIMESTAMP) AS txn_ts,
  current_timestamp() AS _ingested_at
FROM geo;
