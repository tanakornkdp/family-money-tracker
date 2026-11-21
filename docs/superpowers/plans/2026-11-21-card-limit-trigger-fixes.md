# Card-limit trigger repair implementation plan

> Execution: implement inline with a failing-test gate and one independent review of the completed patch. User specification is Phase 1 in the attached request; SQL dashboard totals are not specified in this attachment and are not added here.

**Goal:** Keep non-increasing legacy transaction edits working, serialize expense increases without UPDATE access to cards, and avoid all-card balance scans / upsert double counting.

**Architecture:** Add one append-only invoker migration with a single-card aggregate and an advisory-lock expense trigger. Mirror the specified exposure decision in a pure TypeScript helper and apply it only to PATCH's balance checks; keep validation and card visibility checks. Existing multi-card RPC and historical migrations stay unchanged.

**Stack:** Next.js 16.4.6 App Router, React 19, Supabase/PostgreSQL, TypeScript, node:test.

- [x] Read the supplied request, existing models/services, migration, tests, final review report and local Next route guide. Confirm clean base `b1e7de5`; create `codex/trigger-and-sql-totals` from `codex/review-fixes-and-perf`.
- [x] Check local psql/postgres/docker: none found on PATH. Do not connect to Supabase or claim SQL execution.
- [x] Add failing pure exposure and migration regression tests, plus a PATCH legacy-over-limit reproduction.
- [x] Add `lib/validation/cardExposure.ts` and mirror the exact exposure rules in new migration `20261120120000_card_limit_trigger_fixes.sql`: targeted UPDATE columns, unchanged/non-increasing return, per-card advisory lock, plain visible-card SELECT, single-card aggregate, INSERT existing-id exclusion and unchanged errors/grants.
- [x] Gate PATCH balance prechecks with the helper. Retain card selection visibility validation using metadata reads for non-increasing edits, without loading balances.
- [x] Cover amount decrease/equality, metadata/trip edits, card/type/top-up transitions, friendly failures and visible-card validation. Keep all previous tests passing.
- [x] Run lint, tsc, npm test and dummy-config production build; independent review and fix any important findings.
- [x] Record evidence and Needs human; create one Phase 1 commit. Do not push to main/master, deploy or apply migrations.

Ruling: `increasesCardExposure` identifies candidates for expense enforcement from complete validated snapshots of the four specified fields. New income/no-card writes are not expense candidates. The existing debit top-up exemption is still resolved by the actual card-type/payment checks, rather than guessed by this card-type-agnostic helper.

Ruling: PATCH still checks that a selected card is visible. Non-increasing edits use `getCreditCards` instead of `getCardsWithBalance`, preserving the existing invalid-card error without unnecessary balance RPCs. Other validation/auth/update behavior is unchanged.

Ruling: Existing-id INSERT exclusion is checked after the advisory lock, so a waiting writer can see a committed same-ID row at READ COMMITTED. All INSERTs still follow the requested insertion rule; legacy over-limit upsert no-ops are not silently reclassified as UPDATEs.

Verification: lint, tsc, 76/76 offline tests and dummy-config build passed. Independent static/code review found no important issues. SQL was not executed: psql/postgres/docker were not found on PATH. Detailed evidence and staging cases are in docs/card-limit-trigger-fixes.md.

# Phase 2: staging verification assets

- [x] Rechecked psql/postgres/docker: none found on PATH. No SQL scenarios can be executed here.
- [x] Add rollback-only authenticated role/claim SQL asset for all eight requested cases, with fixture prerequisites and strict expected-code assertions.
- [x] Document two overlapping psql sessions, required winner COMMIT, exact loser rejection, verification and narrowly scoped cleanup.
- [x] Add tickable staging backup/migration/SQL/concurrency/restore/member/dashboard checklist, expected results and evidence blanks.
- [x] Review assets, run lint/tsc/npm test/dummy-config build and commit Phase 2 separately. Human-run results remain blank, not marked passed.

Phase 2 rulings: the rollback-only suite uses five dedicated cards and a pre-created legacy over-limit row; it does not invent missing baseline RLS/columns or disable protections. Concurrent-writer testing requires a separately committed fixture and winner, unlike the rollback-only suite. API restore uses a separate no-legacy account so the intentionally rejected over-limit INSERT case cannot mask the near-limit upsert test.

Phase 2 verification: all four required application gates passed (76/76 unit tests); static asset source guards passed. Independent review found no important issue. The staging SQL suite, two-session concurrency, HTTP restore and device smoke tests were not executed.
