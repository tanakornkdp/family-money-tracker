# Phase 3: performance

Branch: `codex/review-fixes-and-perf`. Baseline: Phase 2 commit `e55e573`.

## Request and data work

- `getUser` and `requireUser` use React `cache()`. The cached result lives only within the server render; API handlers retain their independent verified `getUser` calls. Proxy and render are separate contexts and do not share a cache.
- `getCachedUserSettings(userId: string)` creates its own Supabase client inside the cached callback. Every server page/layout and the server report loader uses this primitive-key wrapper, instead of client-object arguments defeating memoization. Client-side settings mutations remain uncached.
- Installed `@supabase/supabase-js` 2.108.1 supports `auth.getClaims()`. Proxy session gating uses it while preserving refreshed cookies and auth cache headers. Layout `requireUser()` still calls verified `getUser()` and catches revoked sessions. The SDK can fetch JWKS on cold cache and fall back to a server check for symmetric signing keys; this task does not assert zero auth network calls for this project's unknown signing configuration.
- Desktop dashboard previously loaded the same scope twice by default or three times with explicit dates. It now loads the ordered all-scope set once, reuses it for the forecast, derives the selected range locally, and preserves the legacy default-range cash KPI. Noncanonical/invalid URL dates retain a separate database-filtered query so Postgres date parsing and errors do not change. Independent settings, households, card balances, categories, recurring bills and locale queries start together; dependent household profile reads stay dependent.
- Mobile dashboard already used one scope read and parallel requests; it now shares settings/auth with the mobile layout.

## Client loading and motion

- IncomeExpenseChart, StackedExpenseChart, CategoryPieChart, TypePieChart and ExpenseReportCharts are client entry wrappers using `next/dynamic` with `ssr: false`. Recharts lives in extracted Content modules. Placeholders preserve 300/380/280/280 px chart heights; report placeholders account for variable category height, empty states, responsive padding and the mobile stacked pie legend. Existing empty-state copy is retained.
- BudgetPlanDialog, EditTransactionModal and CameraEntry load only when their existing conditional UI opens. AiInsightCard has a separate dynamic client module. No new package was installed.
- CountUp and AnimatedCurrency take 180 ms (previously 1,100 ms); Genie dock motion takes 180 ms (previously 460 ms). Page/content/title/route/sheet animations are 180–200 ms, without cumulative page stagger delays. Final formatted values are server-rendered. Reduced motion skips number/dock/page animations; extracted Recharts animations use a hydration-safe preference subscription and are disabled in reduced motion.

## Measured build comparison

Next.js 16.4.6 Turbopack's route table lists routes without byte sizes. Both builds retained the same route list and generated 54 static-page work units. To supply byte measurements, `node tests/measure-client-bundles.mjs` reads each route's client-reference manifest, unions its entryJSFiles paths, and sums file bytes and independent gzip sizes. Raw results are in phase-3-bundles-before.json and phase-3-bundles-after.json. Baseline was measured before any Phase 3 application edits; both builds used dummy Supabase settings and the same dependencies.

| Route | Before entry gzip bytes | After entry gzip bytes | Reduction |
|---|---:|---:|---:|
| /dashboard | 239,913 | 126,203 | 47.4% |
| /mobile/dashboard | 171,417 | 123,040 | 28.2% |
| /reports | 241,382 | 126,480 | 47.6% |
| /mobile/reports | 291,186 | 126,586 | 56.5% |
| /mobile/transactions | 177,330 | 128,954 | 27.3% |
| /mobile/budget | 175,930 | 126,194 | 28.3% |

These are route-entry JS sizes, not total page transfer, browser timing, database latency or Lighthouse results. Dynamic chunks are excluded and still download when their components render. In particular, visible charts load on mount; code splitting is not a claim that their bytes disappear entirely.

## Validation

63 network-free node:test tests pass, including request-cache wiring with simulated React request boundaries, primitive user-key isolation, canonical date range equivalence, existing KPI/cash rules, chart skeleton markup, final SSR number values and dock reduced motion/duration. Existing API/input/pagination/security tests remain green. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass with NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy. Independent review found no important blockers. Node's existing typeless-package warning remains.

## Needs human

- **3.4 not shipped as explicitly permitted:** exact SQL numeric/JavaScript aggregate equivalence is not established. A regression test demonstrates income/cash amounts 0.2 and 0.1 produce JavaScript 0.30000000000000004 versus exact numeric 0.3. Replacing sums would change raw totals. All transactions also remain necessary for existing forecasts, recent lists and charts/insights, so merely adding a totals RPC would not remove those reads. Agree on cent rounding or prove an ordered float-compatible SQL implementation against real Postgres before migrating the totals. Existing pure TS calculations remain unchanged.
- New migration `20261120110000_performance_indexes.sql` is prepared, not applied. It adds the requested transaction user/date, household/date and card indexes plus service-filter indexes for trip transactions, receipt user/date, trip user/start-date and contribution goal/date. Types and services were checked. Inspect deployed equivalent indexes and query plans before applying; large production tables should use manually managed CONCURRENTLY builds outside migration transactions, as the migration comment states.
- No real database/provider/network call, signing-key configuration, iOS/Android browser session or deployed UI was tested. Validate auth revocation and chart/modal loading under slow networks on devices after integration. No database, secrets, Vercel settings, old migration or original checkout was changed. Nothing was pushed/deployed.

## Follow-up (2026-11-21)

The later Phase 4 dashboard task explicitly approves cent-normalized equivalence. It supersedes the SQL-totals deferral above with bounded forecast queries and a prepared aggregate RPC; see [phase-4-dashboard-totals.md](phase-4-dashboard-totals.md). Actual staging SQL/RLS results are still required before release.
