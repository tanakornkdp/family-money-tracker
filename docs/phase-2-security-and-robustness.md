# Phase 2: security and robustness

Implemented on `codex/review-fixes-and-perf`, after Phase 1 commit `52b6409`.

- Receipt analysis reads at most 192 KiB including when Content-Length is absent or understated. Zod caps OCR at 20,000 characters, categories at 100 x 100 characters, cards at 50 with UUID/type/name validation. Malformed input returns 400; excessive bytes return 413.
- Both JSON AI responses are validated before returning. Financial advice arrays/text and scores are bounded; receipt card IDs must belong to the supplied card list. Invalid provider JSON/shape retains AI_ERROR.
- Four endpoints use the shared hourly configuration: chat 30, analysis 20, receipt analysis 40, OCR 20. Known denials return 429 and Retry-After. RPC failures alone fail open with a generic log. Malformed successful decisions return generic 500.
- New migration `20261120100000_api_rate_limits.sql` adds RLS-enabled private quota storage and atomic conflict updates. SECURITY DEFINER is necessary because authenticated users have no table privileges; auth.uid() determines identity and search_path is empty. Key/window bounds prevent arbitrary bucket growth; window duration participates in the primary key so direct calls cannot reset the hourly bucket by changing windows. Quota decisions do not roll a bucket backward if an older request waits on a lock.
- Shared error responses hide internal messages/details in the requested transaction, OCR and money-plan routes. Server logging is message-only with URL, credential and quoted-value redaction; intentional business errors are preserved.
- Backup GET/POST use nonredirecting authentication and return JSON 401. Restore behavior is otherwise unchanged.
- Session middleware uses getAll/setAll, forwards refreshed request cookies, and retains all cookie batches/options plus auth cache headers on normal and redirect responses. Reports and money-plans are protected at path boundaries.
- `/preview` remains intentionally public: its entire implementation permanently redirects to protected `/mobile` and reads no user data.
- Thai/English privacy notices appear in the shared receipt uploader and assistant message area. README documents external AI/OCR, temporary signed URLs and monthly financial summaries. Provider logic is unchanged.

Validation: 53 network-free node:test tests passed; npm run lint passed; npx tsc --noEmit passed; npm run build passed using NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy. Tests cover input limits, malformed/foreign-card AI output, all four quota guards, allow/deny/error/malformed quota decisions, error response privacy, backup 401 and multiple cookie refresh batches through normal/redirect responses. Independent review found no remaining blockers after malformed quota decisions were changed to fail closed. Node's existing typeless-package warning remains; no application lint/type/build errors.

## Needs human

- The migration was not applied and no real database was accessed. Review/apply it separately, then test simultaneous quota calls under two authenticated users (the 31st chat/21st analysis/41st receipt/21st OCR request must be denied), window reset/Retry-After, auth.uid() isolation and denial of direct table access. Until migration application, missing-RPC errors intentionally fail open.
- Optional 2.8 atomic restore is skipped: validating every restore table's deployed constraints/triggers and storage rollback behavior cannot be done safely from the partial TypeScript model alone. Existing restore remains non-atomic and must not be described as all-or-nothing. This phase changes only its authentication.
- No live providers, iOS session refresh, deployed RLS or Vercel configuration were exercised or changed. Existing migration history, secrets and the original checkout remain untouched.
