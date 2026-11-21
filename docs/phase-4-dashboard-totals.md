# Phase 4 — dashboard SQL totals

Prepared 2026-11-21 on codex/trigger-and-sql-totals, base 18f7bc6. Local preparation only; no real database, migration, deployment, secret or Vercel setting was changed.

## Task status

| Task | Status / evidence |
| --- | --- |
| 1 Audit | Done: transactions.ts, cashForecast.ts, dashboardTransactions.ts, both dashboards and all getTransactions call sites inspected. Totals-only callers found: mobile wallet, desktop/mobile card reconciliation, mobile budget. |
| 2 RPC | Prepared: new 20261120130000_dashboard_totals.sql, stable security invoker, empty search_path, authenticated-only execution, no RLS/policy change. Numeric sums rounded once to 2 decimals. |
| 3 Forecast | Done in code: paged OR of transaction date [month start,today] and recurring occurrence date [today,month end]. The latter ignores transaction date, retaining prepayments recorded arbitrarily earlier/later. Original forecast calculator unchanged. |
| 4 Selection | Done: desktop still fetches all selected-range rows for charts/list/breakdowns. Default cash = range; any truthy explicit from/to = all-time cash. SQL/PostgREST retain date parsing (including noncanonical URL bounds), no JS date reinterpretation. Mobile had no date range: all-time KPIs/categories remain all-time, recent list limited to five. |
| 5 Proof assets | 12 frozen TS-produced golden scopes, 1,029 source rows (including two RLS-hidden rows), cents, top-ups, trip amount precedence, inclusive/empty/reversed/one-sided dates and category float ties. Offline TS reference checks pass; generated rollback-only SQL contains the same seeds/expected values. Actual SQL/RLS equivalence is NOT executed/proven here; mandatory staging gate. |
| 6 Other callers | Wallet uses RPC cash. Both reconciliation pages use RPC caller-owned cash/bank totals preserving their own type-sign rule (which differs for income top-ups). Mobile budget bounds its existing paged query to this month and keeps original TS sum, including top-ups. |
| 7 Verification | lint, tsc, 105 offline tests and dummy-config production build passed; client entry bundle output below. Independent review is recorded in the implementation plan. |

## Files changed

- services/dashboardTotals.ts and the new migration: aggregate boundary, response validation, missing-RPC diagnostics, bounded forecast query.
- app/(dashboard)/dashboard/page.tsx, app/mobile/dashboard/page.tsx and components/mobile/MobileDashboardInsights.tsx: selected/recent rows plus SQL totals/categories.
- app/mobile/wallet/page.tsx, both credit-cards pages and services/accountBalances.ts: totals-only readers/reconciliation adapter. app/mobile/budget/page.tsx: current-month query bounds.
- tests/dashboard-totals.test.mjs, dashboardTotalsFixtures.mjs, fixtures/dashboard-totals-golden.json, generate-dashboard-staging.mjs, measure-dashboard-transport.mjs and supabase/tests/dashboard_totals_staging.sql: offline proof, reproducible staging asset and synthetic transport evidence.
- README, staging/deploy guides, historical performance follow-up and this report/implementation plan: rollout and evidence. No existing migration or TS transaction/forecast reference source was changed.

## Rules preserved

- Scope matches getTransactions: nonempty householdId takes precedence over personalOnly; empty/no userIds adds no user filter; dates inclusive. RLS still limits all rows. Personal mobile explicitly passes user_id=caller plus household_id IS NULL. Desktop default list includes all RLS-visible scopes, while its unfiltered forecast uses only caller personal cash/activity. Selecting members without a household preserves the former broader member scope.
- KPI income/expense/count exclude category เติมเงินวอลเล็ต for BOTH transaction types, regardless of payment method; balance = income minus expense. Counts are not inferred from sums.
- Cash includes null payment_method as cash, excludes all non-cash methods, subtracts every cash top-up BEFORE checking type, otherwise income adds/expense subtracts. It uses amount, not travel_amount_thb or original currency.
- Reconciliation is intentionally different: own rows across personal/shared scopes, sign based only on income/expense, separately for cash/null and bank_transfer. It keeps its Thai labels and existing reference function.
- Mobile category insights include all-time expense top-ups. Ordered float8 additions and first-seen ties mirror the old JS Map/sort rather than switching ranking to rounded totals. This optional branch returns only four entries; disabled branch returns [].
- Forecast includes every row needed for variable current-month estimates and paid occurrence keys. Scheduling/availability/estimation logic is unchanged. Tests compare full forecast output and cents-normalized balance/results, month edges, leap February, and >1000 bounded rows. Requests remain paged and ordered date/created_at/id.
- Raw JS binary sum equality is deliberately NOT claimed (0.1+0.2). User-approved monetary comparison is to 2 decimals. Original calculateKpis/calculateCashBalance/calculateMonthEndForecast/selectDashboardTransactions remain as references; the original float-difference regression still passes.

## Fail-closed rollout

getDashboardTotals uses the Phase 3 migration diagnostic helper for PGRST202/42883, logging only the fixed 20261120130000 migration message once per request, and never fetching all history or inventing zeros on failure. Both codes, duplicate logs, malformed/missing result rows and unrelated DB errors have fake-client tests.

