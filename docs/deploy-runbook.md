# Deploy runbook — migrations before code

Prepared 2026-11-21 for `codex/trigger-and-sql-totals` after staging assets `d34c6d7`. Human-operated procedure only: no migration, deployment, rollback or real-database check in this runbook was executed by the coding agent.

Release owner: ____________________  Candidate commit: ____________________

Staging project/app: ____________________  Production project/app: ____________________

Last known-good application commit: ____________________  Change window: ____________________

**Required order:** backup -> staging migrations -> staging verification -> production migrations -> production app deployment -> smoke tests -> close or rollback. A successful local build does not establish database readiness. Do not promote code before its required production RPCs/triggers exist and have been verified.

## 0. Release inventory and readiness

- [ ] Confirm the target project identities, migration history and known-good app artifact. Verify Function/database region proximity without changing regions as part of this release. The repository lacks the full baseline schema and committed CLI project configuration; use the approved operator workspace/history, not a fresh guessed schema.
- [ ] Keep test/demo settings and credentials out of production. Do not print secrets, authorization headers, request bodies, receipt images/text or backup contents in logs/evidence.
- [ ] Inventory every required RPC and every deployed caller, including older servers and cached browser/PWA clients.

| Dependency | Required migration / behavior |
| --- | --- |
| `public.get_card_balances(uuid)` | `20261120090000_card_balances_and_expense_limits.sql`; required by getCardBalances and old review-branch callers; never replace with partial/zero totals. |
| `private.enforce_card_expense_limit()` / transaction trigger | Original migration above, then `20261120120000_card_limit_trigger_fixes.sql` replaces the trigger/function behavior. |
| `public.get_card_balance(uuid, uuid)` | `20261120120000_card_limit_trigger_fixes.sql`; required by the repaired trigger; currently no direct app RPC call. |
| `public.check_rate_limit(text, integer, integer)` | `20261120100000_api_rate_limits.sql`; quota call errors intentionally fail open, so missing migration is a release blocker even if AI appears to work. |
| Performance indexes | `20261120110000_performance_indexes.sql`; inspect deployed equivalents and large-table lock requirements. |
| `public.get_dashboard_totals(uuid, boolean, uuid[], date, date, boolean)` | `20261120130000_dashboard_totals.sql`; required by dashboard/mobile dashboard, wallet and card reconciliation. Stable security invoker; new readers fail closed with the same safe missing-migration diagnostics. |

When applicable, older `20261119090000` and `20261119093000` future-plan migrations must already be in history or be reviewed/applied first. Never edit existing migration files or blindly replay an already-applied CREATE TABLE.

## 1. Take both backups before any rollout

- [ ] Download an authenticated app export through Settings / GET `/api/backup`; retain it securely outside git and logs.
  - Expected: successful export, known version/date and relevant data/receipt coverage. It is not a full schema/Auth/household backup; restore rewrites ownership/strips relevant household links and is merge-only/non-atomic.
  - Evidence reference: ____________________
- [ ] Take/confirm a Supabase project/database backup or PITR restore point, with timestamp and retention recorded; preserve required Storage/Auth/baseline schema recovery separately as appropriate.
  - Expected: a recoverable full-database recovery path beyond the application export. Test restore into staging before relying on it.
  - Backup/PITR reference and owner (no secret URL): ____________________
- [ ] Approve the write window and recovery owner. If a restore is needed, account for all legitimate writes after the backup; do not overwrite them casually.

## 2. Apply migrations to staging, in filename order

- [ ] **Before applying migrations, run npm test (includes SQL tests)** from a clean npm ci install. Expect original tests plus PGlite migration/trigger/quota/golden tests and the labelled expected-failure negative control to pass; investigate any migration failure or PGlite-unavailable skip before release.
- PGlite proves migration syntax/function logic and twelve golden comparisons against the test stub. It does NOT prove real baseline types/constraints, production RLS, Supabase Auth/roles, concurrent writers or restore through /api/backup. All staging scenarios remain mandatory, especially the second household member, two-session concurrency and restore-over-existing tests. No Supabase SQL has been run by this harness.
- Decide the documented NULL credit_limit rule (DB currently unlimited, app computes availability as zero minus debt), and verify legacy over-limit restore rejection. See [card-limit-trigger-fixes.md](card-limit-trigger-fixes.md).


