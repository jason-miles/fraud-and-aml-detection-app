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
- silver/  — conform, dedupe, entity resolution (materialized views)
- gold/    — the 8 alert families + impossible-travel unioned into fraud_alerts,
             plus entity_network, customer_360, alert_feedback.

Default catalog/schema: elexon_app_for_settlement_acc_catalog / investec_fraud_aml_gold.
Silver datasets use fully-qualified names to publish into investec_fraud_aml_silver.

Deploy: `databricks bundle deploy -t dev --profile fevm-elexon-app-for-settlement-acc`
Run:    `databricks bundle run fraud_aml_pipeline_etl -t dev --profile fevm-elexon-app-for-settlement-acc`

## IMPORTANT: use --full-refresh-all when re-running

Silver and gold datasets publish to *different schemas* (investec_fraud_aml_silver /
_gold) and reference each other by fully-qualified name. Lakeflow does not build a
dependency edge across fully-qualified refs, so a plain incremental run can execute
datasets before their upstreams are populated (entity resolution came out empty this
way). Always run with `--full-refresh-all` so all datasets recompute in one ordered pass:

`databricks bundle run fraud_aml_pipeline_etl --full-refresh-all -t dev --profile fevm-elexon-app-for-settlement-acc`

All 9 alert families are verified to fire against the planted scenarios after a full refresh.
