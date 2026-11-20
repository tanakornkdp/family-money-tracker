# Family Money Tracker

A Thai/English personal and household finance app built with Next.js 16 App Router, React 19, TypeScript, Tailwind 4 and Supabase. It includes transactions, credit/debit cards and wallets, budgets, recurring bills, shared households, savings goals, trips and expense splitting, reports, receipt scanning and an AI assistant. Desktop (`/dashboard`) and mobile (`/mobile/dashboard`) have separate interfaces backed by the same authenticated data.

## Local setup

Use Node.js 24 and npm. The offline tests import TypeScript directly and were verified with Node 24.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Fill `.env.local` before starting the app:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public project configuration. These reach the browser; protect user data with Supabase RLS. Never use a service-role key here.
- `NEXT_PUBLIC_SITE_URL`: the full app origin used for registration email callbacks. Match the origin you open and configure the corresponding `/callback` URL in Supabase Auth redirect settings.
- Optional server-only AI/OCR keys and tier flags are documented in `.env.example`. No provider key is required for `npm test`. AI requests report unavailability when no enabled provider is configured.
- Optional `ALLOWED_DEV_ORIGINS`: comma-separated additional development hostnames. Spaces and empty entries are ignored. Supply hostnames only, without scheme, port or path. Leave empty for Next.js defaults. This does not bypass app authentication.

The example also documents framework-managed values and existing local fixture hooks. Keep fixture/demo flags and test credentials absent from production. Do not commit `.env.local` or real keys. Restart the dev server after changing environment configuration.

```powershell
npm run dev
```

The development server listens on port 3000 and all network interfaces. Open `/dashboard` for desktop or `/mobile/dashboard` for mobile on that same origin; sign in with a real account for that Supabase project.

## Database migrations

The SQL files in `supabase/migrations` are **incremental**. They assume an existing baseline schema (transactions, households, receipts, cards, goals, required helper functions and policies). This repository does not contain that complete baseline or a committed `supabase/config.toml`; the current migrations alone cannot bootstrap a fresh project.

For an existing, approved Supabase environment:

1. Compare its applied migration history with the timestamped files in `supabase/migrations`; identify only unapplied migrations.
2. Review those files and their prerequisites. Apply them in ascending timestamp order with the environment's established Supabase migration runner. If using the Supabase Dashboard SQL Editor manually, run each pending file in order and record its filename in your migration tracking; do not rerun historical migrations already applied.
3. Verify authenticated/anonymous permissions and RLS, the card-balance RPC and concurrent expense limits, and per-user AI quotas before releasing.

For a new environment, obtain the baseline schema and migration history from the project owner first. If adopting the Supabase CLI, configure/link the intended environment separately and inspect `supabase --help` and the installed migration command help before applying anything. No command in `npm run build` or `npm test` applies migrations.

Review-phase migrations add card aggregates/limits, API quotas and performance indexes. Large production indexes should be created manually with `CONCURRENTLY` outside migration transactions after checking existing equivalent indexes, as noted in the index migration. Existing migration history must not be edited.

## Scripts and build

| Command | Purpose / current status |
| --- | --- |
| `npm run dev` | Next.js dev server on `0.0.0.0:3000`. |
| `npm run build` | Production build using `next.config.js`. |
| `npm start` | Existing `next start` command on port 3000; standalone artifacts use the entry point below instead. |
| `npm run lint` | ESLint; its Next.js config matches the installed framework release. |
| `npx tsc --noEmit` | Type-check without compiling application output. |
| `npm test` | Network-free `node --test tests/*.test.mjs`; does not start a browser or touch Supabase. |
| `npm run dev:demo` | **Needs human:** points to uncommitted/missing `tests/start-finance-demo.mjs`. |
| `npm run test:e2e` | **Needs human:** runs `playwright test`, but no Playwright config/browser test harness is committed. Do not treat this as verified E2E coverage. |

`next.config.js` retains `output: 'standalone'`. For a standalone deployment, package `.next/standalone`, copy `public` to `.next/standalone/public` and `.next/static` to `.next/standalone/.next/static`, then run `node .next/standalone/server.js` (or `node server.js` from the deployed bundle). Set the runner's `PORT`/`HOSTNAME` as needed. Hosting-specific configuration is not changed by this cleanup.

The fixture `tests/report-supabase.mjs` also imports missing `finance-demo.mjs` and `merge-finance-backup.mjs`. The separate `future-money-plans.e2e.mjs` script expects an externally running app/fixture; it is not a working replacement for the missing Playwright configuration. These files were not invented during cleanup.

## AI/OCR data flow and privacy

Provider routing is implemented with server-side `fetch` in `lib/ai/freeRouter.ts`; the removed SDK packages are not needed.

- Text chat tries enabled Groq, Gemini, then OpenRouter providers. Images try Gemini, then OpenRouter. Groq/Gemini require a key and the corresponding `AI_GROQ_FREE_TIER` / `AI_GEMINI_FREE_TIER` flag to be exactly `true`. Confirm the account/project tier before setting a flag, and revoke the confirmation if billing changes.
- OpenRouter uses `openrouter/free` by default or an explicitly configured `:free` model; paid model selections are ignored. Provider availability and free-tier quotas are external to this app.
- Receipt images are stored in the user's Supabase Storage account. The server downloads an image and may send it to the enabled image AI provider. Optional OCR.space processing receives image data or a temporary signed Storage URL (180 seconds).
- Receipt analysis may send OCR text, category names and the supplied card IDs/names/types to AI. Chat sends conversation messages and monthly financial totals/category summaries. Monthly analysis sends the requested financial summary/category data.
- This processing happens outside the app and is subject to each provider's terms and retention policies. Short Thai/English notices appear at receipt upload and in the assistant. Review extracted values before saving.

Never log request bodies, receipt text/images, signed URLs, tokens or API keys. Provider selection and processing logic are unchanged by the repository cleanup.

## API quotas

`lib/api/rateLimitPolicy.ts` is the single configuration source:

| Endpoint | Per-user limit |
| --- | --- |
| `/api/ai` | 30 requests/hour |
| `/api/ai/analyze` | 20 requests/hour |
| `/api/ai/receipt-analyze` | 40 requests/hour |
| `/api/ocr` | 20 requests/hour |

The `api_rate_limits` migration supplies atomic `check_rate_limit` decisions using `auth.uid()`; authenticated clients cannot access the table directly. Apply/review the migration before expecting quotas to work. Known denials return HTTP 429, a Thai message and `Retry-After`. Only RPC call failures fail open with a generic server log; malformed successful decisions return generic 500. Missing migrations therefore intentionally fail open and must be resolved before release.

## Needs human

- Recover/configure the missing demo and Playwright harness files if those scripts are needed. Offline unit tests do not replace full signup-to-report browser testing.
- Obtain the baseline schema and confirm the target environment's migration history before applying pending SQL. No database, secrets or deployment was changed by these review phases.
- Dashboard SQL totals remain deferred pending exact numeric-equivalence agreement; see `docs/phase-3-performance.md`. Existing backup restore remains non-atomic; see `docs/phase-2-security-and-robustness.md`.