Use the approved migration workflow. The examples below target **Supabase CLI v3** explicitly; bare commands can select local state by default. The operator must inspect their installed version/help before using these examples. CLI is not installed/validated on the agent machine. [CLI push reference](https://supabase.com/docs/reference/cli/supabase-db-push), [v3 target change](https://supabase.com/changelog/supabase-cli-v3).

```text
supabase --version
supabase db push --help
supabase db push --remote=<STAGING_PROJECT_REF> --dry-run --skip-vault
supabase db push --remote=<STAGING_PROJECT_REF> --skip-vault
```

- [ ] Confirm installed help supports the shown flags, the resolved target is staging, and the dry run lists **only approved pending migrations in order**. Stop on history mismatch or unexpected seeds/roles/config. Do not use force/include-all/history repair to bypass uncertainty.
- [ ] Apply the reviewed pending files in ascending filename order. The remote confirmation is an operator check; do not auto-confirm an unverified target. `--skip-vault` avoids applying vault secret configuration. Do not include test seeds or roles.
- [ ] SQL Editor alternative: in the **staging** project, execute each approved pending migration file in order, use the project's transaction/review process and record applied history through the established mechanism. Do not paste the rollback test suite as a migration or claim a manual paste automatically updated CLI history.
- [ ] Expected migration suffix for this branch: `20261120090000`, `20261120100000`, `20261120110000`, `20261120120000`, `20261120130000`. On large tables, coordinate separately reviewed concurrent index builds outside migration transactions, as the index migration documents.
- [ ] Expected: required functions/grants/RLS dependencies and targeted trigger exist; no data table was dropped or existing financial data rewritten by these migrations.
  - Applied files / result: ____________________

A minimal operator catalog check (not a substitute for RLS tests):

```sql
SELECT pg_catalog.to_regprocedure('public.get_card_balances(uuid)') IS NOT NULL AS balances_rpc,
       pg_catalog.to_regprocedure('public.get_card_balance(uuid,uuid)') IS NOT NULL AS single_card_rpc,
       pg_catalog.to_regprocedure('public.check_rate_limit(text,integer,integer)') IS NOT NULL AS quota_rpc,
       pg_catalog.to_regprocedure('public.get_dashboard_totals(uuid,boolean,uuid[],date,date,boolean)') IS NOT NULL AS dashboard_totals_rpc;
SELECT pg_catalog.pg_get_triggerdef(t.oid)
FROM pg_catalog.pg_trigger AS t
WHERE t.tgrelid = 'public.transactions'::regclass
  AND t.tgname = 'enforce_card_expense_limit' AND NOT t.tgisinternal;
```

Expected: all four true and BEFORE INSERT OR UPDATE OF card_id, amount, type, category in the trigger definition.

## 3. Complete staging verification

- [ ] Use an isolated candidate app instance pointing at staging **after step 2**. This enables the HTTP/UI staging tests; it is not production promotion.
- [ ] Run and sign off [staging-verification.md](staging-verification.md): rollback-only SQL cases, actual two-session concurrency, restore over existing IDs, second member without card UPDATE access, and dashboard/mobile smoke tests.
- [ ] Verify unauthenticated access, expired/refreshed sessions, missing-RPC diagnostics and quota readiness. Use a test-only missing-function fake or an isolated throwaway staging experiment; do not remove an RPC from an in-use environment merely to test the message.
- [ ] Expected: every required case passes with evidence, or the release is blocked. Source guards, offline tests and builds are preparation evidence, not a replacement for live SQL/RLS/concurrency results.
  - Staging sign-off / evidence: ____________________

## 4. Apply the same migrations to production BEFORE code

- [ ] Reconfirm step 1 recovery points, the approved staging results, production project identity and old app compatibility below. Refresh backups/PITR references if necessary.
- [ ] Recheck **production** pending history; use the same reviewed files that passed staging. No schema edits or new migration improvisation between environments.

```text
supabase db push --remote=<PRODUCTION_PROJECT_REF> --dry-run --skip-vault
supabase db push --remote=<PRODUCTION_PROJECT_REF> --skip-vault
```

- [ ] Alternatively use the approved production SQL Editor process, same filename order and recorded history. Confirm backups/write window before executing.
- [ ] Expected: catalog/RLS checks pass; the existing production app still has all of its required RPC signatures. For required balance reads, unavailable RPCs must fail closed. A quota RPC error must not be mistaken for healthy enforcement.
- [ ] **Stop here on any failed migration or readiness check. Do not deploy the candidate code.** Leave old code in place, inspect actual schema/history and repair forward with a new reviewed migration.
  - Production migration sign-off: ____________________

## 5. Deploy the application

- [ ] Deploy the already-verified candidate through the existing release workflow, only after production migration sign-off. Verify intended project environment bindings without printing keys. This runbook does not change Vercel settings/regions or introduce a new deployment command.
- [ ] Expected: build/start succeed with real approved environment configuration; dashboard reads find their required RPCs; application logs do not report the missing-migration diagnostic.
  - App version / deployment reference: ____________________

## 6. Production smoke test with dedicated synthetic accounts

Use approved smoke accounts/data and remove only those synthetic fixtures afterward. Do not upload a real private receipt just for this test. Record status/counts, not payloads or tokens.

| Tick | Flow | Expected result / evidence |
| --- | --- | --- |
| [ ] | `/dashboard` | Loads without runtime error; known fixture totals, card balances and forecasts match; reload/scopes/date range work. ____________________ |
| [ ] | `/mobile/dashboard` | Same authorized data in mobile UI; no layout overflow or missing balances. ____________________ |
| [ ] | Add expense | Within available funds succeeds; excess returns the existing friendly 400 error and persists no row. ____________________ |
| [ ] | Edit expense | Metadata/equal/decreased exposure passes when otherwise permitted; excess increase/card move is rejected with old data unchanged. ____________________ |
| [ ] | Delete expense | Permitted synthetic expense disappears and correct balance refreshes. Do not delete real data. ____________________ |
| [ ] | Wallet top-up | Accepted top-up raises the linked debit balance; spending lowers it. Delete dependent test expenses before cleaning a top-up so deletion cannot make a wallet negative. ____________________ |
| [ ] | Receipt flow | Synthetic image uploads, AI/OCR processing and review work, and confirmed transaction is recorded once. If providers are unavailable, record BLOCKED rather than claiming a successful end-to-end scan. ____________________ |
| [ ] | Rate-limit 429 | Valid request on an exhausted smoke-user bucket returns 429, friendly message and positive Retry-After; no provider call or extra transaction is made. See controlled procedure below. ____________________ |

Controlled 429 procedure (no provider traffic required to exhaust the bucket): use the **dedicated smoke account's authenticated Supabase client**, never a client-supplied user ID, to call existing `check_rate_limit` for p_key=`ai-chat`, p_limit=30, p_window_seconds=3600, at most 31 times (30 accepted calls fill an empty bucket; the next call is denied). This consumes only that account's current bucket. First verify every RPC call succeeds and eventually reports allowed=false; stop on any error. Then make one valid app POST `/api/ai` using its normal session with a short synthetic user message. Expect 429 plus Retry-After before AI work. Do not log the body/token, reset production quota tables or change global limits. Let the bucket expire naturally; this account will be chat-limited for the remainder of the window. Recheck configured limits first if changed from `lib/api/rateLimitPolicy.ts`.

- [ ] Expected: all applicable smoke rows pass, no new migration/permission/error spikes, and shared/private data boundaries remain intact. Otherwise pause promotion/writes as appropriate and use section 7.
  - Smoke sign-off: ____________________

## 7. Rollback / repair-forward notes

### Compatibility: not an unconditional “additive means safe” promise

| Change | Old-code compatibility and caveat |
| --- | --- |
| Original balance/limit migration | Adds RPC/trigger without removing old read APIs; original review-branch callers still need get_card_balances. Enforcement can reject invalid writes previously accepted by a race or wrong app balance. |
| Phase 1 trigger repair (`20261120120000`) | Adds single-card RPC and **replaces existing trigger/function behavior**; it is not behavior-neutral or purely additive. Old public RPC/signature and P1001/P1002/P1003 identifiers remain compatible. Old code's own prechecks may still reject legacy metadata edits before SQL, and old backup logic may have other limitations. Staging must prove the selected rollback version, not just that it starts. |
| Quotas/indexes | Preserve existing table/read contracts. Missing/dropped quota RPC causes current guards to fail open; do not remove it as routine rollback. Review actual deployed equivalent indexes/locking separately. |
| Earlier review Phase 4 (`6e332ad`, repo hygiene) | Removed dead code/packages and documented setup; no RPC signature/data-model change. |
| Phase 4 dashboard totals (`20261120130000`) | Additive read-only RPC; no existing function/trigger, data or table contract is changed. Old paged TS readers keep working. New readers require this RPC before code deployment and normalize money to cents per the approved contract. Leave it installed for app-only rollback; real-schema/RLS golden assertions must pass in staging before release. |

**Preferred rollback:** roll back only the app to the recorded, staging-verified known-good artifact while retaining compatible functions, indexes and data. Keep public.get_card_balances and the repaired trigger dependencies available. Include long-lived tabs, cached browser/PWA clients and old server instances when determining whether a function is unused. Do not regain availability by switching to a reader known to silently truncate financial data; pause affected operations instead.

**Repair forward:** add a new reviewed timestamped migration; never edit old migration files or blindly rerun the original row-lock trigger migration as an undo. Restoring a full backup/PITR is a separate recovery decision requiring a write freeze and reconciliation of post-backup legitimate writes.

### Emergency trigger removal — operator only, after pausing affected writes

First test and approve this in staging. It removes database expense-limit serialization; app prechecks alone are race-prone, so keep card writes paused until a repaired trigger is restored. This does not roll back transaction data.

```sql
BEGIN;
DROP TRIGGER IF EXISTS enforce_card_expense_limit ON public.transactions;
DROP FUNCTION IF EXISTS private.enforce_card_expense_limit();
DROP FUNCTION IF EXISTS public.get_card_balance(uuid, uuid);
COMMIT;
```

Dependency order matters: the trigger goes first, then its function, then the single-card helper. Default dependency restrictions are intentional: if a drop reports dependents, STOP and inspect; do not add CASCADE. This Phase 1 drop block intentionally **keeps** the multi-card get_card_balances RPC, quota function/table, financial data and indexes.

Only after every deployed/cached caller and DB dependency is verified to have migrated away may a separate, approved cleanup remove the original aggregate:

```sql
-- NOT compatible with current review-branch balance readers.
DROP FUNCTION IF EXISTS public.get_card_balances(uuid);
```

Do not run that cleanup with current code still deployed: balances must then fail closed by design. Leave unrelated functions/tables in place. Phase 4 totals can be removed only after all dashboard, mobile, wallet and reconciliation callers have rolled back and no cached/current client depends on them:

```sql
-- Operator-only cleanup, incompatible with current Phase 4 code.
DROP FUNCTION IF EXISTS public.get_dashboard_totals(uuid, boolean, uuid[], date, date, boolean);
```

This removes only the additive read RPC; no financial data is removed. Never drop it to test missing-RPC behavior on a live environment.

### Missing-RPC diagnostic procedure

Required balance reads detecting PGRST202 or PostgreSQL 42883 throw:

```text
Database migration 20261120090000_card_balances_and_expense_limits has not been applied
```

This is an operational hint, not proof that a migration history row is absent. Check the target project, applied history, actual function signature/grants/REST exposure, nested missing SQL dependencies and PostgREST schema cache. A stale schema cache can report a missing function even when it exists. Follow the project's approved cache-refresh procedure and recheck; do not blindly replay migrations or fall back to zero/row-truncated balances. [PostgREST error reference](https://supabase.com/docs/guides/api/rest/postgrest-error-codes).

`lib/api/rpcMigration.mjs` centralizes the detector and internal RPC/migration metadata. It emits only the fixed migration message, never the upstream error/cause/details or request payload. RSC diagnostics are deduplicated through React's request/render cache; current API routes create one Supabase client per request and a weak client guard deduplicates their repeated failures. Do not reuse server clients across requests. Generic API logging skips a migration error already reported by this helper. Browser callers receive the error without browser console logging. This describes application diagnostics, not suppression of independent framework error output. [React cache scope](https://react.dev/reference/react/cache).

The Phase 4 required dashboard RPC uses an internal dependency descriptor in services/dashboardTotals.ts with both missing-code tests. Any further required RPC must use an internal dependency descriptor and `throwIfMissingRpcMigration` at its service error boundary, preserve failure rather than returning guessed totals, and add fake-client PGRST202/42883/no-payload/dedup tests. Reuse the same request client within API work. Existing quota fail-open policy is separate and unchanged.

## Verification record

- [ ] Backups/recovery verified: ____________________
- [ ] Staging migrations and checklist signed off: ____________________
- [ ] Production migrations completed BEFORE app promotion: ____________________
- [ ] Production smoke tests passed: ____________________
- [ ] Rollback artifact/dependency review accepted: ____________________

Agent status: no CLI push, SQL, production/staging smoke, backup, rollback or deployment executed. Local preparation checks and unit results are recorded in the implementation plan after they run. Missing local PostgreSQL/Docker/CLI tools and baseline schema prerequisites remain human-owned.
