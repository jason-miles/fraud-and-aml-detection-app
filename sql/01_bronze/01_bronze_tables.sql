-- Investec Fraud & AML — Bronze layer DDL
-- Raw landed feeds. Native feeds ingested (in prod) via Auto Loader;
-- federated sources read through UC foreign catalogs. For the demo these
-- are managed Delta tables populated by the synthetic seeder.
--
-- Schema: elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze

USE CATALOG elexon_app_for_settlement_acc_catalog;

-- ── Core entity: CUSTOMER ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.customers (
  customer_id        STRING,
  full_name          STRING,
  dob                DATE,
  national_id        STRING,      -- ID doc / passport (deterministic ER key)
  tax_number         STRING,      -- deterministic ER key
  email              STRING,
  phone              STRING,
  address            STRING,
  city               STRING,
  country            STRING,
  segment            STRING,      -- e.g. high-wealth tier
  onboarded_at       TIMESTAMP,
  source_system      STRING,      -- data_vault | tabular | crm
  _ingested_at       TIMESTAMP
) USING DELTA
COMMENT 'Bronze — raw customer master from legacy Data Vault / Tabular feeds.';

-- ── Core entity: ACCOUNT ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.accounts (
  account_id             STRING,
  customer_id            STRING,
  account_type           STRING,   -- current | savings | investment | card
  currency               STRING,
  opened_at              TIMESTAMP,
  status                 STRING,   -- active | dormant | closed
  last_activity_before_ts TIMESTAMP,  -- used by dormant-reactivation rule
  balance                DOUBLE,
  source_system          STRING,
  _ingested_at           TIMESTAMP
) USING DELTA
COMMENT 'Bronze — raw account master.';

-- ── Core entity: TRANSACTION (ledger movements) ──────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.transactions (
  transaction_id  STRING,
  account_id      STRING,
  from_acct       STRING,      -- for transfers (circular-flow rule)
  to_acct         STRING,
  direction       STRING,      -- credit | debit
  amount          DOUBLE,
  currency        STRING,
  counterparty_id STRING,      -- third-party / other account
  channel         STRING,      -- wire | card | app | branch
  txn_ts          TIMESTAMP,
  description     STRING,
  source_system   STRING,
  _ingested_at    TIMESTAMP
) USING DELTA
COMMENT 'Bronze — raw ledger transactions (transfers, wires).';

-- ── Card / tap transactions (geospatial impossible-travel) ───────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.card_transactions (
  card_txn_id  STRING,
  card_id      STRING,
  account_id   STRING,
  amount       DOUBLE,
  currency     STRING,
  merchant     STRING,
  channel      STRING,        -- chip | contactless | applepay | online
  lat          DOUBLE,
  lon          DOUBLE,
  city         STRING,
  country      STRING,
  txn_ts       TIMESTAMP,
  _ingested_at TIMESTAMP
) USING DELTA
COMMENT 'Bronze — card/tap transactions with geo for impossible-travel detection.';

-- ── Core entity: RELATED THIRD PARTY ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.third_parties (
  third_party_id STRING,
  full_name      STRING,
  entity_kind    STRING,       -- individual | company | trust
  national_id    STRING,
  tax_number     STRING,
  address        STRING,
  city           STRING,
  country        STRING,
  registered_at  TIMESTAMP,
  source_system  STRING,
  _ingested_at   TIMESTAMP
) USING DELTA
COMMENT 'Bronze — third-party register (counterparties, related parties).';

-- ── KYC / CDD risk ratings (risk-rating-change rule) ─────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.risk_ratings (
  rating_id    STRING,
  entity_id    STRING,        -- customer_id or third_party_id (resolved in silver)
  entity_type  STRING,        -- customer | third_party
  risk_rating  INT,           -- ordinal band 1..5
  rated_at     TIMESTAMP,
  rated_by     STRING,
  reason       STRING,
  _ingested_at TIMESTAMP
) USING DELTA
COMMENT 'Bronze — KYC/CDD risk rating history.';

-- ── Beneficial ownership (UBO-change rule) ───────────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.beneficial_ownership (
  ubo_id         STRING,
  entity_id      STRING,      -- the company/trust whose UBO this is
  ubo_entity_id  STRING,      -- the beneficial owner
  ownership_pct  DOUBLE,
  effective_from TIMESTAMP,
  source         STRING,      -- register | kyc_doc
  _ingested_at   TIMESTAMP
) USING DELTA
COMMENT 'Bronze — beneficial ownership records from third-party register / KYC docs.';

-- ── Auth / device events (account-takeover rule) ─────────────────────────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.auth_events (
  event_id         STRING,
  account_id       STRING,
  event_ts         TIMESTAMP,
  new_device       BOOLEAN,
  new_geo          BOOLEAN,
  credential_change BOOLEAN,
  device_id        STRING,
  ip_address       STRING,
  geo_city         STRING,
  _ingested_at     TIMESTAMP
) USING DELTA
COMMENT 'Bronze — authentication/device/channel events preceding fund movement.';

-- ── Adverse-media corpus (adverse-media rule; vector_search source) ──────
CREATE TABLE IF NOT EXISTS investec_fraud_aml_bronze.adverse_media (
  article_id   STRING,
  headline     STRING,
  body         STRING,
  published_at DATE,
  source       STRING,
  named_entities ARRAY<STRING>,  -- fictional names for the demo
  _ingested_at TIMESTAMP
) USING DELTA
COMMENT 'Bronze — synthetic adverse-media articles (fictional entities).';
