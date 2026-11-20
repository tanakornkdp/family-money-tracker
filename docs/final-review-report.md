# Final verification and review report

Verified on 2026-11-20 in `codex/review-fixes-and-perf`.

Application baseline: `e57ba21` from `codex/mobile-card-preview-20261116`. Verified application/dependency head: `6e332ad`. Phase 5 adds this report, a fresh bundle measurement and the plan update; it does not change application behavior.

| Phase | Commit |
| --- | --- |
| 1 — Correctness | `52b6409` |
| 2 — Security/robustness | `e55e573` |
| 3 — Performance | `22d4ddb` |
| 4 — Repo hygiene | `6e332ad` |

**Status key:** **done** means the implementation and stated offline checks are complete; it is not a claim of deployment or live database verification. **partial** identifies prepared SQL or other remaining rollout/verification work. **skipped** identifies an explicitly deferred implementation. No real database, secrets, Vercel configuration, existing migration history or original dirty checkout was changed. Nothing was pushed or deployed.

## Fresh Phase 5 checks

| Command | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm test` | PASS, 63/63, exit 0 |
| `node tests/future-money-plans.test.mjs` | PASS, 9/9, exit 0 |
| `npm run build` | PASS, exit 0; Next.js 16.4.6/Turbopack; `Running next.config.js`; 54 static-page work units generated |
| `npm audit --audit-level=low --fetch-retries=0 --fetch-timeout=15000` | PASS, 0 vulnerabilities |

Build environment: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`. These are dummy public configuration values, not credentials. Test services/providers are mocked; tests do not call the database or AI. The separate 9-test run repeats tests already included in the 63-test suite, so it is not 72 distinct tests. Node's existing typeless-package warning remains; lint/type/build have no errors. Browser signup-to-report E2E, deployed RLS and SQL concurrency tests were not run.

## Per-task status and changed files

### Phase 1 — Correctness

| Task | Status | Outcome / main files |
| --- | --- | --- |
| 1.1a — Avoid silent 1,000-row transaction/list truncation | **done** | Shared ordered range paging, explicit limits, fresh filters per page and error propagation. `lib/utils/pagination.mjs`; `services/transactions.ts`, `services/goals.ts`, `services/recurringBills.ts`, `services/receipts.ts`, `services/creditCards.ts`, `services/expenseReports.ts`, `services/futureMoneyPlans.ts`; related metadata services; `components/NotificationCenter.tsx`; `app/api/backup/route.ts`. Pagination/service tests cover >1,000 rows and tie order. |
| 1.1b — SQL card balances | **partial** | Invoker aggregate RPC prepared and service calls it, preserving debit top-up precedence, ignored ordinary debit income and credit expense/income signs. `supabase/migrations/20261120090000_card_balances_and_expense_limits.sql`; `services/creditCards.ts`; test-only `tests/cardBalanceReference.ts`, balance/service/transport tests. Migration and real-role equivalence remain unapplied/unverified. |
| 1.2 — DELETE wallet check uses shared service | **done** | Removed conflicting inline arithmetic; passes excluded transaction ID to the balance service, keeps the deliberate Thai message. `app/api/transactions/[id]/route.ts`; `tests/transaction-api.test.mjs`. |
| 1.3 — Serialize card expense limit enforcement | **partial** | BEFORE INSERT/UPDATE expense trigger locks the card row and checks available balance excluding the updated row. Distinct SQLSTATE/prefix errors map to existing Thai API responses. Card migration above; `lib/validation/cardBalanceError.ts`; `services/transactions.ts`; both transaction routes; balance/input/API tests. Actual RLS grants, locking and simultaneous writers require staging. |

The requested trigger protects the specified expense writes. It does not establish a universal invariant for concurrent top-up deletion/reduction or every other balance-changing mutation; see Needs human.

### Phase 2 — Security and robustness

