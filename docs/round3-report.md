# Round 3 — real Postgres regression evidence

Date: 2026-11-21. Branch: `codex/fix-totals-migration-and-sql-tests`, created from `codex/trigger-and-sql-totals` at `2f76f6b`. Commits before this report: Phase1 `b8a0591`, Phase2 `20805e5`, Phase3 `0109d0c`, Phase4 `86eaf77`. This report is Phase5's separate documentation commit.

**Real SQL now runs in PGlite (Postgres compiled to WASM), NOT Supabase.** The earlier 105 offline tests could not catch a broken SQL projection. The real-engine negative control now catches that exact defect. Actual baseline constraints, production RLS/Auth, concurrent writers and API restore still require staging. No real database, migration history, secrets or Vercel settings were changed, and no push/deploy was performed.

## Per-task status and files

| Task | Status | Implementation / executed evidence |
| --- | --- | --- |
| 1.1 Projection blocker | Done | Only change to existing migrations: `supabase/migrations/20261120130000_dashboard_totals.sql` adds t.payment_method to scoped. Every alias/reference was checked; no other missing projected field found. No function logic changed. Phase1 checks105/105 passed, though SQL had not run then. |
| 2.1 Exact dev dependency | Done | `package.json`/`package-lock.json` pin @electric-sql/pglite to0.5.17 without a range, dev-only. npm audit --omit=dev reports0. Dummy next build passes; entry bundles unchanged and generated app JS/runtime traces contain no PGlite references/assets. |
| 2.2 Minimal baseline | Done (test stub only) | `tests/sql/baseline-stub.sql` derives referenced columns from types/database.ts and all migrations. Defines auth/private schemas, auth.uid using request.jwt.claim.sub, local anon/authenticated roles, users/cards/transactions/households/members/categories/financial_goals/contributions/trips/receipts and the membership helper. Prominent warning: not real schema, production RLS NOT modelled; replace after schema export. Nullable edge fields are test allowances, not claims about production. |
| 2.3 Migration runner | Done | `tests/sql/helpers.mjs` opens a fresh in-memory PGlite per test file, loads stub, reads EVERY .sql migration from disk in sorted filename order and applies each transactionally. Errors fail with migration filename and PostgreSQL message/code; no upstream SQL query/payload is logged. No migration-failure skip/fallback. |
| 2.4 Migration/catalog checks | Done in PGlite | `tests/sql-migrations.test.mjs` applies all7 migrations, replays each candidate twice, reports known one-shot files, checks4 RPC signatures, anon/PUBLIC denial/authenticated EXECUTE, invoker trigger and empty search_path on all current migration-created functions. |
| 2.5 Dashboard golden equivalence | Done in PGlite; real RLS partial | `tests/sql-dashboard-totals.test.mjs` inserts visibleRows ONLY and sets stub subject A. All12 frozen cases pass. Money tolerance0.005, counts exact, category names/order exact, float8 amounts relative tolerance1e-9. Fields mapped explicitly, independent of JSON key order. Hidden fixture rows were excluded before insertion, NOT hidden by production policies. |
| 2.6 Trigger scenarios | Done in PGlite; concurrency/RLS partial | `tests/sql-card-limits.test.mjs` names each scenario separately; each group has pristine BEGIN/ROLLBACK fixtures. Legacy rows use temporary test-only DISABLE/ENABLE TRIGGER, never a weakened migration. All requested debit/credit/repayment/legacy edit/move/unknown/upsert/full-card/single-vs-multi aggregate scenarios pass, including already-overlimit upsert rejection and wallet-category expense on CREDIT consuming credit. |
| 2.7 Atomic quota logic/ACL | Done in PGlite; real Auth partial | `tests/sql-rate-limit.test.mjs` tests exactly3 allowed calls, fourth denied with positive retry, independent key, invalid limits/windows. PGlite supports SET LOCAL ROLE authenticated: function succeeds while direct SELECT/INSERT/UPDATE/DELETE are denied; has_table_privilege also confirms all false. These are local stub roles, not Supabase Auth verification. |
| 2.8 Negative control | Done in PGlite | Original missing-column SELECT variant is embedded as a small string substitution against the real migration. Function creation fails with42703/payment_method; file name and safe error text appear in test diagnostics. No source file is modified by this test. |
| 2.9 npm test integration/duration | Done | Existing `node --test tests/*.test.mjs` script already discovers the4 new root SQL test files; no separate opt-in script required. One engine per file keeps total runner around3seconds. SQL errors always fail; only missing PGlite package or absent WebAssembly produce explicitly labelled unavailable skips. Current run has0 skips. Unrecognized initialization/runtime errors fail rather than being hidden. |
| 3.1 NULL credit limit | Done as regression/documentation; decision pending | Added fifteenth card test: SQL accepts expense1000/increase2000 with NULL limit. Same PGlite rows through actual getCardsWithBalance yield available=-2000 and app precheck predicate rejects positive expense. No production behavior changed. `docs/card-limit-trigger-fixes.md` explains disagreement and pending decision. |
| 3.2 Caller-visible balances | Done (docs); optional illustration skipped | Same document explains invoker/RLS undercount on shared cards. Production policies are missing; no invented policy is presented as their substitute. Optional illustrative RLS test intentionally omitted. PGlite did run role/grant checks; its role support is not claimed to be unavailable. |
| 3.3 Restore over-limit legacy rows | Done in PGlite + docs | Existing-ID full-valid-balance upsert passes; already-overlimit legacy upsert fails BEFORE INSERT even if eventual UPDATE would be a no-op. Independent tests and explicit documentation pin both outcomes. /api/backup restore not executed. |
| 3.4 Staging/rollout notes | Done (docs only) | `docs/staging-verification.md` and `docs/deploy-runbook.md` require npm test (includes SQL tests) BEFORE migration apply and explicitly retain actual RLS, second member, concurrency, real Auth and API restore gates. Historical no-SQL statements are labelled as earlier evidence. |
| 4 CI guard | Done (file); remote execution pending | No existing workflow/engines/.nvmrc found. `.github/workflows/ci.yml` uses push/pull_request, contents:read, checkout/setup-node@v4, Node24 matching verified local major, npm ci/lint/tsc/test/audit/build and bundle guard. Dummy public Supabase values only; no secrets/deploy. Local npm ci and all commands passed; GitHub Actions has NOT run. |
| 5 Report | Done | This file records executed evidence, limitations, counts/durations and all human actions. Plan/evidence ledger: `docs/superpowers/plans/2026-11-21-real-sql-regressions.md`. |

