# Round 2 final report

Date: 2026-11-21. Branch: `codex/trigger-and-sql-totals`. Round 2 starts after `b1e7de5` on `codex/review-fixes-and-perf`; implementation commits are `fa9a9c0`, `d34c6d7`, `18f7bc6` and `6823ada`. This report is the separate Phase 5 documentation commit.

**Implementation and offline checks are complete. Database rollout is NOT complete.** No new migration, SQL scenario, live RLS/concurrency/restore scenario, production smoke test, deployment or push was executed in Round 2. Existing migrations were not edited. No real database, secrets, original checkout or Vercel settings/regions were changed.

Status vocabulary: **Done** = requested source/document/test asset implemented and its available local checks passed; **Partial** = source complete but a requested database/integration proof remains unexecuted; **Skipped** = deliberately not executed or outside the safe scope. A source guard or mocked RPC test is not proof of PostgreSQL execution.

## Per-task status

### Phase 1 — card-limit correctness repair (fa9a9c0)

| Task | Status | Files / result and limits |
| --- | --- | --- |
| 1 Targeted UPDATE trigger and unchanged-value early return | Partial | New `20261120120000_card_limit_trigger_fixes.sql` targets card_id/amount/type/category and compares all four before locking. Source guards pass; actual trigger execution pending. |
| 2 Enforce only increasing expense exposure | Partial | New migration and `lib/validation/cardExposure.ts` preserve insert checks/exemptions and skip non-increasing updates. Pure/API tests pass; SQL cases pending. |
| 3 Replace card row lock with advisory lock | Partial | New trigger takes a per-card transaction advisory lock before plain visible-card SELECT; no card UPDATE privilege is requested. Member/concurrency behavior requires actual deployed RLS. |
| 4 Single-card aggregate | Partial | New invoker `public.get_card_balance(uuid,uuid)` retains debit top-up precedence, ignored ordinary debit income and credit signs. Existing multi-card RPC unchanged. Static comparison only, DB equivalence pending. |
| 5 Existing-ID INSERT exclusion for near-limit upsert | Partial | Existing row is checked/excluded after the lock. Real ON CONFLICT and concurrent upserts remain staging tests. Legacy over-limit INSERT/upsert may still be rejected by design. |
| 6 Preserve errors, privileges and migration history | Partial | P1001/P1002/P1003 and friendly Thai mappings retained; invoker functions, empty search paths, qualified references, PUBLIC/anon revokes and authenticated grants written. No live privilege test. |
| 7 Pure helper and PATCH prechecks | Done | `app/api/transactions/[id]/route.ts` uses `increasesCardExposure`. Metadata/equal/reduced edits retain card visibility validation but skip balance RPCs; increased exposure keeps prechecks. Offline reproductions/API tests pass. |
| 8 Regression guards | Done | `tests/card-limit-trigger-migration.test.mjs` plus exposure/API tests exercise source structure and handler behavior. These do not execute SQL. |

Complete Phase 1 file inventory: `app/api/transactions/[id]/route.ts`; `lib/validation/cardExposure.ts`; `supabase/migrations/20261120120000_card_limit_trigger_fixes.sql`; `tests/card-exposure-api.test.mjs`; `tests/card-exposure.test.mjs`; `tests/card-limit-trigger-migration.test.mjs`; `tests/transaction-api.test.mjs`; [verification details](card-limit-trigger-fixes.md); `docs/superpowers/plans/2026-11-21-card-limit-trigger-fixes.md`.

### Phase 2 — staging verification assets (d34c6d7)

| Task | Status | Files / result and limits |
| --- | --- | --- |
| 1 Rollback-only role/JWT SQL suite | Done (asset); execution skipped | `supabase/tests/card_limits_staging.sql` documents placeholders/prerequisites and eight expected scenarios: debit/credit excess rejection, debit top-up, shared-card second member, near-limit upsert, legacy title edit, legacy increase rejection and insufficient destination-card move. BEGIN/ROLLBACK; only expected errors are caught. |
| 2 Two-session concurrency procedure | Done (asset); execution skipped | [staging-verification.md](staging-verification.md), section 5: simultaneous 60+60 against 100, A holds then commits, B must reject. Verification and narrowly scoped fixture cleanup included. |
| 3 Tickable staging checklist | Done (asset); execution skipped | Same guide covers backup restore, filename-ordered migrations, SQL/concurrency, restore over existing IDs, second member and dashboards, with expected results/evidence blanks. Plan ledger updated. |
| Conditional local PostgreSQL execution | Skipped | No psql/postgres/docker found on PATH. No SQL scenario was run locally or remotely; no database success output exists. |