| Task | Status | Outcome / main files |
| --- | --- | --- |
| 2.1 — Receipt input bounds and Zod | **done** | 192 KiB byte cap even without an honest Content-Length; OCR max 20,000 characters, category/card bounds and UUID/type validation; invalid input 400, excessive bytes 413. `app/api/ai/receipt-analyze/route.ts`; `lib/api/readJson.ts`; `lib/validation/aiSchemas.ts`; `tests/security-robustness.test.mjs`. |
| 2.2 — Validate both AI JSON outputs | **done** | Bounded advice/summary arrays and integer 0–100 score; receipt fields/enums and supplied-card membership; invalid output retains AI_ERROR. `app/api/ai/analyze/route.ts`, `app/api/ai/receipt-analyze/route.ts`; AI schemas; security/session tests. |
| 2.3 — Per-user atomic quotas | **partial** | Four guards and one defaults object implemented; 429 plus Retry-After; fail open only for RPC call errors, generic 500 for malformed successful decisions. `lib/api/rateLimit.ts`, `lib/api/rateLimitPolicy.ts`; all four AI/OCR routes; `supabase/migrations/20261120100000_api_rate_limits.sql`; security tests. SQL uses auth.uid(), denies direct table access and justifies SECURITY DEFINER for the private quota storage. SQL execution/concurrent isolation remain unverified. Missing RPC intentionally fails open until migration application. |
| 2.4 — Hide internal API errors | **done** | Shared message-only server logging with URL/credential/quoted-value redaction and generic responses; intentional business-rule messages retained, money-plan detail leaks removed. `lib/api/errors.ts`; both transaction routes, OCR route, money-plan route; security/API error tests. |
| 2.5 — Backup JSON 401 | **done** | GET/POST use nonredirecting user lookup and return JSON 401; restore rules unchanged. `app/api/backup/route.ts`; backup/security tests. |
| 2.6 — getAll/setAll cookies and protected paths | **done** | Request cookies and all response cookie batches/options/cache headers survive normal/redirect responses; reports/money-plans protected. `lib/supabase/middleware.ts`; `tests/security-session.test.mjs`. `app/preview/page.tsx` inspected, unchanged: public redirect only to protected /mobile, no user data read. |
| 2.7 — Bilingual privacy notice and data flow | **done** | Shared receipt uploader and assistant notices; explicit external image/text/financial-summary processing documented. `components/receipts/ReceiptUploader.tsx`; `components/assistant/ChatWindow.tsx`; `lib/i18n/translations.ts`; `README.md`. No provider logic changes. |
| 2.8 — Optional atomic restore | **skipped** | No all-or-nothing restore function shipped: complete deployed constraints/triggers/storage rollback could not be verified safely. Existing restore stays non-atomic. Backup authentication changed only as in 2.5. |

Quota defaults remain chat 30/hour, analysis 20/hour, receipt analysis 40/hour and OCR 20/hour.

### Phase 3 — Performance

| Task | Status | Outcome / main files |
| --- | --- | --- |
| 3.1 — Request-scoped auth/settings reuse | **done** | React cache on getUser/requireUser; primitive userId-only cached settings callback creates its own client. Server pages/layouts/report loader converted; API/client-side checks retained. `lib/auth/getUser.ts`, `lib/auth/requestSettings.ts`; desktop/mobile pages/layouts; `services/expenseReports.ts`; `tests/request-cache.test.mjs`. No cross-request persistent auth cache. |
| 3.2 — Proxy getClaims | **done** | Installed Supabase JS 2.108.1 supports getClaims; proxy gating uses it, while render/API getUser verification remains. `lib/supabase/middleware.ts`; session tests. Local verification/network behavior depends on real signing keys/JWKS cache, not tested here. |
| 3.3 — Dashboard query reuse/parallelism | **done** | One normal-path ordered scope read replaces two/three reads. Reuses all rows for forecast; derives selected range; preserves existing default-range cash behavior. Noncanonical URL dates still use database filtering/parsing. Independent settings, households, categories, cards and bills start together. `app/(dashboard)/dashboard/page.tsx`; `lib/utils/dashboardTransactions.ts`; dashboard tests. Mobile's existing one-read pattern retained. |
| 3.4 — SQL KPI/cash totals | **skipped** | Exact numeric equivalence not established. Existing JS income/cash sum of 0.2 and 0.1 is 0.30000000000000004, unlike exact numeric 0.3; the regression test records the mismatch. Existing forecasts, lists and charts/insights still need rows, so adding a totals RPC alone would not eliminate those reads. Existing TS totals remain unchanged; no speculative SQL shipped. `tests/dashboard-performance.test.mjs` records the decision. |
| 3.5 — Lazy charts/modal code and stable placeholders | **done** | Client dynamic boundaries for all five requested Recharts components; extracted Content modules; data-sized report placeholders incl. mobile pie legend; lazy AI insight, budget dialog, edit modal and camera. `components/dashboard/*Chart.tsx` and new `*ChartContent.tsx`; `AiInsightCard.tsx`/`AiInsightCardContent.tsx`; `components/reports/ExpenseReportCharts*.tsx`; `components/ui/ChartSkeleton.tsx`; budget/navigation/table callers; performance UI tests and bundle measurement script. Actual device CLS/slow-network behavior remains a human check. |
| 3.6 — Faster hot-path motion/reduced motion | **done** | Count-up/dock 180 ms; page/route/sheet 180–200 ms without long stagger delays; final number values server-rendered. Reduced motion skips number/page/dock/chart animation. `CountUp.tsx`, `AnimatedCurrency.tsx`, `lib/utils/dockWindowMotion.ts`, `lib/hooks/useReducedMotion.ts`, `app/globals.css`, navigation and chart Content modules; performance UI tests. |
| 3.7 — Indexes for verified columns | **partial** | Idempotent transaction user/date, household/date, card/trip indexes plus receipt, trip and contribution service-filter indexes prepared. `supabase/migrations/20261120110000_performance_indexes.sql`. No CONCURRENTLY inside the migration; comment explains large-table manual concurrent builds. Not applied; equivalent deployed indexes/plans remain unknown. |