Apply migration BEFORE deploying callers, including wallet/reconciliation. Run [staging verification](staging-verification.md) and [deploy runbook](deploy-runbook.md). Phase 4 adds a read RPC only, preserving old readers; leave it installed during app rollback. The runbook includes its exact optional DROP signature, only after all current/cached callers are removed.

## Estimated Supabase request counts

These are code-derived PostgREST requests, not network timings. Let P(n)=floor(n/1000)+1 for unlimited paged reads (an exact multiple needs an empty terminal page). A=all visible scope rows; R=selected-range rows; F=forecast OR-window rows. Recent limit=5 costs one request. Unchanged services have their own pagination.

| Transaction reads / totals only | Before Phase 4 | After |
| --- | --- | --- |
| Desktop, canonical dates | P(A), the existing single-read dedupe (NOT three reads) | P(R)+P(F)+1 aggregate RPC |
| Desktop, noncanonical dates | P(A)+P(R) | P(R)+P(F)+1 |
| Mobile personal/group | P(A) | 1 recent + P(F)+1 aggregate |
| Mobile wallet | P(A) | 1 aggregate |
| Desktop/mobile reconciliation | P(A) | 1 aggregate |
| Mobile budget | P(A) | P(current-month rows), existing TS total |

Example long history A=10,000, R=1,200, F=100: desktop transaction/totals requests 11 -> 4; mobile 11 -> 3. With fewer than 1000 rows in each set, desktop/mobile increase 1 -> 3 requests, trading constant aggregate/bounded payloads for history transport; no unconditional latency improvement is claimed.

For populated personal dashboards with each ancillary collection <1000, cards present, trips enabled: unchanged desktop page/layout data queries add 7 (settings, households, icons, card metadata, card balances, recurring, recent names); household view adds about 3 for breakdown names/member list/profiles. Mobile adds 6 for personal or 4 for household (cards skipped). One cached server getUser call is additional; proxy getClaims may be local or may need network depending on signing keys. Thus the long-history personal examples are roughly desktop 19 -> 12 including auth, mobile 18 -> 10 including auth. Excludes client-side notification/lock requests and provider calls; empty lists/disabled cards and page sizes change totals.

Synthetic transport check: `node tests/measure-dashboard-transport.mjs` compares JSON projections of the frozen 1,029-row fixture, not real DB/network latency. Desktop fixture rows: 1,027 history -> 17 selected + 11 forecast plus aggregate, 404,116 -> 11,848 JSON bytes (97.1% less). Mobile personal: 1,019 history -> 5 recent + 11 forecast plus aggregate, 400,693 -> 6,966 bytes (98.3% less). HTTP headers/compression, concurrent-write snapshots and server timings are not measured.

## Client build measurements (bytes)

Command: node tests/measure-client-bundles.mjs after dummy-config next build, before source edits at 18f7bc6 and after Phase 4. Exact output values:

| Route | Entry chunks before/after | Raw before/after | Gzip before/after |
| --- | --- | --- | --- |
| (dashboard)/dashboard | 9 / 9 | 449334 / 449334 | 126288 / 126288 |
| mobile/dashboard | 10 / 10 | 440277 / 440277 | 123133 / 123133 |
| (dashboard)/reports | 9 / 9 | 448513 / 448513 | 126565 / 126565 |
| mobile/reports | 10 / 10 | 451781 / 451781 | 126679 / 126679 |
| mobile/transactions | 10 / 10 | 457347 / 457347 | 129047 / 129047 |
| mobile/budget | 10 / 10 | 450413 / 450413 | 126287 / 126287 |

No measured entry bundle increased. A preliminary shared getTransactions forecast option added 73 gzip bytes to mobile budget; it was removed before completion. The bounded forecast query now lives only in its new service; getTransactions is unchanged. Entry bundle sizes are not total chart chunks, RSC transfer or database latency.

## Remaining / Needs human

- Apply new migration to staging after backup; run supabase/tests/dashboard_totals_staging.sql with actual identities, inspect baseline constraints/grants, then smoke both dashboards, wallet/reconciliation/budget. No local psql/postgres/docker is available; SQL syntax/types/RLS and real performance are not certified by offline tests. The intentionally legacy NULL payment fixture may be inapplicable if the real baseline disallows NULL; stop/document a reviewed adaptation, never weaken constraints to pass.
- Measure EXPLAIN ANALYZE/DB latency on staging. All-time aggregation still scans authorized rows inside Postgres; category ordering can sort/aggregate them. This change removes unbounded history transport, not all DB work.
- Other getTransactions callers keep rows intentionally: full transaction pages, review/duplicate detection, trip detail, monthly AI category analysis. No unproven SQL substitutions were made there. Forecast computation stays in TS; only its input window and aggregate current balance changed.
- Existing broader human prerequisites remain: baseline schema export, backup restore/concurrency testing, function/DB region proximity, future-plan user FK deletion decision, demo/Playwright harness recovery and free-tier privacy review. No push/deploy or real DB execution was performed.
