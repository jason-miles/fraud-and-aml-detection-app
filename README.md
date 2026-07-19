# Investec Wealth & Banking — Fraud & AML Detection App on Databricks

A demo/PoC that answers, end-to-end: **"What kinds of alerts would indicate fraud for Investec Wealth & Banking, and what do we do about them?"**

Built SQL-first (Lakeflow Declarative Pipelines) so a SQL-skilled team can own it. Python is confined to the app shell and a few AI/graph helpers. Competitive context: displacing Azure AI Foundry + Microsoft Fabric.

## Narrative
**Do less, get more with Unity Catalog.** One catalog, one lineage graph, one permission model across Customers / Accounts / Transactions / Third Parties — replacing the legacy Data Vault + Tabular sprawl.

## Physical layout (important)

The PRD calls for a dedicated `investec_fraud_aml` catalog with `bronze` / `silver` / `gold` schemas. The demo workspace user (`jason.miles@databricks.com`) has **ALL PRIVILEGES on `elexon_app_for_settlement_acc_catalog`** but **no `CREATE CATALOG` on the metastore** (`metastore_aws_eu_central_1`). Following the established Valterra precedent in this workspace, the medallion is co-located as prefixed schemas inside the existing catalog:

| Logical (PRD)          | Physical (this workspace)                                           |
|------------------------|---------------------------------------------------------------------|
| `investec_fraud_aml.bronze` | `elexon_app_for_settlement_acc_catalog.investec_fraud_aml_bronze` |
| `investec_fraud_aml.silver` | `elexon_app_for_settlement_acc_catalog.investec_fraud_aml_silver` |
| `investec_fraud_aml.gold`   | `elexon_app_for_settlement_acc_catalog.investec_fraud_aml_gold`   |

All SQL references the physical names. If a real `investec_fraud_aml` catalog becomes available, a find/replace of the schema prefix is the only change needed.

## Repo structure
```
sql/
  00_foundation/   catalog/schema/volume DDL + naming notes
  01_bronze/       raw landing table DDL
  02_silver/       conform, dedupe, entity resolution (Lakeflow DLP)
  03_gold/         fraud_alerts, entity_network, customer_360, alert_feedback, metric views
  04_detection/    the 8 alert families + impossible-travel (SQL rules)
  05_intelligence/ adverse media (vector_search + ai_query), PDF processing, Genie glossary
data/              synthetic data seeder (planted fraud scenarios)
app/
  backend/         FastAPI (reads gold via Databricks SQL, writes feedback)
  frontend/        React (6 pages: Alert Queue, Alert Detail, Entity Network, Customer 360, Reports, Impossible-travel map)
docs/              Managed DR posture, architecture, demo runbook
```

## Delivery phases (PRD §12)
1. **Foundation** — UC schemas, medallion skeleton, synthetic data → bronze, entity resolution in silver.
2. **Detection** — 8 alert families + impossible-travel → `gold.fraud_alerts`, parameter config table.
3. **Intelligence** — adverse media, PDF processing, Genie space + glossary + metric views.
4. **App & actions** — Databricks App (6 pages), email notifications, daily/weekly report, feedback loop.
5. **Polish** — Design Canvas walkthrough, Managed DR doc, dry-run.

## Workspace
- Host: `fevm-elexon-app-for-settlement-acc.cloud.databricks.com` (workspace `7474654808133980`)
- SQL warehouse for setup: Serverless Starter (`dcb1c3dd8d1570d6`)
