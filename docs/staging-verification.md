# Staging verification — card limits

Prepared 2026-11-21 for `codex/trigger-and-sql-totals`, after the Phase 1 repair `fa9a9c0`.

**Human execution required. No SQL scenario in this document or `supabase/tests/card_limits_staging.sql` has been executed by the coding agent.** `psql`, `postgres` and `docker` were not found on PATH; no scratch or real database was contacted. Offline application checks are recorded at the end and are not a substitute for these tests.

Operator: ____________________  Date/time: ____________________

Staging project/ref: ____________________  App origin: ____________________

Tested commit / migration head: ____________________  PostgreSQL version: ____________________

Result convention: tick only after observing the expected result; otherwise record **FAIL** or **BLOCKED** and why. Do not weaken RLS, disable triggers or grant card UPDATE access just to produce a passing result. Do not commit populated SQL, backup files, passwords, connection strings or tokens.

## 1. Restore a backup into an isolated staging environment

- [ ] Confirm the app and both database sessions target **staging**, not production. Use operator-managed credentials/services and a fresh connection. Separate/suspend external webhooks, real notifications and AI integrations before exercising staging fixtures.
  - Expected: the target project and app environment are verified by the owner; test writes cannot reach production or external production integrations.
  - Actual / evidence: ____________________
- [ ] Preserve a recoverable backup before migrations, using the Supabase Dashboard/project backup or authenticated `/api/backup` as appropriate. Restore the full project/database baseline into staging through the approved project procedure. Reserve application-only merge/restore verification for step 6 after the repaired trigger is installed.
  - Expected: the baseline public/private schema, required functions (including `private.is_household_member`), grants/policies and necessary Auth/Storage state are available. The repository's incremental migrations alone cannot bootstrap this baseline.
  - `/api/backup` is an application-data export, not a full schema/Auth/household backup. Restore rewrites user_id, strips household links on relevant rows, caps each table at 10,000 rows and is non-atomic. Create staging users/memberships separately when using it; do not assume original group relationships survived.
  - Actual / backup reference (no secret URL): ____________________

## 2. Apply pending migrations in order

- [ ] Compare staging migration history to the repository and apply only unapplied files with the approved migration runner. Keep historical files unchanged.
  - Expected: required baseline/older future-plan migrations are present, followed by:
    - `20261120090000_card_balances_and_expense_limits.sql`
    - `20261120100000_api_rate_limits.sql`
    - `20261120110000_performance_indexes.sql`
    - `20261120120000_card_limit_trigger_fixes.sql`
  - Expected: `public.get_card_balances` remains available, `public.get_card_balance` is available to authenticated, and `enforce_card_expense_limit` is installed for INSERT or UPDATE OF card_id, amount, type, category. No unexpected grants to anon/PUBLIC. Large-table indexes follow the migration's concurrent-build guidance where needed.
  - Actual / migration output reference: ____________________

## 3. Prepare dedicated fixtures

Use real **staging** Auth accounts. Do not insert fake auth.users with guessed required columns. The connection running the SQL asset must be an approved staging operator permitted to `SET LOCAL ROLE authenticated`; the statements themselves run under that role and actual RLS.

Replace every matching placeholder in a local copy of the SQL asset **outside the checkout**. IDs below are placeholders, not UUIDs to execute unchanged.

| Placeholder | Row(s) to create first / required initial state |
| --- | --- |
| `<OWNER_USER_ID>` | Real staging owner account. |
| `<MEMBER_USER_ID>` | Different real staging account, ordinary member of the same household. |
| `<HOUSEHOLD_ID>` | Household plus both membership rows; use the real application/group setup. |
| `<DEBIT_CARD_ID>` | Owner's dedicated debit card, **no transactions**, balance 0. |
| `<CREDIT_CARD_ID>` | Owner's dedicated credit card, limit 100, **no transactions**. |
| `<SHARED_DEBIT_CARD_ID>` | Owner's dedicated empty debit card. Member must be allowed to SELECT it and household transactions on it, and insert their own household expense, but must not be allowed to UPDATE this card. |
| `<LEGACY_CREDIT_CARD_ID>` | Owner's dedicated credit card with limit 50 and exactly the one expense below, debt 100. |
| `<LEGACY_TRANSACTION_ID>` | Owner's credit expense 100 on the legacy card. Create while its limit is 100, then lower the limit to 50 through the approved staging fixture workflow. If that is blocked by other deployed rules, obtain an approved legacy fixture rather than disabling protections. |
| `<MOVE_DESTINATION_CARD_ID>` | Another owner debit card, empty and distinct from all other card IDs. |