### Phase 4 — Repository hygiene

| Task | Status | Outcome / main files |
| --- | --- | --- |
| 4.1 — Active config/dev origins | **done** | Deleted unused `next.config.ts`; build confirms JS config. Optional ALLOWED_DEV_ORIGINS comma/space parsing replaces fixed host. `next.config.js`; `output: 'standalone'` retained. |
| 4.2 — Dead code/dependency removal | **done** | Grep confirmed no external callers, then deleted `ai/assistant.ts`, `ai/prompts.ts`, `lib/supabase.ts`; removed unused openai, Anthropic, Google and Groq SDK packages and legacy provider-key references. `package.json`, `package-lock.json`; active fetch-based provider logic unchanged. |
| 4.3 — Align ESLint with Next | **done** | Next/config/plugin aligned at 16.4.6. Compatible TypeScript ESLint 8.73.0/minimatch 11.0.9 security update resolves the audit findings; final audit 0 vulnerabilities. `package.json`, `package-lock.json`. |
| 4.4 — Test script and honest harness status | **done** | Added the exact npm test command and verified it. Existing dev:demo/test:e2e definitions left intact; missing prerequisites reported, not fabricated. `package.json`, `README.md`. Browser/demo harness itself remains unavailable. |
| 4.5 — Complete placeholder environment example | **done** | All runtime/provider variables plus dev origins, managed values and test-only hooks documented without real values. `.env.example`; `.gitignore` exception. No real env/secret copied. |
| 4.6 — Replace boilerplate README | **done** | App, environment, migrations/baseline caveat, scripts, standalone packaging, external AI/OCR and quota behavior documented. `README.md`. |

### Phase 5 — Verification/report

| Task | Status | Outcome / files |
| --- | --- | --- |
| Requested commands and standalone future-plan suite | **done** | All fresh results above pass. |
| Per-task status, changed files, build sizes and call counts | **done** | This report; `docs/phase-5-bundles-final.json`; plan update. Counts below are explicitly code-derived, not measured production traffic. |
| Live database/concurrency/browser/region/privacy verification | **skipped** | Not performed under the task's database/secrets/deployment restrictions or missing harness. Listed below for the human owner. |

## Performance — before/after build route sizes

Baseline is the Phase 2 production build at `e55e573`, before performance edits; final is the fresh Phase 5 build of `6e332ad`. The measured final entry sizes match the Phase 3 snapshot. Both builds use the same dummy Supabase config. No real financial data is involved.

Next.js 16.4.6's build route table does not print byte sizes. Both route lists remain unchanged; both generated 54 static-page work units. Measurements below are derived from the route client-reference manifests with `node tests/measure-client-bundles.mjs`: union each route's entryJSFiles, sum raw bytes and per-file gzip bytes. Source snapshots: `docs/phase-3-bundles-before.json`, `docs/phase-5-bundles-final.json`.

| Route | Before raw bytes | Final raw bytes | Before gzip bytes | Final gzip bytes | Gzip reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| /dashboard | 838,056 | 449,160 | 239,913 | 126,203 | 47.4% |
| /mobile/dashboard | 575,246 | 440,103 | 171,417 | 123,040 | 28.2% |
| /reports | 839,017 | 448,339 | 241,382 | 126,480 | 47.6% |
| /mobile/reports | 982,047 | 451,607 | 291,186 | 126,586 | 56.5% |
| /mobile/transactions | 592,315 | 457,173 | 177,330 | 128,954 | 27.3% |
| /mobile/budget | 590,847 | 450,239 | 175,930 | 126,194 | 28.3% |

