# Investec Sentinel — Next Steps & Improvement Ideas

**For:** any engineer or AI/LLM agent picking up this app.
**Read first:** `BUILD_LOG.md` (what exists and why) and `app/docs/architecture.md`.

This is a **demo-grade** platform: real Databricks primitives, real GenAI, realistic
synthetic data, but built for a stakeholder demo — not production. Below is what to
improve to make it more realistic, enterprise-ready, and bank-grade for AML.

---

## 0. Current state (baseline)

- SQL-first medallion (bronze/silver/gold) on Unity Catalog; Lakeflow declarative
  detection pipeline (9 families) + sanctions screening, pKYC, peer anomaly.
- React + FastAPI Databricks App (Investec Sentinel): Executive Overview, Alert
  Investigation, Compliance, Graph Explorer, Ask Sentinel (Genie).
- GenAI: Genie NL analytics, multi-agent assistant, AI triage/briefing/prioritize,
  SAR narrative generation, adverse-media summaries.
- 650 synthetic cases, 6 analysts / 4 teams, planted fraud scenarios.

---

## 1. Data realism & scale (highest impact for "enterprise-ready")

- **Real-scale data**: move from 5K customers / 2.4M txns to tens of millions of
  txns; partition/liquid-cluster the fact tables; validate detection performance and
  cost at scale (this is where the Lakehouse story is won or lost).
- **Streaming ingestion**: replace batch full-refresh with **Structured Streaming /
  Lakeflow streaming tables + Auto Loader** so alerts are near-real-time (matches the
  "faster payments require near-real-time compliance" market trend). Today the
  pipeline requires `--full-refresh-all`; make silver/gold incremental and
  dependency-correct (avoid cross-schema FQN refs that break the DAG).
- **Realistic typology injection**: replace hand-planted scenarios with a
  configurable scenario generator (parameterised ring sizes, layering depth,
  smurfing patterns) so detection can be stress-tested.
- **Reference data**: integrate real sanctions/PEP list *formats* (OFAC SDN XML,
  UN Consolidated, EU CFSP) and a proper watchlist refresh cadence, rather than a
  10-row synthetic table.

## 2. Detection quality

- **Supervised ML models**: train gradient-boosted / graph-neural models on labelled
  outcomes (SAR-filed vs dismissed) via MLflow + Unity Catalog model registry; serve
  via Model Serving and blend model score with rules (the app already displays a
  rules score + an ai_query "AI risk" — replace the latter with a real served model).
- **Model risk management**: threshold-tuning workbench, champion/challenger, backtest
  harness, drift monitoring (Lakehouse Monitoring), and an auditable model-governance
  record — regulators require documented model validation.
- **Graph algorithms**: real community detection / centrality / shortest-path over the
  entity graph (GraphFrames) instead of the app-side radial layout; surface rings and
  hidden UBO links algorithmically.
- **Feature store**: move entity/behavioural features into Databricks Feature Store
  for reuse across detection, pKYC, and anomaly models.

## 3. Perpetual KYC & customer risk

- **Event-driven re-rating**: recompute pKYC on triggers (new alert, sanctions hit,
  adverse media, transaction spike) rather than on view read; persist a risk history
  table so **risk trajectory over time** can be charted.
- **CDD/EDD workflow**: turn the `edd_review_required` flag into a real EDD case type
  with its own queue, document-request checklist, and periodic-review scheduling.
- **Risk model transparency**: expose the weight of each pKYC component and let a
  steward tune weights (config table + UI), with change audit.

## 4. Investigation workflow & agents

- **True multi-agent orchestration**: replace the per-agent ai_query calls with a
  Databricks **Agent Bricks / Mosaic AI multi-agent supervisor** (tool-calling agents
  for policy Q&A, adverse media, transaction analysis, SAR drafting) with a shared
  memory of the case; add tool use over the actual gold tables.
- **Evidence auto-gathering**: an agent that assembles the full evidence pack
  (transactions, network, prior SARs, KYC docs) on case open, cutting the analyst's
  manual correlation to zero.
