# Phase 4: repository hygiene

Branch: `codex/review-fixes-and-perf`. Base: Phase 3 commit `22d4ddb`.

- Removed unused `next.config.ts` boilerplate; the production build explicitly reports `Running next.config.js`. The active config still uses `output: 'standalone'` and its existing fixture/deployment guards are unchanged.
- Replaced the machine-specific development hostname with optional `ALLOWED_DEV_ORIGINS`, a trimmed comma-separated hostname list. Unset/empty values omit the option and retain Next.js defaults. Local VM checks cover unset, empty and comma-separated values and confirm standalone output remains set.
- Grep found no external imports/calls of `ai/assistant.ts`, `ai/prompts.ts` or `lib/supabase.ts`; only the dead assistant referenced its dead prompt builder. Removed those files and their legacy provider-key references. Active AI routing remains the existing server fetch implementation.
- Removed unused `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, and `groq-sdk` dependencies after import checks. npm removed 10 packages including unused transitive dependencies. Updated package-lock.json without changing application provider logic.
- Aligned `eslint-config-next` and its Next plugin with installed Next.js at 16.4.6 (previously config 16.2.9). The exact release was fetched from the registry after the offline cache lacked it.
- The dependency audit then found 7 moderate development-tool findings in the existing TypeScript ESLint/minimatch chain. A previewed, non-force compatible update moved typescript-eslint to 8.73.0 and minimatch to 11.0.9 without changing Next.js. npm now reports 0 vulnerabilities.
- Added `npm test` as `node --test tests/*.test.mjs`. Kept existing demo/E2E script definitions, explicitly documenting their missing prerequisites rather than inventing them.
- Added placeholder-only `.env.example` with all application/provider variables, optional dev origins and clearly separated managed/test variables. `.gitignore` now exempts only `.env.example` from its existing `.env*` ignore rule. No real environment file or secret was read/copied/changed.
- Replaced the create-next-app README with app description, Node/environment setup, desktop/mobile routes, migration instructions and missing-baseline caveat, script status, standalone packaging, AI/OCR privacy/data flow, and quota configuration/failure behavior.

Validation: npm test passes 63 offline tests; npm run lint passes under the aligned config; npx tsc --noEmit passes; npm run build passes with NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy. The build confirms next.config.js. npm audit reports 0 vulnerabilities. Dependency manifest/lock checks confirm removed SDKs are absent and Next/config/plugin versions match. Independent read-only review found no important omissions. Node's existing typeless-package warning remains.

## Needs human

- `dev:demo` points to absent/uncommitted `tests/start-finance-demo.mjs`.
- No Playwright configuration is committed. Existing `test:e2e` is not a verified browser harness. `tests/report-supabase.mjs` additionally imports absent/uncommitted `finance-demo.mjs` and `merge-finance-backup.mjs`; these were not recreated.
- The repository has incremental migrations, not the complete baseline schema or Supabase project config. A fresh environment needs the owner's baseline/history before any migration can be applied. No database or migration history was touched.
- Existing review deferrals (atomic restore, exact SQL dashboard aggregates and live database/device verification) remain in the Phase 2/3 reports. No push, deployment, Vercel configuration or original checkout changes were made.