These are **route-entry JS sizes**, not total browser transfer or measured page-load times. Deferred chunks still download when components render; visible charts load on mount. RSC/HTML/CSS, browser background queries, CDN compression and real DB latency are outside this metric. No claim of a 47–57% reduction in end-to-end latency is made.

The synthetic 1,000-transaction/20-card aggregate transport benchmark also reduces JSON from 110,001 bytes to 1,321 bytes (98.8%). This compares equivalent synthetic responses, not SQL execution or a measured production dataset; per-run parsing timings vary.

## Performance — code-derived Supabase calls per initial page load

### Scope and assumptions

These are **logical query/auth SDK executions for one initial server page+layout render**, comparing original `e57ba21` with final `6e332ad`. They are not captured network requests. Assume valid unlocked authentication; canonical date inputs; at least one recent transaction/card; each paginated result has fewer than 1,000 rows; nonempty household members/breakdown where shown; mobile Trips card enabled; valid selected household. Exclude retries, refreshes, client notification polling/mutations, file downloads, AI calls, RSC prefetch and persistent-layout navigation differences. Automatic fetch deduplication can also affect actual HTTP counts.

| Initial server render | Data query calls before → final | getUser calls before → final | getClaims calls before → final | Total logical SDK/query calls before → final |
| --- | ---: | ---: | ---: | ---: |
| /dashboard, default scope/dates | 10 → 8 | 3 → 1 | 0 → 1 | 13 → 10 |
| /dashboard, explicit date range | 11 → 8 | 3 → 1 | 0 → 1 | 14 → 10 |
| /dashboard, household/default dates | 13 → 11 | 3 → 1 | 0 → 1 | 16 → 13 |
| /mobile/dashboard, personal | 8 → 7 | 3 → 1 | 0 → 1 | 11 → 9 |
| /mobile/dashboard, selected household | 6 → 5 | 3 → 1 | 0 → 1 | 9 → 7 |
| /settings or /mobile/settings | 2 → 1 | 3 → 1 | 0 → 1 | 5 → 3 |

A warm asymmetric-key getClaims verification typically adds **zero HTTP round trips**, despite being one SDK call; cold JWKS/symmetric-key fallback and token refresh can add network work. Under that additional assumption the final table's HTTP candidates are one lower (e.g. desktop default 9, mobile personal 8), before any framework deduplication. This project's signing configuration was not inspected. Do not present these as measured network counts or revocation guarantees.

### Derivation

- Before: proxy getUser + layout requireUser/getUser + page getUser/requireUser = 3 auth calls. After: proxy getClaims + one cached render getUser = 2 auth SDK calls. Settings reads shared by layout/page fall from 2 to 1. Report pages also share settings with their layout; other report query counts depend on filters/members and are not claimed as fixed totals.
- Final default desktop data = settings 1 + all-scope transactions 1 + recurring 1 + households 1 + category icon map 1 + card list 1 + card-balance RPC 1 + recent-user names 1 = 8. Before it adds one settings read and one transaction-range read (=10); explicit dates added another duplicate all-scope transaction read (=11). No household selected here means the existing default visible/RLS scope, not a newly imposed personal-only filter.
- Desktop household adds member-breakdown names, household-member list and member profiles (=3 under the stated assumptions). These dependent reads were not removed. Canonical selected ranges are derived locally. Noncanonical URL dates retain one extra database-filtered read to preserve Postgres parsing/errors.
- Final mobile personal data = settings, households, card list, balances RPC, trips, transactions and recurring (=7). Household mode skips the two card-related reads (=5). Hiding Trips subtracts one. An empty card list skips the balance RPC; no recent users skips the relevant name lookup.
- Paging is necessary for correctness and can **increase** calls for larger datasets. For an unlimited result of n rows with page size 1,000, requests are floor(n/1000)+1 (including the final empty page for exact multiples). Therefore the numeric table is not a bound for large accounts. Confirm PostgREST max-rows is at least 1,000 before relying on that termination rule.
- The client NotificationCenter makes additional independent reads/auth calls and conditionally writes generated notices, then refreshes over time. Its counts depend on budgets, pending items and polling. They are excluded rather than hidden inside a misleading fixed page-load total.

## Needs human — required before rollout