- **Case state machine**: enforce valid transitions (new→assigned→in_progress→
  escalated/closed) with SLAs, reassignment, four-eyes approval on SAR filing, and
  full audit — today status is a free field.
- **Real SAR output**: generate goAML / FinCEN-format XML (not just a narrative +
  "PDF"), with validation against the schema and a submission connector.

## 5. Governance, security & compliance (bank-grade)

- **Row/column-level security & masking** on PII (UC row filters + column masks);
  segregate data by BU and analyst entitlement.
- **On-behalf-of (OBO) auth** in the app so queries run as the logged-in user (today
  the app uses a single service principal) — required for per-user audit and least
  privilege.
- **Full audit & lineage**: every read/decision/SAR captured; use UC lineage +
  system tables for a defensible audit trail; retention policies per regulation.
- **Secrets & config**: move IDs/hosts out of `app.yaml` env into Databricks secrets
  / bundle variables; parameterise catalog/schema so the app is account-portable.
- **Real DR drill**: implement and test the `managed_dr_posture.md` plan (Deep Clone
  jobs, secondary-region bundle target, failover runbook automation).

## 6. Application & UX

- **Consolidate to a bundle-deployed app** (databricks.yml `app` resource) so the app,
  pipeline, and job deploy together and grants auto-apply — removes the manual
  sync/deploy + grant steps in the build log.
- **Charts/UX**: the Graph Explorer uses a hand-rolled SVG force layout; move to a
  real graph lib (Cytoscape/Sigma) for large graphs; virtualise long tables;
  add server-side pagination/filtering to the alert/case endpoints.
- **Real-time updates**: WebSocket/polling so exec KPIs and queues refresh live
  (the screenshots imply a "40s ago" refresh indicator).
- **Accessibility & i18n**, dark mode, and an embedded AI/BI dashboard on the Reports
  surface (currently a Recharts bar).

## 7. Testing, CI/CD & observability

- **Automated tests**: pytest for backend endpoints, Playwright for the UI (the
  DevHub `web-devloop-tester` pattern), and SQL data-quality **Lakeflow
  expectations** on every dataset.
- **CI/CD**: GitHub Actions → `databricks bundle validate/deploy` on merge; run Isaac
  Review in CI; block on failing expectations.
- **Observability**: app + pipeline metrics/logs to a monitoring surface; alert on
  pipeline failures, latency, and cost.

## 8. Genie & GenAI depth

- **Genie curation**: add SQL example queries, joins, and a richer glossary to the
  space so NL answers are more accurate; add certified metrics.
- **Grounded SAR & adverse media**: RAG the SAR narrative against actual case
  evidence + policy docs (vector search) rather than a metadata prompt; cite sources.
- **Guardrails & evaluation**: add Mosaic AI guardrails + an eval harness
  (faithfulness/accuracy) for every LLM surface — regulators will ask how the AI is
  validated.

---

## Suggested priority order

1. Streaming ingestion + incremental pipeline (realism + the marquee tech story).
2. Supervised ML detection + Model Serving + model governance (the "75% fewer false
   positives" claim needs a real model behind it).
3. RLS/masking + OBO auth + full audit (table stakes for a bank).
4. True Agent Bricks multi-agent + goAML SAR output.
5. Bundle-deploy everything + CI/CD + tests.

## Pointers for an AI agent continuing this work

- The repo is self-contained under `app/`. Start with `app/README.md`,
  `app/docs/architecture.md`, and `BUILD_LOG.md §"How to rebuild"`.
- SQL is the source of truth for data; the Lakeflow bundle is in
  `app/fraud_aml_pipeline/`; the app is `app/app/backend/` (FastAPI + `frontend/`).
- Everything is parameter-light — search for the catalog/schema/warehouse/space IDs
  in the BUILD_LOG "Key IDs" table and replace for a new account.
- Re-run detection with `--full-refresh-all` (known dependency caveat).
