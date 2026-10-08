# Auth Lifecycle on the Public Origin

This document defines how the Supabase Auth lifecycle maps onto Flipper's
configured public origin during the Vercel-to-Dokploy migration phase, what the
repository and unattended live checks prove, and which checks remain
operator-gated. The existing Supabase project (`tetsknwxsintaitiufgx`, Flipper
v2) remains the authoritative production service for Auth; nothing here
modifies its schema, policies, token model, or deal semantics.

## Origin Contract (Migration Phase)

The configured public origin is `https://beta.flipper.mattiaswiberg.com`
(`site-url.config.json`, required `NEXT_PUBLIC_SITE_URL`, strict startup
validation). During the migration the apex `https://flipper.mattiaswiberg.com`
stays on Vercel; see `docs/dokploy.md` for the final cutover steps.

All Auth origin behavior uses the configured origin:

- User-facing Auth links and canonical metadata resolve on the configured
  origin. Production never derives its origin from `Host`,
  `X-Forwarded-Host`, `X-Forwarded-Proto`, or `Origin` request headers; only
  local development derives `http://localhost:3000` (or the configured local
  value) from the local request.
- Sign-up verification sends `emailRedirectTo`
  `https://beta.flipper.mattiaswiberg.com/auth/callback`
  (`app/actions.ts` `signUpAction`).
- Password recovery sends
  `https://beta.flipper.mattiaswiberg.com/auth/callback?redirect_to=%2Fauthenticated%2Freset-password`
  (`app/actions.ts` `forgotPasswordAction`).
- `/auth/callback` exchanges the authorization code and returns only to safe
  local paths on the configured origin: `/authenticated/deals` by default and
  `/authenticated/reset-password` for recovery. Every hostile `redirect_to`
  is confined to the configured origin (`utils/auth.ts` `getSafeRedirectPath`,
  `getSafeRedirectUrl`): missing, non-path, and literal-escape inputs (absolute
  URLs, scheme downgrade, protocol-relative and backslash forms, untrusted or
  look-alike hosts) as well as normalization escapes (dot-segment and
  empty-segment forms such as `/.//host`, `/%2e//host`, `/x/..//host`) fall
  back to `/authenticated/deals`, while percent-encoded forms that normalize
  to same-origin results (encoded slashes, encoded traversal segments, encoded
  backslashes) are preserved as on-origin paths. Both helpers re-validate the
  normalized path and the resolved URL origin, so no input produces an
  off-origin redirect. The fallback target itself is pinned by the Jest
  suites; the live hostile `redirect_to` HTTP checks exercised the
  no-valid-code error path.
- The session proxy (`utils/supabase/middleware.ts`) redirects unauthenticated
  `/authenticated/*` access to `/log-in` on the configured origin, redirects
  authenticated users away from `/`, `/log-in`, and `/sign-up` to
  `/authenticated/deals`, and refreshes expiring session cookies on both
  redirect and pass-through responses.

## Supabase Auth Provider Configuration (operator-owned)

Configure in the existing Supabase project's Auth settings (Dashboard
`https://supabase.com/dashboard/project/tetsknwxsintaitiufgx/auth/configuration`,
or the equivalent Management API call). The expected state:

| Setting            | Required value                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Site URL           | `https://beta.flipper.mattiaswiberg.com`                                                                              |
| Redirect allowlist | `https://beta.flipper.mattiaswiberg.com/` and `https://beta.flipper.mattiaswiberg.com/**` (parity with the apex pair) |
| Email SMTP         | A working SMTP provider so verification and recovery messages are delivered                                           |
| Email templates    | `emails/*.html` absolute asset URLs pinned to the migration-phase beta origin                                         |

The allowlist breadth matters: recovery links return through
`/auth/callback?redirect_to=...` while verification links return through the
bare `/auth/callback`. Both must be accepted. An exact-only entry such as
`https://beta.flipper.mattiaswiberg.com/auth/callback` is too narrow and will
fail the recovery flow.

## Verified Without Credentials (2026-10-08)

These checks passed unattended against the production deployment and are
reproducible without provider access. They are not a substitute for the
operator-gated checklist below.

- `npx tsc --noEmit`, `npx jest --runInBand` (22 suites, 110 tests), the focused
  Prettier check on changed files, and the production `npm run build` with the
  canonical build input all pass.
