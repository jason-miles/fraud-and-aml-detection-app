# Declarative Automation Bundles Project — Investec Fraud & AML

This project uses Declarative Automation Bundles (formerly Databricks Asset Bundles) for deployment.

## Prerequisites

Install the Databricks CLI (>= v0.288.0) if not already installed:
- macOS: `brew tap databricks/tap && brew install databricks`

Verify: `databricks -v`

## For AI Agents

Read the `databricks-core` skill for CLI basics, authentication, and deployment workflow.
Read the `databricks-pipelines` skill for pipeline-specific guidance.

If skills are not available, install them: `databricks experimental aitools skills install`

## This pipeline

Lakeflow Declarative Pipeline (SQL, serverless) for the Investec Wealth & Banking
Fraud & AML demo. Bronze is a raw landing zone (seeded by data/ scripts in the parent
repo). This pipeline builds:
- bronze/  — transactions_stream: near-real-time Auto Loader ingestion (STREAMING
             TABLE) from the landing volume (see "Streaming lane" below).
- silver/  — conform, dedupe, entity resolution (materialized views)
- gold/    — the 8 alert families + impossible-travel unioned into fraud_alerts,
             plus entity_network, customer_360, alert_feedback.

Default catalog/schema: elexon_app_for_settlement_acc_catalog / investec_fraud_aml_gold.
Silver datasets use fully-qualified names to publish into investec_fraud_aml_silver.

## Streaming lane (transaction hot-path — near-real-time)

New transaction feeds land as JSON in the UC Volume
`investec_fraud_aml_bronze.landing/transactions/` and are ingested incrementally by
`bronze/bronze_transactions_stream.sql` (STREAMING TABLE via `read_files` Auto Loader).
`silver.transactions` UNIONs this streaming table with the historical batch table
`bronze.transactions`, so streamed txns flow through the existing detectors, app, and
Genie space with zero downstream changes.

Demo: `python data/stream/drop_transactions.py --scenario layering` drops a
layering/passthrough file, then a plain (incremental) pipeline run surfaces a fresh
`rapid_movement` alert in `gold.fraud_alerts` within seconds. Verified 2026-07-20.

Deploy: `databricks bundle deploy -t dev --profile fevm-elexon-app-for-settlement-acc`
Run:    `databricks bundle run fraud_aml_pipeline_etl -t dev --profile fevm-elexon-app-for-settlement-acc`

## --full-refresh-all: needed for a first/clean build, NOT for the streaming hot-path

Most silver and gold datasets publish to *different schemas* (investec_fraud_aml_silver
/ _gold) and reference each other by fully-qualified name. Lakeflow does not build a
dependency edge across FQN refs to *materialized views / static tables*, so on a first
or clean build a plain incremental run can execute datasets before their upstreams are
populated (entity resolution came out empty this way). For a first build or after a
clean, run with `--full-refresh-all` so all datasets recompute in one ordered pass:

`databricks bundle run fraud_aml_pipeline_etl --full-refresh-all -t dev --profile fevm-elexon-app-for-settlement-acc`

However, the **transaction hot-path is now dependency-correct incrementally**:
`silver.transactions` references the in-pipeline STREAMING TABLE
`bronze.transactions_stream` by its published FQN, and Lakeflow DOES build an edge to a
streaming table, so a plain run (no flag) orders
`transactions_stream -> silver.transactions -> detect_rapid_movement/circular_flow ->
fraud_alerts` correctly. Verified 2026-07-20: a plain incremental run picks up a
newly-dropped file and fires the alert. So for the streaming demo, just run:

`databricks bundle run fraud_aml_pipeline_etl -t dev --profile fevm-elexon-app-for-settlement-acc`

All 9 alert families are verified to fire against the planted scenarios after a full refresh.
