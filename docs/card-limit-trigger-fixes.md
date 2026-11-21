# Card-limit trigger fixes — Phase 1 verification

Date: 2026-11-21. Branch: `codex/trigger-and-sql-totals`, created from `codex/review-fixes-and-perf` at `b1e7de5`.

The supplied attachment specifies Phase 1 only. This change repairs the card-limit trigger and PATCH precheck; it does not add dashboard SQL totals. Existing migrations, the multi-card aggregate RPC, provider logic, secrets, Vercel configuration and the real database are unchanged.

**Historical Phase 1 evidence: SQL WAS NOT EXECUTED** locally or against Supabase at that checkpoint. Round 3 now executes the real migration files in PGlite; see the follow-up below. No Supabase SQL execution has occurred. `Get-Command` found no `psql`, `postgres` or `docker` on PATH. SQL evidence here is source inspection and static regression checks, not a live concurrency/RLS test.

## Changes against the eight requirements

| Requirement | Implementation | Files / verification |
| --- | --- | --- |
| 1. Target UPDATE columns and return on unchanged values | New trigger is BEFORE INSERT OR UPDATE OF card_id, amount, type, category. The function also tests all four with IS DISTINCT FROM and returns before locking when unchanged. | `supabase/migrations/20261120120000_card_limit_trigger_fixes.sql`; migration text guard. SQL execution pending. |
| 2. Enforce only increasing expense exposure | Inserts that reach expense enforcement are checked. Updates check only card moves, conversion to expense, removal of top-up category, or amount increase. Metadata, equal and reducing edits skip balance enforcement even on legacy over-limit cards. Existing income/no-card/debit top-up exemptions remain. | New SQL plus `lib/validation/cardExposure.ts`; pure/API tests. |
| 3. Advisory lock instead of card write lock | Per-card `pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.card_id::text, 0))` precedes a plain RLS-visible card SELECT and balance read. No card row write lock or UPDATE privilege is requested by this trigger. Invisible cards keep P1003/CARD_NOT_AVAILABLE. | New SQL; static ordering/no-row-lock checks. Shared-card role execution still needs staging. |
| 4. Single-card aggregate | Added invoker `public.get_card_balance(p_card_id uuid, p_excluded_transaction_id uuid default null)`. Filters one card and preserves the old debit top-up / other expense / ignored ordinary income rules, and credit expense/income signs. Existing `get_card_balances` and its service remain unchanged. | New SQL; comparison with the original aggregate during independent source review. No database equivalence claim. |
| 5. Existing-id INSERT exclusion | After the advisory lock, an INSERT checks for an RLS-visible transaction with new.id and excludes that id from the balance. This avoids counting an existing near-limit row twice during ON CONFLICT restore. | New SQL; source guard checks ordering/exclusion. Real upsert/concurrency test pending. |
| 6. Errors, privileges and migration safety | P1001/P1002/P1003, exact prefixes and available-balance detail format are retained. Both functions are invokers with empty search paths, qualified tables/functions, PUBLIC/anon revokes and authenticated-only execute grants. The migration is append-only and re-runnable via CREATE OR REPLACE and DROP TRIGGER IF EXISTS. | New SQL only; `lib/validation/cardBalanceError.ts` unchanged; static privilege/error guards. |
| 7. Pure exposure helper and PATCH integration | PATCH uses `increasesCardExposure(current, next)`. Non-increasing edits still validate selected-card visibility using `getCreditCards`, but do not call `getCardsWithBalance`. Increasing edits retain existing balance checks and Thai errors. Other auth/input/update behavior is unchanged. | `lib/validation/cardExposure.ts`, `app/api/transactions/[id]/route.ts`; pure and route tests. |
| 8. Static migration regression guard | Checks the OF column list, unchanged-value guards, advisory locking before reads, single-card path, absence of card row write-lock syntax, unchanged error identifiers and restricted function grants. | `tests/card-limit-trigger-migration.test.mjs`. A text guard is not SQL execution. |

The single-card aggregate repeats the original CASE precedence and exclusion rule. COALESCE is a SQL expression; ordinary called functions (sum, hash, lock and JSON detail builder) are pg_catalog-qualified. All table/function references are schema-qualified.

## Test evidence

The legacy PATCH reproduction initially returned 400 instead of the expected 200 for metadata edits and amount reductions. Those cases now pass, including a negative debit wallet. New tests cover:

- No balance read on title/date/trip-link/category-only/equal-amount/reduced-amount edits.
- Card moves, income-to-expense and top-up-to-ordinary-expense transitions still enforce, even when the new amount is smaller.
- Existing Thai debit/credit failures, invalid-card visibility and invalid-input behavior remain.
- Pure helper does not mutate its inputs; income/no-card writes are not expense candidates.
- Migration source properties and grants described above.

`tests/transaction-api.test.mjs` retains its original four assertions/tests; its PATCH error-mapping fixture now changes amount 100 to 101 so it exercises the increasing-exposure path. It also imports/stubs the real pure helper. The other original tests remain in place.

| Required check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | PASS, 76/76: original 63 plus 13 new tests |
| `npm run build` | PASS with NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy |

