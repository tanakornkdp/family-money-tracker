# New-user catalog and category detail verification (2026-11-22)

## Scope
- Approved template snapshot: config/new-user-defaults.json, 18 categories and 14 transaction titles, including icons, transaction type and category bindings.
- Only names/icons/types/category bindings are copied. No source account identifiers, goal links, balances or transaction history are shipped.
- Migration 20261122090000_new_user_catalog replaces the two existing Auth signup trigger functions. Existing users are not backfilled or overwritten. SECURITY DEFINER is necessary for signup seeding before the new user has a session; empty search_path and explicit function grants remain enforced.
- Future edits to the source user's catalog do not silently alter this approved snapshot.
- Category details on both report routes use the existing authorized/date/account/member/type/category/search-filtered export rows. No extra transaction query or wider scope is introduced. Amounts and dates are shown per transaction, newest first. Invalid legacy amounts are excluded as in report charts.
- Header utilities queue the next popover until the current Genie collapse completes. Escape/outside click cancel the queued destination; reduced motion switches immediately.

## Executed
- PGlite real-SQL signup seeding, binding and existing-user preservation tests.
- Supabase staging signup trigger test inside BEGIN/ROLLBACK: 18 categories, 14 titles, valid type/category bindings, no seeded transactions.
- Chrome and WebKit staging: profile/bell switches both directions, switch during opening, Escape cancellation, reduced motion and offline switching.
- Chrome and WebKit staging reports: Thai/dark and English/light, 320/390/844px; two selected expense rows total 160, income filter excludes those expense rows; no page errors or horizontal document overflow.
- Images inspected from staging; screenshots and credentials stay outside the repository.

## Repeat browser utility checks
With a running staging app and a private Playwright storage-state file for an existing staging account:

    E2E_BASE_URL=http://127.0.0.1:3025 E2E_STORAGE_STATE=/private/staging.json node tests/mobile-utilities-browser.mjs

Never commit a storage-state file or create test financial data in production.
