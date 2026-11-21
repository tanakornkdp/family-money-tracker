# Dashboard SQL totals implementation plan

Goal: replace totals-only history transport, preserving current scope/date/KPI/forecast rules to cents. No DB changes are executed here.

Architecture: one stable invoker RPC with all-scope and range cash, range KPIs and optional all-time category totals. Forecast reads two paged bounded sets: current-month-through-today dates plus upcoming recurring occurrence dates, regardless of transaction date. Keep original TS calculators as reference. Mobile currently has no date range: retain all-time KPIs/categories and five recent rows.

- [x] Capture existing build bundle measurements and audit totals-only callers.
- [x] Freeze representative fixture goldens from existing TS; observe new RPC/forecast service tests fail before implementation.
- [x] Add 20261120130000_dashboard_totals.sql, safe missing-RPC diagnostic and typed service.
- [x] Wire desktop/mobile dashboards and mobile wallet; preserve explicit/default cash semantics. Keep noncanonical date bounds in Postgres.
- [x] Add human-run rollback-only SQL fixture assertions; update staging and deploy guides with new RPC signature/rollback dependency.
- [x] Run lint, tsc, all tests, dummy-config build, bundle measurement; independent review; one Phase 4 commit.

Ruling: user explicitly specified migration filename and forbids real DB operations; create that exact new source file without CLI/DB mutation (CLI unavailable).
Ruling: paid future occurrences can have arbitrarily old/future transaction dates. A date-only recent forecast query is unsafe; union with recurring_occurrence_date window retains every paid key relevant to remaining month.
Ruling: SQL cents equivalence is the requested contract, not raw IEEE number equality. Category ranking keeps ordered float8 sums matching the old JS Map addition and first-seen ties; displayed amount precision is unchanged.
Ruling: desktop unfiltered view is all RLS-visible rows, not personal-only. Only its default forecast narrows to caller-owned non-household rows. Member-only forecasts retain their broader original scope.

Baseline build bundle bytes (entry chunks/raw/gzip): desktop dashboard 9/449334/126288; mobile dashboard 10/440277/123133; desktop reports 9/448513/126565; mobile reports 10/451781/126679; mobile transactions 10/457347/129047; mobile budget 10/450413/126287.

Ruling: do not add a forecast option to the widely imported getTransactions function: it increased mobile-budget entry gzip by 73 bytes in the first build. Keep the bounded paged query in its own service; final measured bundles are byte-identical. Existing transaction reference source is unchanged.
Ruling: additional totals-only reconciliation has a distinct top-up rule; use separate account cash/bank fields checked against getReconciliationAccounts, not dashboard cash. Budget keeps its original sum over a month-bounded paged read. Cost if conflated would be wrong account/budget totals; golden fixtures cover these branches.

Verification before final commit: lint, tsc, 105 offline tests and dummy-config build passed; all six measured route entries are byte-identical to baseline. New tests were observed failing with missing dashboardTotals service before implementation, then passed. Independent fresh read-only review found no important defect. Actual Postgres types/RLS/null constraints and latency remain unexecuted staging release gates. No migration/deployment/push performed.