### Phase 3 — migration-before-code rollout (18f7bc6)

| Task | Status | Files / result and limits |
| --- | --- | --- |
| 1 Missing-RPC fail-closed diagnostics and tests | Done | `services/creditCards.ts`, `lib/api/rpcMigration.mjs`, `lib/api/errors.ts`, `tests/rpc-migration.test.mjs`. PGRST202/42883 produce fixed migration metadata only; no wrong-balance fallback, no upstream payload/cause in the diagnostic. Request/render and weak per-request-client guards deduplicate application logging. Both codes/browser scope/fresh request/unrelated error paths tested offline. Phase 4 RPC uses the same helper. |
| 2 Deployment/rollback runbook and README link | Done (asset); execution skipped | [deploy-runbook.md](deploy-runbook.md), README and plan: app export plus Supabase backup/PITR -> staging migrations -> staging verification -> production migrations BEFORE code -> deploy -> smoke -> rollback/repair-forward. Exact function DROP signatures and caller dependencies included. |

Compatibility is qualified: Phase 1 replaces trigger behavior and can reject previously invalid writes; it is not behavior-neutral. Phase 4 adds only a read RPC and preserves existing interfaces. Old code remains dependent on its own prechecks and functions. Keep compatible functions installed on app rollback, and validate the specific rollback artifact in staging. No unconditional rollback guarantee is claimed.

### Phase 4 — dashboard SQL totals (6823ada)

| Task | Status | Files / result and limits |
| --- | --- | --- |
| 1 Read references and audit callers | Done | Reviewed `services/transactions.ts`, `services/cashForecast.ts`, `lib/utils/dashboardTransactions.ts`, both dashboards and all getTransactions call sites. Original transaction/forecast calculators remain unchanged. |
| 2 Stable invoker totals RPC | Partial | New `supabase/migrations/20261120130000_dashboard_totals.sql` and `services/dashboardTotals.ts`: all-time/range/personal cash, range income/expense/balance/counts, caller reconciliation cash/bank and optional top-four categories. Same scope/date precedence, numeric cents; no bypass of RLS. Real SQL/type/policy execution pending. |
| 3 Bound forecast input safely | Done (code); integration pending | New service pages one OR window: current-month transaction dates through today, OR recurring occurrence dates today through month end regardless of transaction date. This retains old/future-recorded prepayments. Original forecast arithmetic/scheduling stays in TS. Offline parity/paging/month-edge tests pass. |
| 4 Preserve selected range and cash semantics | Done (code); integration pending | Both dashboard pages use RPC totals while keeping selected-range rows on desktop and latest five on mobile. Desktop default cash uses default range; explicit URL dates use all-time cash. Mobile KPIs/categories stay all-time. Noncanonical dates still go to Postgres. |
| 5 Mandatory golden proof assets | Partial | 12 frozen TS goldens from 1,029 rows, including two modeled RLS-hidden rows, >1000-row history, decimals, travel amount precedence, top-ups, scope/date edges and category ties. Offline reference comparisons pass. `supabase/tests/dashboard_totals_staging.sql` is generated from the same fixtures/expected values; it was NOT executed. Live SQL/RLS equivalence remains a release gate. |
| 6 Other totals-only callers/dedupe replacement | Done (code); integration pending | Desktop/mobile dashboard old all-history dedupe replaced. Mobile wallet and both reconciliation pages use aggregate fields; reconciliation retains its distinct type-sign/top-up rule. Mobile budget keeps original TS sum but fetches only current month. `MobileDashboardInsights` gets four aggregate categories instead of history. |
| 7 Request/bundle evidence | Done locally; real latency skipped | Code-derived counts, synthetic transport output and actual post-build bundle script output recorded below and in [Phase 4 report](phase-4-dashboard-totals.md). No DB timings, EXPLAIN, provider or device measurements performed. |

Complete Phase 4 code/asset inventory: `services/dashboardTotals.ts`; `services/accountBalances.ts`; `app/(dashboard)/dashboard/page.tsx`; `app/mobile/dashboard/page.tsx`; `app/mobile/wallet/page.tsx`; `app/(dashboard)/credit-cards/page.tsx`; `app/mobile/credit-cards/page.tsx`; `app/mobile/budget/page.tsx`; `components/mobile/MobileDashboardInsights.tsx`; the new dashboard migration and SQL test; `tests/dashboard-totals.test.mjs`; `tests/dashboardTotalsFixtures.mjs`; `tests/fixtures/dashboard-totals-golden.json`; `tests/generate-dashboard-staging.mjs`; `tests/measure-dashboard-transport.mjs`. Documentation changes: README, staging/deploy guides, `docs/phase-3-performance.md` follow-up, `docs/phase-4-dashboard-totals.md` and `docs/superpowers/plans/2026-11-21-dashboard-sql-totals.md`.

