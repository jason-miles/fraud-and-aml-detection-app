# Investec Sentinel — Build Log

**Product:** Investec Sentinel — CDP & Financial Crime Intelligence Platform
**Platform:** Databricks Data Intelligence Platform (AWS, `eu-central-1`)
**Workspace:** `fevm-elexon-app-for-settlement-acc.cloud.databricksapps.com` (id `7474654808133980`)
**Repo:** https://github.com/jason-miles/fraud-and-aml-detection-app (`main`)
**Live app:** https://investec-fraud-aml-7474654808133980.aws.databricksapps.com
**Built:** 2026-07-19 · 31 commits · 3 Isaac Review passes (clean)

This document records every build step and its purpose so any engineer or AI agent
can understand what exists, why, and how it was produced.

---

## 0. What this is

An end-to-end, SQL-first Anti-Money-Laundering + CDP platform for Investec Wealth &
Banking, built on Databricks and displacing an Azure AI Foundry + Microsoft Fabric
approach. It combines a governed medallion Lakehouse, a Lakeflow declarative
detection pipeline, GenAI (Genie + Foundation Model APIs), and a branded React +
FastAPI Databricks App. Narrative: **"do less, get more with Unity Catalog."**

Physical note: the workspace user lacks `CREATE CATALOG` on the metastore, so the
medallion is co-located as prefixed schemas inside `elexon_app_for_settlement_acc_catalog`:
`investec_fraud_aml_bronze` / `_silver` / `_gold`. (Logical target was a dedicated
`investec_fraud_aml` catalog; only the schema prefix differs.)

---

## Phase 0 — Pre-execution validation (gate)

Per the source PRD, a 7-point readiness gate was run before any build. All passed:
databricks-cost-estimator skill, MCP servers (Slack/Confluence/Jira/Google +
Databricks), Salesforce (Momentum SA / AE Kyle Ross), LakeMeter, Google Drive,
Databricks workspace write access, and GitHub push access. Purpose: fail fast on
missing dependencies before spending build effort.

## Phase 1 — Foundation (data)

- **UC schemas + volume** — bronze/silver/gold + a `documents` volume for KYC PDFs.
- **Bronze DDL** — 9 raw tables: customers, accounts, transactions, card_transactions,
  third_parties, risk_ratings, beneficial_ownership, auth_events, adverse_media.
- **Synthetic seeder** — ~5,000 customers, 12,500 accounts, **2.37M** ledger txns,
  296K card taps, 3,000 third parties, plus supporting feeds. Purpose: realistic
  volume for a credible demo.
- **Planted fraud scenarios** — one deliberate scenario per detection family so every
  alert fires on demo day (circular ring, impossible-travel cards, dormant
  reactivations, UBO change, adverse-media entities, ATO, rapid passthrough).
- **Silver conform + entity resolution** — dedupe/conform, then resolve customers +
  third parties to a stable `entity_id` (deterministic `NID:`/`TAX:` keys + fuzzy
  soundex+city). This ontology is the "key" to identifying beneficial owners; planted
  cross-matches prove Marco Silva = Onyx Capital, Priya Patel = Vanguard Nominees.

## Phase 2 — Detection (Lakeflow Declarative Pipeline)

Adopted the DevHub `databricks-pipelines` skill: a bundle-based Lakeflow pipeline
(`fraud_aml_pipeline/`, SQL, serverless) rather than ad-hoc CTAS, giving a real
deployed Bronze→Silver→Gold DAG (Design Canvas).

- **9 detection families** as SQL rules → `gold.fraud_alerts`: rapid movement,
  frequency change, **circular flow (recursive CTE)**, dormant reactivation,
  risk-rating change, adverse media, UBO change, account takeover,
  **impossible travel (haversine geospatial)**. Thresholds in a tunable `alert_config`.
- **Supporting gold**: `entity_network` (graph edge list), `customer_360`, plus the
  app write-back `alert_feedback`.
- **Deploy workflow**: `databricks bundle deploy` + `run --full-refresh-all`.
  (Full-refresh is required — cross-schema fully-qualified refs don't build a
  dependency edge, so a plain incremental run can read upstreams while empty.)
- **Verification** found & fixed 3 real bugs: `ARRAY<VOID>` cast, sparse-baseline
  z-score, and a recursion cycle-guard that blocked rings from closing. All 9
  families verified firing.

## Phase 3 — Intelligence (GenAI)

- **Metric view + UC glossary** — semantic layer so Genie and the app reconcile.
- **Genie space "Fraud & AML Analyst"** — NL→governed-SQL over the gold marts.
- **ai_query (Llama 3.3 70B)** — grounded adverse-media risk summaries.
- **Vector Search index** — semantic adverse-media screening over the corpus.
- **ai_parse_document / ai_extract** — KYC / source-of-funds document processing.

## Phase 4 — App & actions (Databricks App)

- **React + FastAPI**, served as a single process (all data through UC; app holds no
  business logic beyond presentation + write-backs). Followed the Valterra pattern.
- **6 original pages** → later restructured (see rebuild).
- **Deploy**: `databricks apps create/deploy`, source synced to a workspace path.
  App service principal granted least-privilege SELECT/MODIFY + warehouse CAN_USE.
- **Actions**: alert-feedback write-back, notification views, daily report job.
- Fixed a Python 3.14/Starlette route-drop by pinning fastapi 0.115.6 / starlette
  0.41.3 on Python 3.12; typed SQL params via StatementParameterListItem.

## Phase 5 — Polish (docs)