Build uses Next.js 16.4.6/Turbopack and `next.config.js`, with 54 static-page work units generated. Existing Node typeless-package warnings remain. Tests are offline with stubbed API/database boundaries. Independent read-only review found no blocking or important issue; it also did not execute SQL.

## Needs human

1. Back up and apply the new migration to staging after its preceding migrations; no SQL has been run here. The missing baseline schema/private helpers and deployed policies must be present. Keep the original migration history unchanged.
2. Compare single-card results to `get_card_balances` for debit top-up income/expense, ordinary debit income, credit repayments/overpayment, empty cards, exclusions and more than 1,000 transactions. Check that hidden cards/transactions remain hidden by actual RLS.
3. Test a household member with card SELECT but no card UPDATE permission. Confirm permitted transaction inserts/updates work and invisible cards still produce CARD_NOT_AVAILABLE. The trigger cannot grant transaction permissions that the deployed policies themselves deny.
4. Exercise title/trip-only updates, explicit same-value column updates, amount reductions on already-over-limit rows, all four exposure-increase transitions, same-ID near-limit ON CONFLICT restores and two concurrent writers/upserts. Verify fresh READ COMMITTED visibility after the advisory wait. Test actual isolation settings and multi-card restore batches for deadlocks/retry behavior.
5. Every INSERT still follows the requested insertion rule, including the BEFORE INSERT part of an upsert. A no-op restore of an already-over-limit expense can therefore still be rejected; it is not silently treated as a non-increasing UPDATE. Decide separately if that broader restore exception is wanted.
6. Advisory locks are cooperative and this trigger remains expense-scoped. Top-up deletion/reduction, card-limit edits and other mutation paths are not turned into a universal balance invariant by this patch. Existing restore remains non-atomic. No new SQL-totals phase was supplied in the attachment.

No branch was pushed, merged or deployed by this repair. The source-level change reduces the trigger aggregate to one card, and reduces normal non-increasing PATCH prechecks from card-list plus balances reads to the card-list read only. No production timing or query-plan improvement was measured.

PostgreSQL behavior references: [column-specific CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html) and [transaction advisory locks](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS). These references support the design, not a claim that this migration was executed.

## Round 3 follow-up: real SQL tests and documented edge cases

The original phase evidence above predates the PGlite harness. Round 3 now executes all migration files and trigger/golden/quota tests in **PGlite (Postgres/WASM)** with a deliberately incomplete test baseline. This is not execution against Supabase and does not certify production policies, constraints, roles, multi-connection concurrency or /api/backup restore. See tests/sql-card-limits.test.mjs and the round3 report.

### NULL credit_limit: current DB/app disagreement (no behavior change)

If the actual schema permits a legacy credit_limit NULL, SQL computes available = NULL - debt. The trigger's amount > available expression is NULL, so it never raises a credit-limit exception; new expenses and increases are effectively unlimited. The PGlite test pins that an expense1000 and increase2000 both pass.

services/creditCards.ts getCardsWithBalance instead uses JavaScript credit_limit - balance. JavaScript coerces null to0, so available is0 - debt; POST /api/transactions and increasing-exposure PATCH /api/transactions/[id] reject an expense when card.available < amount. With debt0, positive spending is rejected; with debt2000, available is-2000; an overpayment could yield positive available. Thus app and DB do NOT agree on NULL. The same test feeds real PGlite rows through the actual TS service and checks that app precheck predicate; it does not invoke HTTP routes or change their behavior. TS declares credit_limit as number and new-entry validation is separate; this is a legacy-data edge, not proof NULL exists in production.

**Needs human:** decide: NULL limit = unlimited or rejected. Check actual nullability and legacy rows; choose one consistent rule and add a NEW reviewed migration/API validation change if required. No rule or existing migration is changed for this edge case here.

### Restore into an already over-limit card

INSERT ... ON CONFLICT DO UPDATE fires BEFORE INSERT enforcement before its eventual UPDATE. A same-ID expense consuming exactly the whole valid balance passes because its existing row is excluded. A legacy over-limit expense150 on limit100 still fails when restored/upserted, even if the eventual UPDATE would be a no-op. Separate isolated PGlite tests pin BOTH outcomes; no fixture pollution or special restore exemption is used. Backup restore itself is still non-atomic and must be exercised through /api/backup in staging.

## Known limitations

get_card_balance and get_card_balances are security invoker and count only transactions visible to the caller under RLS. On a shared credit card, if a member can see the card but cannot see another member's expenses on it, debt/used limit is undercounted and available credit is overstated. On a debit card, omitted expenses can overstate funds while omitted top-ups can understate them. Advisory locking serializes participating checks but does not expand SELECT visibility.

The real credit_cards and transactions policies are NOT in the repo and decide these results. Confirm that every member permitted to spend sees all transactions needed for a correct card balance; also verify unauthorized rows stay hidden. Do not change a function to security definer just to bypass a missing policy. The stub does not model these production policies; no illustrative invented RLS test is presented as proof. PGlite SET ROLE/grant checks only test the local test roles and supplied migration grants.