Deliberately retained/skipped: raw IEEE sum equality is not claimed; approved proof compares money to two decimals. Existing calculators remain references. Transaction/review/trip/AI callers that need individual rows are not replaced by aggregates. Forecast itself is not rewritten into SQL. No atomic backup-restore rewrite, baseline/RLS invention, provider changes or unrelated data-model changes were attempted.

### Phase 5 — this final report

**Done:** `docs/round2-report.md` records per-task state, exact file inventories, executed vs written-only work, test counts, performance evidence and human release gates. This phase changes documentation only.

## What was executed vs only written

| Work | Execution/evidence |
| --- | --- |
| Local source reads, grep, diffs, branch isolation and migration-history inspection | Executed; checked phase commits/file inventories. Only new migrations 20261120120000 and 20261120130000 were added in Round 2. |
| Offline lint, TypeScript, node tests and dummy-config Next build | Executed after each implementation phase; counts below. Build uses Next.js 16.4.6/Turbopack and next.config.js. |
| Fake API/RPC and source guards | Executed without network; they validate handler/reference/error paths and source invariants, not a real SQL engine. |
| Fresh independent read-only review | Executed for each implementation phase; no important defect reported. Review did not run SQL. |
| Client bundle and synthetic JSON measurements | Executed locally after build; values below. |
| SQL migration/test files and rollout/concurrency instructions | Written/reviewed only; no local or Supabase SQL execution. |
| Staging/production backups, live RLS/member tests, HTTP restore, concurrency, device smoke, migration apply, deployment, push | Not executed. Checklist boxes intentionally remain unmarked. |

## Test counts and final checks

| Checkpoint | npm test result | Other required checks |
| --- | --- | --- |
| Round 2 starting point | 63 pre-existing offline tests | Inherited clean baseline; not a claim of DB verification. |
| Phase 1 | 76/76 (13 added) | lint, tsc and dummy-config build passed. |
| Phase 2 | 76/76 (no new runtime tests) | lint, tsc and dummy-config build passed. |
| Phase 3 | 84/84 (8 added) | lint, tsc and dummy-config build passed. |
| Phase 4 | 105/105 (21 added) | lint, tsc and dummy-config build passed; bundle script executed. |
| Phase 5 final recheck | PASS, 105/105 | npm run lint, npx tsc --noEmit and dummy-config npm run build passed again; post-build bundle values are unchanged. |

Separately executed `node tests/future-money-plans.test.mjs`: **9/9 PASS**. These are already included in the 105-test suite, not nine additional unique tests. `git ls-files` returned no committed demo startup script or Playwright config matching the documented names.

