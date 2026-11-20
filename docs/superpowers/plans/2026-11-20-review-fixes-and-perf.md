# Phase 1: correctness and bounded data transfer

Base: `e57ba2103d0122414804b20c66f4569890970a1e` on `codex/mobile-card-preview-20261116`. Work only on `codex/review-fixes-and-perf`. The original checkout remains untouched.

- [x] Test shared range pagination without network: ties, exact pages, limits, filters and errors. Apply to unbounded transaction/contribution/receipt/recurring reads, reports, money plans, notification totals and backup lists. Preserve existing primary ordering and add unique tie breakers.
- [x] Add invoker `get_card_balances` in a new migration. Preserve debit top-up precedence, ignored non-top-up debit income, and credit expense/income signs exactly. RPC returns one aggregate per visible card. Keep the TypeScript reference only under tests.
- [x] Replace DELETE's wallet arithmetic with the shared balances service, excluding the deleted transaction. Preserve its deliberate message.
- [x] Add a volatile invoker BEFORE trigger: serialize relevant expense writes on the card row, then read the balance excluding the updated row and enforce debit balance / credit limit minus debt. Use recognisable SQLSTATEs and safe structured available-balance details. Translate these to the existing POST/PATCH messages; preserve error codes across service calls. Do not expose raw internal errors.
- [x] Run network-free node tests, `npm run lint`, `npx tsc --noEmit`, and `npm run build` with only dummy Supabase configuration. Record benchmark methodology and results without claiming real database timings.
- [x] Review, fix findings, rerun required checks, then create exactly one Phase 1 commit. Do not push, deploy, change existing migrations, or access the real database.

Needs human: migration application and RLS-aware RPC/trigger integration under the deployed database roles, including two simultaneous expense writes (card-row lock freshness), repeatable-read behavior and updates between cards. No live DB assertions may be made in this task.

# Phase 2: security and robustness

- [x] Add bounded receipt JSON reading and input/output schemas; preserve AI error contracts.
- [x] Add atomic authenticated quota migration and shared endpoint guards; test deny, allow, call failures and malformed decisions offline.
- [x] Consolidate internal error handling without replacing intentional business errors.
- [x] Replace backup redirects with JSON 401; retain all restore rules.
- [x] Migrate session cookies to getAll/setAll and preserve refresh cookies/cache headers on redirects. Protect reports/money-plans and inspect preview.
- [x] Add bilingual receipt/chat privacy notices and document external data flows.
- [x] Independently review, run 53 offline tests plus lint/type/build using dummy Supabase settings, then commit Phase 2 separately.
- [ ] Needs human: apply/review the quota migration and verify concurrent calls and deployed permissions. Optional atomic restore skipped pending complete deployed-schema/rollback verification; no database access authorized here.

# Phase 3: performance

- [x] Request-scoped React auth/settings caching with primitive settings keys; API checks retained.
- [x] Supported SDK getClaims proxy gating, while render/API getUser verification remains.
- [x] Single normal-path dashboard scope read, range derivation and independent query parallelism; noncanonical URL date queries preserved.
- [x] Evaluate 3.4 equivalence before shipping: numeric vs JS float regression demonstrates a mismatch. SQL totals deferred under the user's explicit exception.
- [x] Split Recharts and modal-only code with next/dynamic; preserve chart placeholder geometry and record route-entry sizes before/after.
- [x] Tune hot-path motion to 180–200 ms and disable number/page/dock/chart animation in reduced motion.
- [x] Prepare idempotent index migration for verified columns; do not apply it.
- [x] Independent review, 63 offline tests, lint, type check and dummy-config production build; one Phase 3 commit.
- [ ] Needs human: deployed query plans/equivalent indexes, index application, auth signing-key/revocation/device checks, and exact totals policy before SQL aggregates.

# Phase 4: repository hygiene

- [x] Confirm active next.config.js, delete the unused TS config, use optional comma-separated ALLOWED_DEV_ORIGINS and retain standalone output.
- [x] Grep dead module/import usage; delete the three legacy modules and four unused AI SDK dependencies plus legacy provider-key references.
- [x] Align eslint-config-next and its plugin to Next.js 16.4.6; update the lockfile.
- [x] Add npm test. Preserve/report missing demo and Playwright harness prerequisites without fabricating files.
- [x] Add a safe complete .env.example and gitignore exception; replace README with actual setup/migrations/scripts/privacy/quota documentation.
- [x] Independent review, 63 offline tests, lint, type check and dummy-config production build. Local config and lockfile checks pass.
- [ ] Needs human: recover/configure missing demo/browser harness and obtain baseline schema/migration history for new environments. Existing live verification and aggregate/restore deferrals remain.

- [x] Phase 4 audit regression addressed with compatible TypeScript ESLint/minimatch updates; npm audit reports 0 vulnerabilities.