- [ ] Check fixture ownership, distinct IDs, balances and row counts as the operator, including any rows hidden from the simulated user. Create valid `Other` expense and `เติมเงินวอลเล็ต` category rows if required by the baseline schema.
  - Expected: five dedicated cards match the table above, no unrelated rows, the legacy row has amount 100, and both users can log into staging. Note its original title for rollback verification.
  - Actual / legacy original title (fixture only): ____________________
- [ ] Confirm the shared-card permission contract with the actual grants/policies.
  - Expected: member sees the card and shared top-up/expense rows but cannot edit its metadata. `credit_cards.household_id` is **not** assumed by these assets: that column is absent from the repository's card type. If actual sharing policies do not support the contract, mark **BLOCKED** and obtain the policy decision; do not invent a column/policy.
  - The SQL test probes a no-op name UPDATE; separately inspect column-specific privileges if applicable. RLS can deny UPDATE with zero affected rows or SQLSTATE 42501.
  - Actual: ____________________

## 4. Run the rollback-only SQL suite

Prefer psql with an operator-managed staging connection service; it stops at the first unexpected error. The SQL file itself is also SQL Editor compatible when run **in full**. Do not use echo-all/echo-queries flags or publish filled claim/connection data.

```text
psql "service=<STAGING_SERVICE>" -v ON_ERROR_STOP=1 -f "<PATH_TO_POPULATED_SCRIPT>"
```

The script starts BEGIN, sets a local empty search_path and row_security, switches to authenticated and sets `request.jwt.claims` for owner/member. Expected denials are caught only by the requested SQLSTATE and exact trigger message. Unexpected errors remain failures. All SQL test writes end in **ROLLBACK**; if interrupted/erroring, explicitly ROLLBACK or close the connection before retrying.

- [ ] Preflight/setup output passes under authenticated owner, not the operator's bypass role.
  - Expected: empty cards validated; temporary debit/shared balances become 100, move destination 10, credit debt 80 with limit 100. New test transaction IDs are generated, not reused from real data.
  - Actual: ____________________

| Tick | Scenario | Expected result | Actual / error code |
| --- | --- | --- | --- |
| [ ] | 1. Owner debit expense 101 against balance 100 | Rejected: P1001 / CARD_DEBIT_INSUFFICIENT. Balance remains 100. | ____________________ |
| [ ] | 2. Credit expense 21 against available 20 | Rejected: P1002 / CARD_CREDIT_INSUFFICIENT. Debt remains 80. | ____________________ |
| [ ] | 3. Debit wallet top-up 25 | Pass; debit balance becomes 125. | ____________________ |
| [ ] | 4. Member records shared expense 30, without card UPDATE access | Pass; member owns the new household transaction; their visible shared balance becomes 70. The prior no-op card update was denied. | ____________________ |
| [ ] | 5. Upsert existing credit expense 80 with the same ID | Pass; exactly one row, restored title, debt still 80, available 20. | ____________________ |
| [ ] | 6. Edit title of legacy expense 100 with card limit 50 | Pass; exactly one row updated, debt remains 100. | ____________________ |
| [ ] | 7. Increase legacy expense 100 to 101 | Rejected: P1002 / CARD_CREDIT_INSUFFICIENT. Amount remains 100. | ____________________ |
| [ ] | 8. Move expense 40 to debit card holding 10 | Rejected: P1001 / CARD_DEBIT_INSUFFICIENT. Expense stays on source; source/destination remain 85/10. | ____________________ |

- [ ] Confirm all eight `PASS scenario N` notices and final ROLLBACK, with no swallowed unexpected error.
  - Expected: all temporary seed/test transactions disappear; non-legacy cards return to their empty initial state and the legacy title/amount are unchanged. Role/claims revert too. Rollback covers database changes, not arbitrary external side effects of any custom integration.
  - Actual: ____________________

## 5. Two-psql-session concurrency procedure

This is a **separate test** from the rollback-only suite. The winning expense must COMMIT so the waiting writer can see it. It deliberately leaves one synthetic expense until the scoped cleanup below. Do not run against an existing real card.

### Preparation

- [ ] Create a sixth dedicated shared debit card `<CONCURRENCY_CARD_ID>` with one committed top-up of 100 and no other transactions. Both users must see the funding and each other's household expenses. Use `debit_card` payment method for the linked top-up and the actual household ID. Create it through the approved staging fixture workflow.
  - Expected: both users independently observe `public.get_card_balance('<CONCURRENCY_CARD_ID>'::uuid, null) = 100`. They can each insert their own household expense. Assign two unused UUIDs `<SESSION_A_TRANSACTION_ID>` and `<SESSION_B_TRANSACTION_ID>`. No other writer uses this fixture.
  - Actual / initial balance: ____________________