Build environment for verification: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`. This checks compilation/static build paths, not connectivity to a real project. Existing Node typeless-package warnings remain; no package/module-mode change was made just to hide them.

## Performance evidence

P(n)=floor(n/1000)+1 for unlimited reads, including an empty terminal page at an exact multiple; A=all scope rows, R=selected range, F=bounded forecast rows. Desktop before Round 2 Phase 4 already used the one-read dedupe; do not report it as three independent history reads.

| Transaction/totals requests only | Before Phase 4 | After |
| --- | --- | --- |
| Desktop, canonical dates | P(A) | P(R)+P(F)+1 RPC |
| Desktop, noncanonical dates | P(A)+P(R) | P(R)+P(F)+1 RPC |
| Mobile dashboard | P(A) | 1 recent + P(F)+1 RPC |
| Wallet / card reconciliation | P(A) | 1 RPC |
| Mobile budget | P(A) | P(current-month rows) |

For A=10,000, R=1,200 and F=100: desktop transaction/totals requests 11 -> 4, mobile 11 -> 3. Small histories can increase 1 -> 3, so lower latency is not universally guaranteed. Ancillary data/auth request assumptions and approximate whole-page counts are in the Phase 4 report; they are reasoned from code, not traced in production.

Executed `node tests/measure-dashboard-transport.mjs` on synthetic fixture JSON (no HTTP overhead/DB latency): desktop 404,116 -> 11,848 bytes, 97.1% reduction; mobile 400,693 -> 6,966, 98.3% reduction. This does not measure actual staging throughput or SQL execution speed.

Executed `node tests/measure-client-bundles.mjs` after Next build, baseline 18f7bc6 vs Phase 4. Every measured route entry is byte-identical:

| Route | Entry chunks before/after | Raw bytes before/after | Gzip bytes before/after |
| --- | --- | --- | --- |
| (dashboard)/dashboard | 9 / 9 | 449334 / 449334 | 126288 / 126288 |
| mobile/dashboard | 10 / 10 | 440277 / 440277 | 123133 / 123133 |
| (dashboard)/reports | 9 / 9 | 448513 / 448513 | 126565 / 126565 |
| mobile/reports | 10 / 10 | 451781 / 451781 | 126679 / 126679 |
| mobile/transactions | 10 / 10 | 457347 / 457347 | 129047 / 129047 |
| mobile/budget | 10 / 10 | 450413 / 450413 | 126287 / 126287 |

These entry bytes exclude lazy chunks, RSC payloads, API calls and database work. All-time aggregation still scans authorized rows in PostgreSQL; real query plans/latency remain unmeasured.

## Needs human

1. **Run staging verification and both SQL scripts.** Back up first using app export plus Supabase backup/PITR, restore the actual baseline into an isolated staging project, then complete [docs/staging-verification.md](staging-verification.md). Run filled copies of `supabase/tests/card_limits_staging.sql` and `supabase/tests/dashboard_totals_staging.sql`, the two-session concurrency procedure and restore-over-existing through /api/backup. Record expected vs observed outcomes; no agent SQL result exists. Check real numeric/enum/null constraints. If the dashboard fixture's intentional legacy NULL payment is disallowed by baseline constraints, stop and document a reviewed adaptation/inapplicable case; never weaken constraints/policies to pass.
2. **Apply migrations BEFORE deploying code.** Use [deploy-runbook.md](deploy-runbook.md): staging migration/test sign-off, then the same approved production migrations in filename order, then app deployment and smoke tests. New Round 2 migrations are 20261120120000 and 20261120130000; preceding 20261120090000, 20261120100000 and 20261120110000 migrations and older dependencies must already exist or be reviewed/applied first. Missing balance/totals RPCs deliberately fail closed. Verify dashboard/mobile, expense add/edit/delete, wallet top-up, receipt processing and rate-limit 429. Keep compatible functions installed for app-only rollback.
3. **Confirm the second-household-member scenario against the REAL credit_cards RLS policies.** Those deployed policies are not in this repository. Prove a member with card SELECT and transaction permission but no card UPDATE privilege can record a permitted shared expense, while inaccessible cards/other users' private data stay hidden. The advisory-lock repair removes a row-lock privilege requirement; it cannot grant visibility/write rights absent from actual policies. This remains a release blocker until observed in staging.
4. **Export and commit the base schema as an initial baseline migration.** Use the requested `supabase db dump --schema public` after selecting/verifying the intended source with the installed CLI's help/target options. Inspect the schema-only output, remove any sensitive configuration and preserve actual types, constraints, policies/grants and referenced helper definitions. Public-only output does not include private.is_household_member or every Auth/Storage dependency; capture required private helpers through the approved process too. Agree on a first-migration/bootstrap/history strategy before committing; do not edit current migration history or blindly replay a baseline over existing production tables. Current incremental migrations cannot bootstrap an empty project by themselves.
5. **Decide ON DELETE behavior for future_money_plans.user_id.** `20261119090000_future_money_plans.sql` declares `user_id uuid not null references auth.users(id)` with no explicit deletion action (default NO ACTION). Existing referenced plans can therefore block deleting an Auth user. Decide whether to keep/restrict deletion or cascade, including linked plan rows/audit-retention implications, and implement the approved decision in a NEW migration. No FK change was made here.
6. Confirm Vercel Function region is near the Supabase region; Singapore for both is typical for Thailand. No region/config was changed. Inspect real query plans, all-time aggregate costs, sorting/memory use and latency with representative histories.
7. Recover/confirm the missing demo/Playwright harness/config as needed and perform real signup/login-to-report plus iOS/Android smoke tests. Offline tests do not replace device/auth/provider verification. Review AI free-tier privacy/retention terms before enabling real receipt/financial-data processing.
8. Existing limits remain explicit: backup restore is non-atomic; legacy over-limit expense INSERT/upsert can be rejected; expense-trigger locking is not a universal invariant for top-up deletion, card-limit changes or every mutation path. Exercise restore batches/deadlock retry behavior under actual isolation settings and decide any broader rule changes separately.

**Release disposition:** source/local verification ready; database and deployment approval must wait for the above staging evidence. No live-equivalence, production-safety or device-test success is asserted by this report.