1. **Back up first, then staging migrations.** Use authenticated `/api/backup` for an application-data export or a Supabase Dashboard backup; for a complete migration recovery plan, preserve the full project/schema/storage as appropriate. The app export is not a substitute for a full database/schema backup and its existing restore is non-atomic. Review/apply these new migrations on a **staging project first**, in order: `20261120090000_card_balances_and_expense_limits.sql`, `20261120100000_api_rate_limits.sql`, `20261120110000_performance_indexes.sql`. Verify permissions/RLS, aggregate equivalence, two simultaneous expense writers, quota boundaries/identity isolation and index plans before production. Missing balance RPC breaks balance reads; missing quota RPC intentionally fails open. No migration was applied in this review.
2. **Confirm Vercel Function and Supabase regions are near each other.** Singapore for both is a typical Thailand choice; that is not a statement of the current project's regions. Have the owner check actual deployed function routing and database region. Region/config changes were expressly left untouched.
3. **Export and commit the missing base schema.** Transactions, categories, households, other baseline tables/policies and helpers such as `private.is_household_member` are not defined by this repo's incremental migrations. Have the owner run `supabase db dump --schema public` in an authorized linked environment and review the export before committing it as the initial baseline migration for fresh setups. A public-only dump does **not** include private helper definitions: export/review those separately too. Reconcile the snapshot with incremental history (a current snapshot may already include later objects); do not blindly replay duplicate CREATE TABLE statements or rewrite applied migrations. The CLI project config/baseline history also needs owner setup. No dump or schema export was performed here.
4. **Decide user-deletion FK behavior.** `supabase/migrations/20261119090000_future_money_plans.sql` defines `future_money_plans.user_id references auth.users(id)` without ON DELETE, so PostgreSQL's default NO ACTION blocks user deletion while plans reference that user. Decide intentional restrict/retention versus cascade. Review the full dependency chain (including `future_money_plan_links.user_id`, plan links/events and shared ownership) before a separate new migration; changing only one FK is not a complete deletion policy. Existing migration history was not edited.
5. **Recover/configure demo and Playwright infrastructure.** `tests/start-finance-demo.mjs` and the Playwright config are missing/uncommitted. `tests/report-supabase.mjs` also imports absent `finance-demo.mjs` and `merge-finance-backup.mjs`. Existing test:e2e is not verified E2E coverage; do not report signup-to-report, real iOS/Android or deployed flows as tested. Obtain the intended harness rather than inventing replacement files.
6. **Review AI free-tier privacy terms.** Review Groq/Gemini/OpenRouter and OCR.space terms, retention/training use, deletion, data location and sharing requirements for receipt images/text, temporary signed URLs, supplied card names/IDs and financial summaries. Confirm account/project tier and quota/billing settings; configuration flags alone are not a provider privacy/cost guarantee. The in-app notices and README describe the existing flow, but are not legal approval.
7. **Resolve deliberate implementation deferrals.** Exact dashboard SQL total equivalence (3.4) and atomic backup restore (2.8) remain unshipped. Agree on numeric rounding/SQL behavior and full restore constraints/storage semantics first. The expense-only card trigger does not serialize every top-up deletion/reduction against spending; define/test that wider invariant if required.
8. **Verify real behavior under deployment conditions.** Check token expiry/revocation, cookie refresh, actual signing-key/JWKS fallback, slow-network chart/modal loading, reduced-motion behavior and browser layout on devices. Measure database plans/network latency rather than inferring them from bundle bytes or the logical call-count table.

## Changed-file inventory

The appendix below is generated from `git diff --name-status e57ba21 6e332ad`; A/M/D mean added/modified/deleted. It covers implementation phases 1–4. Phase 5 additionally adds this report and `docs/phase-5-bundles-final.json` and updates the plan. Full per-phase context is preserved in `docs/phase-1-correctness-and-performance.md`, `docs/phase-2-security-and-robustness.md`, `docs/phase-3-performance.md` and `docs/phase-4-repo-hygiene.md`.