Phase2 added34 SQL tests: migrations5 + dashboard12 + cards14 + quota3. Phase3 added one NULL-limit case, giving35 SQL tests plus the unchanged105 original tests =140 unique tests. No older migration was edited and no new repair migration was needed in these phases. Only the explicitly permitted dashboard projection line changed in Phase1; git diff confirms all other existing migration files are untouched.

## Executed test evidence

| Checkpoint | Unique passing tests | Skips | Node test-runner duration |
| --- | --- | --- | --- |
| Before SQL suite, Phase1 | 105 | 0 | 1436.8481ms (~1.44s) |
| Phase2 SQL suite | 139 | 0 | 2846.42ms (~2.85s) |
| Phase3 NULL/docs | 140 | 0 | 3046.9483ms (~3.05s) |
| Phase4 fresh npm ci/CI checks | 140 | 0 | 3202.5889ms (~3.20s) |
| Phase5 final recheck | 140 | 0 | 3146.8963ms (~3.15s); npm command wall-clock3694ms (~3.69s) |

Durations are observed on this machine, include test-worker startup/PGlite initialization, and exclude npm installation/build/CLI startup; they are not a CI or database-latency SLA. Baseline duration is the recorded Phase1 run, not a hypothetical SQL-free timing. All required lint, npx tsc --noEmit, npm test and dummy-config npm run build checks passed after Phases1–4. Phase5 re-ran all four successfully before committing this report. Independent fresh read-only review found no actionable defect and separately executed all35 SQL tests with0 skips in2146.514ms. Existing Node typeless-package warnings remain.

The build uses NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy. Fresh npm ci succeeded. npm audit --omit=dev output: **found 0 vulnerabilities**. Post-build `node tests/assert-no-pglite-bundles.mjs` output:

```text
PASS: no PGlite references/assets in 543 built app JS/trace files
```

The guard scans generated server/static JavaScript and runtime trace files; it is not a general software-composition or source-map audit. `node tests/measure-client-bundles.mjs` confirms the six tracked entry bundles are unchanged from Round2 (dashboard gzip126288; mobile dashboard123133; reports126565; mobile reports126679; mobile transactions129047; mobile budget126287 bytes). No PGlite imports exist in application source.

### Negative-control output (actually observed)

```text
PASS PGlite NEGATIVE CONTROL: original broken scoped CTE fails creating totals function
EXPECTED SQL FAILURE: Migration 20261120130000_dashboard_totals.sql: column s.payment_method does not exist
SQLSTATE: 42703 (asserted by test)
```

The passing test requires SQL creation to FAIL. It proves this harness detects the original regression rather than merely inspecting SQL text or mocking a response. Migration-error transactions roll back and leave the fixed function intact.

### Idempotency output (actually observed)

