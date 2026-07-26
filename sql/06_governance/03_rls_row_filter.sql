-- Investec Sentinel — bank-grade governance: row-level security (NEXT_STEPS #5).
--
-- A UC ROW FILTER on sherlock_cases enforcing team/BU entitlement: an analyst only
-- sees cases for their own team, a compliance-oversight group sees everything, and
-- the app service principal keeps full visibility (so the app is never broken).
--
-- Visibility precedence (row visible when ANY is true):
--   1. Nedbank app service principal (982e92ba-…)   → full visibility (app keeps working)
--   1b. Investec (Sentinel twin) app SP (e02af8bb-…) → full visibility (shared data twin)
--   2. member of `aml_compliance_oversight` group   → full visibility (stewards/CCO)
--   3. deploying owner (jason.miles@databricks.com) → full visibility (demo/admin)
--   4. member of `aml_team_<team_id>` group         → only that team's cases
--   else                                            → no rows
--
-- NOTE: both app SPs are listed because they share the SAME gold tables (the two
-- apps differ only in branding). Omitting either SP silently empties that app's
-- case-backed pages (exec views, queue) — every query returns 200 but 0 rows.
--
-- IMPORTANT — single-service-principal caveat: the app runs all queries as ONE
-- service principal, so through the APP every logged-in analyst inherits the SP's
-- full visibility (the app already scopes the queue by analyst_id at the query
-- layer). True PER-ANALYST enforcement at the UC layer needs On-Behalf-Of (OBO)
-- auth so queries run as the logged-in user — deferred (see NEXT_STEPS §5). This
-- filter is fully enforced for DIRECT queriers (Genie, ad-hoc SQL, BI tools), which
-- is where BU segregation matters most.

USE CATALOG elexon_app_for_settlement_acc_catalog;

CREATE OR REPLACE FUNCTION investec_fraud_aml_gold.rls_case_team(team_id STRING)
RETURN
  current_user() = '982e92ba-63ff-4de6-95ff-2bea54a734bd'      -- Nedbank app SP
  OR current_user() = 'e02af8bb-a2a7-4cb7-a7d0-cd36a088aec8'    -- Investec (twin) app SP
  OR is_account_group_member('aml_compliance_oversight')        -- oversight/CCO
  OR current_user() = 'jason.miles@databricks.com'              -- deploying owner
  OR is_account_group_member(concat('aml_team_', lower(team_id)));  -- per-team analyst

ALTER TABLE investec_fraud_aml_gold.sherlock_cases
  SET ROW FILTER investec_fraud_aml_gold.rls_case_team ON (team_id);

-- Per-team groups to create (account admin) for real analyst scoping:
--   aml_team_team_tm, aml_team_team_edd, aml_team_team_sw, aml_team_team_fr
-- To remove:  ALTER TABLE investec_fraud_aml_gold.sherlock_cases DROP ROW FILTER;
