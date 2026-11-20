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
