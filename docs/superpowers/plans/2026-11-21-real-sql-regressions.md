# Real SQL regression plan

Branch codex/fix-totals-migration-and-sql-tests; Phase 1 blocker fixed in b8a0591. Starting suite 105 tests, latest measured runner duration 1436.8481ms (not whole npm startup).

- [x] Phase 2: exact dev-only PGlite; minimal labelled baseline; every migration automatically applied; catalog/grants/idempotence, 12 golden cases, isolated trigger cases, quota roles and negative control. Run lint/tsc/test/dummy build/audit and commit.
- [x] Phase 3: pin NULL credit limit behavior and compare app prechecks; document caller-visible balance limits, legacy over-limit restore and required staging beyond PGlite. Run all gates and commit.
- [x] Phase 4: inspect CI; add/extend one read-only/no-secret/no-deploy workflow using Node24 (local version, no engines/nvmrc exists). Run all gates and commit.
- [x] Phase 5: round3 report, measured suite duration/count and negative output, PGlite-only limitations, all specified human actions. Run all gates and commit.

Ruling: only missing dependency/WebAssembly is visibly unavailable; migration/setup/assertion errors MUST fail, never skip. All SQL runs in in-memory PGlite, no Supabase.
Ruling: base migration and later finite-date ALTER are known one-shot history; replay in transactions and explicitly assert/report their failures, while replayable files must pass twice. Future unclassified non-rerunnable files fail until intentionally reviewed.
Ruling: one fresh database per file, each trigger scenario wrapped in BEGIN/ROLLBACK on clean schema so fixtures cannot pollute one another; concurrency remains untested (single connection).

Phase 2 evidence: PGlite0.5.17 exact dev-only; 34 SQL tests + existing105 =139 pass, 0skip, Node runner2846.42ms. All seven real migrations executed in PGlite; twelve golden cases match. Negative control fails as expected with42703 column s.payment_method does not exist. One-shot190900 and190930 replays explicitly reported. lint/tsc/dummy build pass; npm audit --omit=dev zero; app JS scan no PGlite and six entry bundle sizes unchanged. No Supabase/real-policy/concurrency test executed.

Phase 3 evidence: actual PGlite NULL-limit insert/increase accepted; same rows through actual TS getCardsWithBalance yield available=-2000, so POST/increasing PATCH predicate rejects positive amounts. This disagreement is documented, not changed. Caller-visible RLS undercount and legacy-overlimit restore documented; optional invented-policy illustration omitted (real policies unknown). Staging/deploy guides require npm test before migrations and retain mandatory staging. lint/tsc/build pass; 140/140 tests,0skip,3046.9483ms.

Phase 4 evidence: no pre-existing CI/engines/nvmrc found; workflow uses checkout/setup-node@v4, Node24 matching local, contents:read, dummy env, no secrets/deploy. Fresh npm ci succeeded; lint/tsc/build pass,140/140 tests,0skip,3202.5889ms. Production audit0, no PGlite across543 built app JS/trace files. GitHub Actions itself has not run. Historical document preambles explicitly distinguish old no-SQL evidence from current PGlite execution.

Phase 5 final evidence:140/140 tests(105existing+35PGlite),0skip,3146.8963ms runner; npm command wall3694ms. lint/tsc/dummy build/audit pass(audit0); guard543files noPGlite and all six measured entries unchanged. Independent reviewer found no actionable defect and independently ran35 SQL tests0skip2146.514ms. Negative control observed42703/payment_method; only permitted dashboard migration changed. Round3 report includes all specified human release gates and explicitly disclaims Supabase/RLS/concurrency/HTTP restore verification. No push/deploy/settings/secrets/database/history changes performed.