- Focused Jest coverage: `utils/auth.test.ts` (password-recovery `redirect_to`
  handling and hostile inputs at the configured beta origin, including
  normalization escapes, forwarded-header origin selection in production,
  local-origin derivation in development),
  `app/auth/callback/route.test.ts` (callback redirect targets for safe and
  hostile `redirect_to` values, failed and missing code exchanges, forwarded
  proxy headers in production), `utils/supabase/middleware.test.ts`
  (unauthenticated protected-route redirect to the configured origin, cookie
  session refresh on the proxy response, authenticated redirect to deal
  discovery from the auth surfaces, public pass-through, and the exception
  fallback to the login redirect), and `app/actions.test.ts` (recovery and
  verification callback URL construction on the beta origin, password update
  on the reset surface, failed sign-in, sign-out to the login page).
- Live browser checks (Playwright) on `https://beta.flipper.mattiaswiberg.com`
  at desktop (1280x800) and mobile (375x812) viewports: `/log-in`, `/sign-up`,
  and `/forgot-password` render and fit the mobile layout; keyboard-only Tab
  traversal and Enter submission work on every form; client-side validation
  (`Passwords don't match`, native email validation) blocks bad input without a
  server request; a wrong-password sign-in round-trips to
  `/log-in?error=Invalid%20login%20credentials` and renders the `role=alert`
  message; unauthenticated `/authenticated/deals` lands on `/log-in`; zero
  browser console errors. The password-recovery probe submitted
  `flipper-issue58-probe@example.invalid` (non-routable domain, no delivery
  possible) and received the success state with the beta `redirect_to` —
  the request was accepted and no redirect-URL error surfaced. This alone
  does not prove allowlist acceptance: Supabase can silently fall back to
  the Site URL for a non-allowlisted `redirectTo` while still succeeding, so
  allowlist acceptance is established only by the provider read-back
  (operator check 1) or a delivered link returning through the beta
  callback (operator check 2).
- Live HTTP checks: `/auth/callback` with missing code, invalid code, and
  hostile `redirect_to` inputs (absolute URL, protocol-relative, encoded
  traversal, encoded backslashes) always redirects to
  `https://beta.flipper.mattiaswiberg.com/log-in?error=...`; `/authenticated/*`
  redirects to `https://beta.flipper.mattiaswiberg.com/log-in`; forwarded
  `X-Forwarded-Host`/`X-Forwarded-Proto` values never change any redirect or
  canonical target; served `/log-in`, `/sign-up`, and `/forgot-password` pages
  declare canonical links on the beta origin.

## Operator-Gated Verification (NOT verified here)

The following require the production Supabase project, a real mailbox, and an
operator-created test identity. None of these are claimed as passed.

1. Supabase provider configuration read-back: open Auth URL Configuration and
   confirm Site URL is `https://beta.flipper.mattiaswiberg.com` and the
   redirect allowlist contains exactly
   `https://flipper.mattiaswiberg.com/`, `https://flipper.mattiaswiberg.com/**`,
   `https://beta.flipper.mattiaswiberg.com/`, and
   `https://beta.flipper.mattiaswiberg.com/**` (no localhost or Vercel
   entries). Confirm the SMTP provider delivers test messages.
2. Real sign-up and verification email: with operator approval to create one
   controlled account, sign up at
   `https://beta.flipper.mattiaswiberg.com/sign-up`, receive the verification
   email via SMTP, and follow its link. Expected: the link targets
   `https://beta.flipper.mattiaswiberg.com/auth/callback` and the callback
   lands on `https://beta.flipper.mattiaswiberg.com/authenticated/deals` —
   never localhost, Vercel, or any untrusted origin.
3. Controlled sign-in and session refresh: sign in at
   `https://beta.flipper.mattiaswiberg.com/log-in` with the verified test
   account, reach `/authenticated/deals`, leave the tab idle past the Supabase
   access-token TTL (default one hour), then reload a protected route.
   Expected: the session refreshes behind the proxy without a new login and
   protected routes stay protected.
4. Real password recovery: request recovery at
   `https://beta.flipper.mattiaswiberg.com/forgot-password` for the test
   account, follow the delivered link (expected: return through
   `https://beta.flipper.mattiaswiberg.com/auth/callback?redirect_to=%2Fauthenticated%2Freset-password`,
   land on `/authenticated/reset-password`), set a new password, and sign in
   with it at `/log-in`.
5. Sign-out: with the authenticated session, sign out from the user menu.
   Expected: return to `https://beta.flipper.mattiaswiberg.com/log-in`, session
   cookies cleared, and `/authenticated/deals` redirects to `/log-in`
   afterwards. (Repository tests pin the `/log-in` redirect target of
   `signOutAction`; the live path needs a session.)

Artifacts that would unblock automating these checks, provided out-of-band
from the production Supabase project: one operator-created verified test
account (email and password) and read access to its mailbox (IMAP/POP3
credentials or a mailbox API). With those, checks 3-5 become scriptable; check
2 additionally needs operator approval for one account creation per run, and
check 1 needs a read-only Supabase Management API key or a dashboard
read-back.