- [ ] Open **two separate psql connections** to that same staging DB. Record `SHOW default_transaction_isolation;`. Use the explicit READ COMMITTED blocks below; if deployment uses another isolation level, test that separately and record serialization errors rather than assuming equivalence.
  - Expected: two independent sessions, no pre-existing transaction. A timeout/deadlock is not the expected balance rejection.
  - Actual / default isolation: ____________________

### Session A — insert 60, hold the transaction open

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE authenticated;
SET LOCAL statement_timeout = '60s';
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"<OWNER_USER_ID>"}', true);
INSERT INTO public.transactions
  (id, user_id, household_id, title, amount, type, category, date, payment_method, card_id)
VALUES
  ('<SESSION_A_TRANSACTION_ID>'::uuid, '<OWNER_USER_ID>'::uuid, '<HOUSEHOLD_ID>'::uuid,
   'Staging concurrency A', 60, 'expense', 'Other', CURRENT_DATE, 'debit_card', '<CONCURRENCY_CARD_ID>'::uuid);
-- STOP HERE. Do not COMMIT or ROLLBACK yet.
```

Expected: INSERT succeeds for A and holds the advisory transaction lock. A sees balance 40 within its own transaction.

### Session B — start the overlapping expense 60

In B, optionally use psql `\set VERBOSITY verbose` to see SQLSTATE. Do not print/record authentication tokens.

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE authenticated;
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '45s';
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"<MEMBER_USER_ID>"}', true);
INSERT INTO public.transactions
  (id, user_id, household_id, title, amount, type, category, date, payment_method, card_id)
VALUES
  ('<SESSION_B_TRANSACTION_ID>'::uuid, '<MEMBER_USER_ID>'::uuid, '<HOUSEHOLD_ID>'::uuid,
   'Staging concurrency B', 60, 'expense', 'Other', CURRENT_DATE, 'debit_card', '<CONCURRENCY_CARD_ID>'::uuid);
```

Expected: B is still waiting, with no successful INSERT result/prompt, while A is uncommitted. Confirm the overlap; starting B only after A commits does not test serialization. Commit A promptly before B's lock timeout.

### Back in A — release the winner

```sql
COMMIT;
```

Expected: A commits. B unblocks and fails with **P1001 / CARD_DEBIT_INSUFFICIENT**, because its available balance is now 40. In B, then run:

```sql
ROLLBACK;
```

Both inserts returning success is a **FAIL**, even if one is later rolled back. Do not count SQLSTATE 55P03 (lock timeout), 40P01 (deadlock), missing permissions or missing schema as the required P1001 rejection. If A is rolled back instead of committed, B may legitimately pass; that is not this test.

### Verify and clean up

In A, after both transactions have finished:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"<OWNER_USER_ID>"}', true);
SELECT pg_catalog.count(*) AS committed_test_expenses
FROM public.transactions
WHERE card_id = '<CONCURRENCY_CARD_ID>'::uuid
  AND id IN ('<SESSION_A_TRANSACTION_ID>'::uuid, '<SESSION_B_TRANSACTION_ID>'::uuid);