- `docs/managed_dr_posture.md` — primary+secondary region, Deep Clone replication,
  tiered RTO/RPO (audit tier ≤30 min / ≤5 min), failover procedure.
- `docs/demo_runbook.md` — ~12–15 min click path + talk track + reset steps.
- `docs/architecture.md` — end-to-end diagram, layers, DR, Fabric/Foundry framing.

## Rebuild — "Investec Sentinel" (advanced, per SherlockAML reference)

Renamed from the interim "SherlockAML" reference build to **Investec Sentinel**.

- **Case-management data layer** — `sherlock_teams` (4), `sherlock_analysts`
  (6 personas incl. Sarah Chen), `sherlock_cases` (650 cases over 9 scenarios with
  SLA/priority/status/team/analyst/hours), write-backs (`case_notes`,
  `case_actions`, `sar_filings`), and exec aggregate views.
- **3 views + Ask + persona switcher**: Executive Overview (KPIs, trends, Case
  Resolution Flow, Team Performance, priority/status heatmap), Alert Investigation
  (My Queue → investigation page with evidence, notes, flagged txns, entity links,
  **multi-agent chat**, **AI triage**, escalate/dismiss/proceed-to-SAR), SAR Filing
  (AI narrative → PDF → submit → audit trail), Graph Explorer, Ask Sentinel.
- **Design = investec.com**: Libre Caslon Text serif + Inter, slate-navy `#30384a`
  + gold `#c9a24b`, near-square corners, spectacular inline-SVG "Investec | Sentinel"
  hero logo.

## GenAI enhancements

- **Ask Sentinel** — Genie Conversation API (answer + generated SQL + result table +
  multi-turn), surfaced as a nav item.
- **AI Executive Briefing** (ai_query over KPIs), **AI Risk Triage** (per-case
  model risk + recommendation + rationale), **smart prioritization** blurbs per alert.

## Market-gap features (benchmarked vs Quantexa / ComplyAdvantage / FATF)

Top-3 missing capabilities identified and built:

1. **Sanctions & Watchlist Screening** — watchlist + fuzzy match (normalised
   Levenshtein + soundex; jaro_winkler is NOT a Databricks built-in) →
   `sanctions_screening_hits` + alert family. 5 confirmed hits on planted entities.
2. **Perpetual KYC (pKYC)** — `pkyc_customer_risk` view: continuous 0-100 risk from
   alerts, sanctions, adverse media, geography, dormancy, balance; band + EDD trigger
   + risk drivers.
3. **Behavioural peer-group anomaly** — `peer_anomaly` view: per-segment baselines,
   z-score outliers (3σ+); flags customers "unlike their peers".

New families **folded into** `sherlock_cases` (→ 11 scenarios in exec flow + queues)
and the **Genie space expanded** to 8 tables so "Who has sanctions hits?" answers
natively. Surfaced in a new **Compliance** view (3 tabs).

## Quality: 3 Isaac Review passes + 1 /code-review (all findings actioned)

- `/code-review` (high effort): 10 findings, 9 fixed (1 false positive).
- Isaac pass 1: `ai_query` prompt SQL-injection/escaping → bound parameters.
- Isaac pass 2: SPA static-fallthrough path traversal → realpath-within-root check.
- Isaac pass 3: committed `jaro_winkler` SQL (not a built-in) → Levenshtein+soundex.

---

## Key IDs & resources

| Resource | Value |
|----------|-------|
| Catalog | `elexon_app_for_settlement_acc_catalog` |
| Schemas | `investec_fraud_aml_{bronze,silver,gold}` |
| App | `investec-fraud-aml` |
| App service principal | `982e92ba-63ff-4de6-95ff-2bea54a734bd` |
| Genie space | `01f183691e8f14f18ae80b78b6ffae8b` ("Fraud & AML Analyst", 8 tables) |
| Setup warehouse | `dcb1c3dd8d1570d6` (Serverless Starter) |
| App warehouse | `d0305022e6c3db8e` (elexon-anamoly-app) |
| Vector Search index | `...gold.adverse_media_index` on `valterra-vs-endpoint` |
| CLI/OAuth profile | `fevm-elexon-app-for-settlement-acc` |

## How to rebuild in a fresh Databricks account

1. **Auth**: `databricks auth login --host <workspace-url> --profile <name>`.
2. **Schemas + data**: run `sql/00_foundation`, `sql/01_bronze`, then `data/*.sql`
   (seeder + planted scenarios) on a SQL warehouse.
3. **Pipeline**: `cd fraud_aml_pipeline && databricks bundle deploy -t dev &&
   databricks bundle run fraud_aml_pipeline_etl --full-refresh-all -t dev`.
4. **Silver/gold** (if not via pipeline): run `sql/02_silver`, `sql/03_gold`.
5. **Intelligence**: run `sql/05_intelligence/*` (metric views, adverse-media AI,
   VS index, doc processing).
6. **Case-mgmt + advanced AML**: run `sql/06_sherlock/*` (cases, exec views,
   sanctions, pKYC, peer anomaly, fold-new-families).
7. **Genie space**: create over the gold marts (8 tables listed above).
8. **App**: build the frontend (`cd app/backend/frontend && npm ci && npm run build`),
   copy `dist` → `webroot`, `databricks apps create investec-sentinel`, sync
   `app/backend` to a workspace path, `databricks apps deploy`. Grant the app SP
   SELECT/MODIFY on the schemas, CAN_USE on the warehouse, CAN_RUN on the Genie space.

Adjust catalog/schema/warehouse/space IDs to the target account throughout.