```text
A	.env.example
M	.gitignore
M	README.md
D	ai/assistant.ts
D	ai/prompts.ts
M	app/(dashboard)/budget/page.tsx
M	app/(dashboard)/credit-cards/page.tsx
M	app/(dashboard)/dashboard/page.tsx
M	app/(dashboard)/goals/page.tsx
M	app/(dashboard)/layout.tsx
M	app/(dashboard)/receipts/page.tsx
M	app/(dashboard)/recurring-bills/page.tsx
M	app/(dashboard)/settings/page.tsx
M	app/(dashboard)/transactions/page.tsx
M	app/api/ai/analyze/route.ts
M	app/api/ai/receipt-analyze/route.ts
M	app/api/ai/route.ts
M	app/api/backup/route.ts
M	app/api/money-plans/route.ts
M	app/api/ocr/route.ts
M	app/api/transactions/[id]/route.ts
M	app/api/transactions/route.ts
M	app/globals.css
M	app/mobile/budget/page.tsx
M	app/mobile/credit-cards/page.tsx
M	app/mobile/dashboard/page.tsx
M	app/mobile/goals/page.tsx
M	app/mobile/layout.tsx
M	app/mobile/receipts/page.tsx
M	app/mobile/recurring-bills/page.tsx
M	app/mobile/review/page.tsx
M	app/mobile/settings/page.tsx
M	app/mobile/transactions/page.tsx
M	app/mobile/travel/[id]/page.tsx
M	app/mobile/wallet/page.tsx
M	components/NotificationCenter.tsx
M	components/assistant/ChatWindow.tsx
M	components/budget/BudgetCalendarManager.tsx
M	components/dashboard/AiInsightCard.tsx
A	components/dashboard/AiInsightCardContent.tsx
M	components/dashboard/CategoryPieChart.tsx
A	components/dashboard/CategoryPieChartContent.tsx
M	components/dashboard/IncomeExpenseChart.tsx
A	components/dashboard/IncomeExpenseChartContent.tsx
M	components/dashboard/StackedExpenseChart.tsx
A	components/dashboard/StackedExpenseChartContent.tsx
M	components/dashboard/TypePieChart.tsx
A	components/dashboard/TypePieChartContent.tsx
M	components/mobile/MobileNavigation.tsx
M	components/receipts/ReceiptUploader.tsx
M	components/reports/ExpenseReportCharts.tsx
A	components/reports/ExpenseReportChartsContent.tsx
M	components/transactions/TransactionTable.tsx
M	components/ui/AnimatedCurrency.tsx
A	components/ui/ChartSkeleton.tsx
M	components/ui/CountUp.tsx
A	docs/phase-1-correctness-and-performance.md
A	docs/phase-2-security-and-robustness.md
A	docs/phase-3-bundles-after.json
A	docs/phase-3-bundles-before.json
A	docs/phase-3-performance.md
A	docs/phase-4-repo-hygiene.md
A	docs/superpowers/plans/2026-11-20-review-fixes-and-perf.md
A	lib/api/errors.ts
A	lib/api/rateLimit.ts
A	lib/api/rateLimitPolicy.ts
A	lib/api/readJson.ts
M	lib/auth/getUser.ts
A	lib/auth/requestSettings.ts
A	lib/hooks/useReducedMotion.ts
M	lib/i18n/translations.ts
D	lib/supabase.ts
M	lib/supabase/middleware.ts
A	lib/utils/dashboardTransactions.ts
M	lib/utils/dockWindowMotion.ts
A	lib/utils/pagination.mjs
A	lib/validation/aiSchemas.ts
A	lib/validation/cardBalanceError.ts
M	next.config.js
D	next.config.ts
M	package-lock.json
M	package.json
M	services/budgetPlans.ts
M	services/categories.ts
M	services/creditCards.ts
M	services/expenseReports.ts
M	services/futureMoneyPlans.ts
M	services/goals.ts
M	services/households.ts
M	services/receipts.ts
M	services/recurringBills.ts
M	services/transactionTitles.ts
M	services/transactions.ts
M	services/travelTrips.ts
M	services/userSettings.ts
A	supabase/migrations/20261120090000_card_balances_and_expense_limits.sql
A	supabase/migrations/20261120100000_api_rate_limits.sql
A	supabase/migrations/20261120110000_performance_indexes.sql
A	tests/card-balance-perf.test.mjs
A	tests/card-balances.test.mjs
A	tests/cardBalanceReference.ts
A	tests/dashboard-performance.test.mjs
A	tests/loadTsModule.mjs
A	tests/measure-client-bundles.mjs
A	tests/pagination.test.mjs
A	tests/performance-ui.test.mjs
A	tests/request-cache.test.mjs
A	tests/security-errors.test.mjs
A	tests/security-robustness.test.mjs
A	tests/security-session.test.mjs
A	tests/service-pagination.test.mjs
A	tests/transaction-api.test.mjs
A	tests/transaction-input.test.mjs
```