SELECT public.get_card_balance('<CONCURRENCY_CARD_ID>'::uuid, null) AS final_balance;
ROLLBACK;
```

Expected: count **1**, balance **40**, exactly one committed expense and one P1001 rejection.

- [ ] Confirm B waited while A held the open transaction: ____________________
- [ ] A success / B P1001 / committed count 1 / balance 40: ____________________

As the approved **staging fixture operator**, after recording a passing result, delete only the winner's fixture ID. This cleanup intentionally COMMITs. If the test failed, inspect before cleanup instead of erasing the evidence.

```sql
BEGIN;
DO $cleanup$
DECLARE affected integer;
BEGIN
  DELETE FROM public.transactions
  WHERE card_id = '<CONCURRENCY_CARD_ID>'::uuid
    AND id IN ('<SESSION_A_TRANSACTION_ID>'::uuid, '<SESSION_B_TRANSACTION_ID>'::uuid)
    AND user_id IN ('<OWNER_USER_ID>'::uuid, '<MEMBER_USER_ID>'::uuid)
    AND title IN ('Staging concurrency A', 'Staging concurrency B');
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Cleanup expected exactly one test expense; inspect before retrying'; END IF;
END;
$cleanup$;
COMMIT;
```

- [ ] Verify fixture balance returns to 100. Repeat with B/member going first and A/owner waiting, using fresh IDs. Expected again: one success, one P1001 rejection, count 1 and balance 40 before cleanup. This reverse run also checks that owner sees the member's committed shared expense.
  - Actual / cleanup / reverse-run result: ____________________

## 6. Restore over existing data through /api/backup

Use a **separate staging restore account**, with one credit card limit 100 and one ordinary expense 80, no over-limit legacy rows and no receipt files needed for this case. The owner account used above deliberately contains a legacy over-limit expense, so reusing its full backup would mix two different cases: every INSERT part of an upsert still enforces the limit and can reject an already-over-limit no-op restore.

- [ ] Sign into the staging app as the restore account. Capture the card ID, transaction ID, amount/debt 80, available 20 and row counts. Download through Settings backup (authenticated GET `/api/backup`). Keep the file private/outside git.
  - Expected: HTTP 200, valid backup format/version; IDs match the existing rows. This is not a fresh-ID import test.
  - Actual: ____________________
- [ ] Restore that same unchanged backup via the existing Settings restore control; inspect Network for authenticated POST `/api/backup`. The UI sends the backup object as JSON, not a multipart file. Repeat once after a successful response.
  - Expected: both POSTs return HTTP 200 with `{ "restored": true }`; same card/transaction IDs, exactly one expense, debt 80 and available 20 after refresh. No double-count limit rejection or duplicate rows.
  - Actual / statuses/counts: ____________________
- [ ] If any restore fails, stop and inspect already-restored tables before retrying.
  - Expected: operators treat restore as merge-only/non-atomic, not an all-or-nothing rollback. For a deliberate legacy-over-limit restore, record the current expected limit rejection separately; do not call it a regression of the near-limit case.
  - Actual: ____________________

## 7. Household second-member app/API check

Use a dedicated shared funded card/account state; the SQL suite's temporary shared seed was rolled back.

- [ ] Sign into the staging mobile app as the ordinary second member and record a household expense against a visible shared card with sufficient balance. Confirm their account cannot edit that card's metadata; do not grant UPDATE as a workaround.
  - Expected: transaction POST succeeds, no CARD_NOT_AVAILABLE caused by a card write lock, correct remaining balance, and the household expense is visible to both members. Other users/households do not gain access. If the card is absent from the UI despite intended SELECT access, record the frontend/policy mismatch as FAIL/BLOCKED rather than bypassing it.
  - Actual: ____________________
- [ ] Edit a permitted legacy transaction's title/date or link a permitted transaction to a trip without changing the four exposure fields; then try increasing exposure beyond available funds.
  - Expected: non-increasing metadata edit succeeds; over-limit increase returns the existing friendly 400 debit/credit error. Actual transaction edit permissions still apply.
  - Actual: ____________________

## 8. Dashboard smoke test

- [ ] Open `/dashboard` and `/mobile/dashboard` against staging; check default view, an explicit date range, personal/household selection and reload/back navigation.
  - Expected: no runtime/build/console errors; transaction ordering and scoped totals match the known fixtures. Debit top-ups stay excluded from income/expense KPIs, debit ordinary income does not become available funds, and credit repayments reduce debt. Existing default-range cash/forecast behavior is unchanged; this repair did not introduce SQL KPI totals.
  - Actual: ____________________
- [ ] Check shared balances as owner and member after accepted/rejected expenses and after restore; rejected edits leave the old amount/card unchanged. Check charts, modal opening and reduced-motion setting on a real mobile browser if included in the rollout.
  - Expected: visible values refresh consistently with the tested data; no unrelated card is changed. Record real observations, not assumptions from offline tests.
  - Actual: ____________________

## Sign-off and execution record

- [ ] All eight SQL cases passed and rollback verified.
- [ ] Concurrent overlap observed; exactly one expense rejected; cleanup verified.
- [ ] Restore-over-existing passed twice with unchanged IDs.
- [ ] Second-member and dashboard checks passed.
- [ ] Failures/blocked prerequisites resolved or explicitly accepted by the owner.

Owner/sign-off: ____________________  Evidence location (no secrets): ____________________

Agent preparation record: SQL/concurrency/restore/device scenarios **not executed**; no local PostgreSQL tools found, no live connection attempted. Phase 2 preparation checks passed: npm run lint, npx tsc --noEmit, npm test (76/76), and npm run build with NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy. Source guards checked the rollback envelope, eight scenario markers, tagged DO blocks, role switches and narrow exception catches. Independent read-only review found no important issue. These are source/application checks and do not execute this SQL asset.

References for the human operator: [SET ROLE](https://www.postgresql.org/docs/current/sql-set-role.html), [PL/pgSQL exception blocks](https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING), [psql ON_ERROR_STOP](https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-VARIABLES). These describe mechanisms; they are not evidence that the staging run passed.
