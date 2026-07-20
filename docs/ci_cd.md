# CI/CD — Investec Sentinel (roadmap #5)

Two GitHub Actions workflows drive the project:

## `.github/workflows/ci.yml` — PR gate (no deploy)
Runs on every pull request to `main`:
- **test-backend** — `pytest` over `app/backend/tests` (goAML XML, evidence brief,
  AI-risk blend, route smoke tests with a mocked DB — no warehouse needed).
- **build-frontend** — `npm ci && npm run build` to catch UI/TS breakage.
- **bundle-validate** — `databricks bundle validate -t prod` (needs the secrets below).

## `.github/workflows/deploy.yml` — deploy on merge to `main`
- Re-runs the backend tests, then builds the React UI into `webroot/` and runs
  `databricks bundle deploy -t prod`, shipping the **app + pipeline + jobs** together.
- `concurrency: deploy-prod` prevents overlapping deploys.

## Required repo secrets
Add under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `DATABRICKS_HOST` | `https://fevm-elexon-app-for-settlement-acc.cloud.databricks.com` |
| `DATABRICKS_CLIENT_ID` | OAuth service-principal client id (M2M) |
| `DATABRICKS_CLIENT_SECRET` | OAuth service-principal secret |

Create the M2M service principal + OAuth secret in the workspace
(**Settings → Identity and access → Service principals → generate OAuth secret**),
and grant it `CAN_MANAGE` on the app/pipeline/jobs plus the usual UC grants
(USE CATALOG/SCHEMA, SELECT/MODIFY on the gold/silver schemas). The app's own runtime
service principal (`982e92ba-…`) is separate and already granted.

## Isaac Review in CI (recommended, per NEXT_STEPS #7)
Add a job that runs `isaac review` on the PR diff and blocks on findings — Databricks'
recommended code-review pipeline. Kept out of the default workflow here because it
needs the internal Isaac tooling available on the runner.

## Migration note (bundle consolidation)
The root `databricks.yml` unifies the app + pipeline + jobs. The pipeline currently
also has a nested bundle at `fraud_aml_pipeline/databricks.yml`. Cut over deliberately:
deploy once from the root (`databricks bundle deploy -t prod`), confirm the pipeline +
app adopt cleanly, then retire the nested bundle. Do not run both bundles against the
same resources.
