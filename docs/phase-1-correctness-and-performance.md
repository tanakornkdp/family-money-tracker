# Phase 1 verification

Base: `e57ba210` from `codex/mobile-card-preview-20261116`.
Branch: `codex/review-fixes-and-perf`. Original dirty `master` checkout was preserved.

## Implemented

- Shared `.range()` pagination with fresh filtered queries and unique ordering. Unlimited transaction, contribution, recurring, receipt, report, notification, backup and related metadata lists no longer rely on PostgREST's first page. Explicit limits stay bounded. The existing money-plan link keyset pagination remains intact.
- `get_card_balances(excluded_transaction_id uuid default null)` calculates the specified debit/credit rules in SQL under the caller's RLS. The client receives card aggregates, not individual transactions. Missing aggregates fail closed rather than becoming a misleading zero.
- DELETE top-up validation delegates to the shared balance service excluding the deleted transaction. Its Thai insufficient-wallet message is unchanged.
- A new, unapplied migration installs a volatile, invoker BEFORE expense trigger. It locks the card row before reading balance, excludes `OLD.id` on update, and enforces wallet balance / credit limit minus debt. Known SQLSTATEs and exact message prefixes are mapped to existing Thai POST/PATCH responses. Unknown internal failures are not included in these API responses.
- No dependencies, visible layout, localization files, existing migrations, secrets, proxy, cache policy or Vercel configuration were changed. No real database was contacted. No rate limiter was introduced: the supplied scope contains only Phase 1.

## Offline evidence

Required Phase 1 gates passed: `npm run lint`, `npx tsc --noEmit`, and `npm run build` with `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`. The final production build completed in 18.46 seconds; this is a build check, not an app latency benchmark. Independent read-only review found no blocking issue within the expense-only trigger scope.

`node --test tests/*.test.mjs`: 35 tests passed. These cover pagination past 1000 rows, stable ordering/filter reapplication, explicit limits, later-page errors, the test-only TypeScript balance oracle, RPC shape, exclusion behavior, backup completeness, intentional validation messages, trigger-error mapping and safe error responses. Database access is mocked in service/handler tests; these are not live SQL or concurrency tests.

Synthetic transport benchmark (`tests/card-balance-perf.test.mjs`, 1000 transactions / 20 cards):

| Measure | Old row response | Aggregate response |
| --- | ---: | ---: |
| UTF-8 JSON bytes | 110001 | 1321 |
| JSON parsing, 1000 iterations, sample run | 303.60 ms | 3.26 ms |

Payload reduction: **98.8%**. Parsing times are machine-dependent. The measurement isolates client transfer/JSON work using equivalent synthetic balances; it does not measure SQL execution, network latency, real user load time, or claim those improved by the same percentage. Unlimited pagination deliberately performs additional requests to return correct totals.

## Needs human — do before rollout

1. Review/apply `20261120090000_card_balances_and_expense_limits.sql` through the normal migration process before deploying code that calls the new RPC. This task does not apply it.
2. Compare SQL and the test-only TypeScript oracle with real-role RLS fixtures: debit top-up expense/income, ignored debit income, credit repayment/overpayment, no transactions, exclusions, shared/hidden records, and more than 1000 rows. Verify PostgREST's configured max rows is at least the helper's page size (1000).
3. Run two concurrent expense writers against the same wallet/credit card at READ COMMITTED. Verify the waiting writer sees the committed balance and receives the intended error. Verify actual card SELECT/UPDATE grants and RLS permit the necessary `FOR UPDATE` lock. Repeat under the application's real isolation configuration and when moving a transaction between cards.
4. The requested trigger is expense-only. Top-up DELETE still has a separate API check followed by deletion; reducing/changing a top-up is also outside that expense-only enforcement. Those mutations can still race with spending and require a separately specified invariant/locking strategy if full balance safety across every mutation is intended.
5. Measure database plans/latency (`EXPLAIN ANALYZE` under actual roles), existing card/transaction indexes and client latency after migration. No index assumptions or production timing claims were made offline.
