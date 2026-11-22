# Registration OTP implementation and setup

## Goal and design
Keep password-based accounts, replace the signup confirmation link with an email code entered on /register, and add a second password field with independent show/hide controls. Preserve existing Thai/English and light/dark controls. No schema changes, new email providers, fees, admin keys, or disabling email verification.

Flow: email + password + matching confirmation -> Supabase auth.signUp -> pending OTP form -> auth.verifyOtp({email, token, type: "email"}) -> confirmed session -> user opens dashboard. Failed/missing/expired codes never show success. Resend uses auth.resend({type: "signup",email}) with a 60-second UI cooldown; server quotas remain authoritative. Changing email clears the code; passwords are cleared after signup and never stored by application code. A refresh restarts signup; pending credentials/codes are not persisted.

## Implementation plan
- [x] Reproduce missing registration preferences and read existing authentication/providers.
- [x] Pin matching-password, email, OTP format/leading-zero and safe localized error logic with node tests.
- [x] Reuse Input and lucide Eye/EyeOff in a PasswordInput with independent state and aria labels.
- [x] Implement signup/verify/resend/edit-email/success states; suppress duplicate in-flight submits.
- [x] Provide the reviewed confirmation template below and document external configuration.
- [x] Run browser journey with intercepted Supabase responses (no real email or account creation); check error, resend, success and both locales/themes at mobile sizes.
- [x] Run lint, type checking, complete node suite and production build.
- [ ] Configure real Supabase delivery/template and verify a real inbox before production release.

## Required hosted Supabase setup (not a SQL migration)
Project: zgcarubkhhlzqicsrdtq. Apply to staging first, then production.
1. Authentication > Sign In / Providers > Email: keep **Confirm email enabled**. Do not disable it to bypass delivery.
2. Authentication > Email Templates > Confirm signup: set subject to `รหัสยืนยัน / Verification code — Family Money Tracker` and paste [confirmation.html](../supabase/templates/confirmation.html). It uses `{{ .Token }}` instead of `{{ .ConfirmationURL }}`. Save the template; merely committing this HTML does not update hosted configuration. Do not change Magic Link or password-reset templates for this feature.
3. Authentication > Email / SMTP Settings: configure an approved custom SMTP provider and verified sender. Enter the provider password in Supabase directly, never in chat, source, NEXT_PUBLIC env variables or client code. Leave Supabase quotas in place and check sender/domain verification in the provider dashboard.
4. Request one signup to an inbox you control, receive the code, enter it in /register, then sign in using the password. Test resend, an incorrect/expired code and confirmed-session persistence. Do not run synthetic signup against arbitrary customer email addresses.
5. If mail does not arrive, check spam, Auth logs and the provider delivery/bounce logs. A successful signup API response is not proof of inbox delivery; existing-account responses can also be deliberately indistinguishable.

Supabase default mail is restricted to organization-team recipients and has a very low quota; switching from a link to OTP does not remove this delivery restriction. Custom SMTP settings/template were not accessible through the current connected tools. No SMTP credentials were requested or extracted. No paid service was enabled.

## Verification boundaries
The node tests exercise pure logic without network. Browser checks intercept Auth endpoints and prove UI/SDK request shape and error handling; they do not prove live mail delivery, server token expiration/replay prevention or a real confirmed session. These remain hosted Supabase/inbox checks. Do not describe the OTP rollout as complete until hosted setup and an inbox test pass.

References: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [verifyOtp signup example](https://supabase.com/docs/reference/javascript/auth-verifyotp), [resend signup](https://supabase.com/docs/reference/javascript/auth-resend), [custom SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp).

## Recorded results
- Node: 144/144 tests passed (4 new registration logic tests).
- Chrome and Playwright WebKit: all four TH/EN browser journeys passed with intercepted Auth endpoints; independent eye buttons, password mismatch prevents requests, SMTP rejection stays on signup, invalid code stays on OTP, resend cooldown/request, edit-email password clearing, leading zeroes, confirmed-session success, dark theme, 320/390/844px overflow.
- Explicit focus management added after review: OTP input, email input on back, and success heading.
- WebKit interception requires serviceWorkers: block; otherwise the PWA service worker can bypass test routing. No test-only fetch patch exists in application code.
- No real inbox delivery or hosted SMTP/template update was executed. OTP production release is pending hosted configuration and a live inbox test.

Run browser tests against a separate local build with dummy Supabase URL https://example.supabase.co and key dummy:
```powershell
$env:REGISTRATION_TEST_URL="http://127.0.0.1:3024"
node tests/registration-browser.mjs
```
The script requires installed Chrome and Playwright WebKit. It fails visibly if either runtime is unavailable. It is not included in npm test because it requires a running local app/browser; npm test remains network-free.

## Existing-account recovery fix
The signup screen now routes Supabase duplicate errors (user_already_exists/email_exists) or its sanitized duplicate response (empty role plus explicitly empty identities, without a session) to an existing-account notice. It clears password/confirmation/code and focuses the notice, with direct Log in and Forgot password links plus a way back to use another email. Missing/ambiguous metadata, invited accounts and unrelated service errors are not classified as existing. New and pending/unconfirmed accounts retain the OTP flow. No admin lookup, public email-search endpoint, auth setting or database change was introduced.

The owner reported saving Gmail SMTP and the bilingual OTP template. OTP UI was deployed at cec7fa2. The latest investigated signup was a repeated signup against a confirmed existing account, so that request did not test live mail delivery. Actual inbox delivery remains unverified.

Additional tests: three network-free existing-response cases; both obfuscated and explicit duplicate responses in all Chrome/WebKit TH/EN browser journeys, including recovery link destinations, no OTP requests and focus/cleared passwords on returning.