```text
NOT RE-RUNNABLE (expected): Migration 20261119090000_future_money_plans.sql: relation "future_money_plans" already exists
NOT RE-RUNNABLE (expected): Migration 20261119093000_future_plan_validation.sql: constraint "future_plan_finite_date" for relation "future_money_plans" already exists
RE-RUNNABLE twice: 20261120090000_card_balances_and_expense_limits.sql
RE-RUNNABLE twice: 20261120100000_api_rate_limits.sql
RE-RUNNABLE twice: 20261120110000_performance_indexes.sql
RE-RUNNABLE twice: 20261120120000_card_limit_trigger_fixes.sql
RE-RUNNABLE twice: 20261120130000_dashboard_totals.sql
```

Known one-shot files are asserted and explicitly diagnosed, not silently ignored or rewritten. A new unclassified replay failure fails the suite and requires review. Filename-order execution tests every future migration automatically; stub dependencies must evolve or be replaced by the exported actual baseline.

## What PGlite proves and does not prove

**Executed in PGlite:** all real migration files on the labelled stub, RPC creation/signatures/ACL/search_path, trigger calculations/exposure/update/upsert rules, quota decisions and actual stub-role table denials, twelve numeric/category golden cases and deliberate broken-function failure. Engines are fresh per file; scenarios roll back, preserving independence. Test data and subject settings are synthetic/in-memory only.

**Not run/proven:** Supabase or production/staging SQL; the actual baseline's enums, NOT NULL/FK/check constraints; production credit_cards/transactions policies; real Auth/JWT/PostgREST identity/cookie flows; second-household-member access; multi-session advisory locking/isolation/deadlock behavior (PGlite has one connection); restore through /api/backup; real provider/device flows; database performance/regions; GitHub-hosted CI; deployments.

Invoker calculations still depend on complete authorized visibility. If a permitted spender cannot SELECT another member's card expenses, used credit may be understated; debit balances can be misstated in either direction depending on hidden rows. PGlite fixtures intentionally do not model that production policy. The tests preserve the current NULL credit_limit disagreement and legacy over-limit restore rejection instead of silently changing financial rules.

## Needs human — release gates

1. **Run [docs/staging-verification.md](staging-verification.md) and supabase/tests/*.sql on an isolated staging project.** Back up first (app export plus Supabase backup/PITR). Include actual RLS/second household member with card SELECT but no UPDATE permission, two-session concurrency and /api/backup restore over existing IDs. Record outcomes; PGlite cannot replace this evidence. Inspect actual constraints and approved fixture adaptations; do not weaken policies or migration logic to make tests pass.
2. **Apply migrations 090000 -> 130000 BEFORE deploying code.** Follow [deploy-runbook.md](deploy-runbook.md) and actual migration history: 20261120090000, 20261120100000, 20261120110000, 20261120120000, 20261120130000 in order, plus required older baseline/future-plan dependencies. The dashboard migration has the permitted never-applied blocker fix. Do not blindly replay the two one-shot files or alter history. Migration applies first to staging, then validated production migration before app deployment. Preserve compatible functions on app rollback.
3. **Decide NULL credit_limit behavior: unlimited or rejected.** SQL currently permits unlimited expenses/increases because NULL comparisons do not raise; JavaScript treats NULL like zero in subtraction, and app prechecks can reject. Verify real nullability/legacy data and approve a consistent rule before any NEW migration/API change. No behavior change was made here.
4. **Set the Vercel Function Region to match the Supabase project's actual region.** Supplied context says the current function region is iad1 and Hobby allows one region; these settings were not independently queried or changed. Confirm the database region and choose the matching single function region through the approved operator workflow. Do not assume Supabase is in Singapore without checking. No Vercel settings/secrets were touched by this work.
5. **Export the real base schema with `supabase db dump --schema public` as the first baseline migration and replace `tests/sql/baseline-stub.sql`.** Verify CLI target/version/options first. Review schema-only output and required private/Auth helper dependencies; public-only output is not all Supabase infrastructure. Agree on a bootstrap/migration-history strategy; never prepend/replay DDL blindly over deployed tables. Retain only documented test identity adapters and do not import production data/secrets into tests.
6. **Decide ON DELETE behavior of future_money_plans.user_id.** The existing reference to auth.users(id) has no explicit action (default NO ACTION); existing plans can block deleting a user. Decide restrict/retention vs cascade, including related plan links/events, then implement the approved choice in a NEW migration. Existing historical files were not edited for this decision.
7. Push/review this branch and observe the actual GitHub Actions run before relying on CI; the workflow was only exercised through equivalent local commands. Production/device/Auth/OCR end-to-end flows and prior broader release prerequisites remain pending.

Release state: blocker corrected, real SQL regressions passing in PGlite, application checks clean; staging/Supabase/rollout decisions remain human-owned. No claim of production RLS or concurrency correctness is made.
