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
  `getSafeRedirectUrl`): inputs that URL normalization collapses into
  protocol-relative `//host` paths (literal escapes such as absolute URLs,
  scheme downgrade, protocol-relative and double-backslash forms, untrusted or
  look-alike hosts, and dot-segment/empty-segment normalization escapes such
  as `/.//host`, `/%2e//host`, `/x/..//host`) fall back to
  `/authenticated/deals`, while all forms that normalize to same-origin
  results (encoded slashes, encoded traversal segments, encoded backslashes,
  literal single-backslash dot-segment forms) are preserved as on-origin
  paths. Both helpers re-validate the normalized path and the resolved URL
  origin, so no input produces an off-origin redirect. The fallback target
  itself is pinned by the Jest suites; the live hostile `redirect_to` HTTP
  checks exercised the no-valid-code error path.
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

- `npx tsc --noEmit`, `npx jest --runInBand` (22 suites, 111 tests), the focused
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
  browser console errors.
- Live HTTP checks: `/auth/callback` with missing code, invalid code, and
  hostile `redirect_to` inputs (absolute URL, protocol-relative, encoded
  traversal, encoded backslashes) always redirects to
  `https://beta.flipper.mattiaswiberg.com/log-in?error=...`; `/authenticated/*`
  redirects to `https://beta.flipper.mattiaswiberg.com/log-in`; forwarded
  `X-Forwarded-Host`/`X-Forwarded-Proto` values never change any redirect or
  canonical target; served `/log-in`, `/sign-up`, and `/forgot-password` pages
  declare canonical links on the beta origin.

## Live Auth Lifecycle Evidence (2026-10-08, controlled test identity)

Run against the production deployment with operator authorization to create
exactly one throwaway account (`flipper-smoke-…@ilkovbi.resend.app`) through
the live sign-up form, with its mailbox in the controlled Resend test inbox.
Credentials are held out of band and are never committed or documented.

- Sign-up and verification: the sign-up form rendered its success state and
  the verification email ("Confirm Your New Account") was delivered via SMTP
  to the controlled inbox at `2026-10-08T11:21:33Z`. Its link shape is
  `https://tetsknwxsintaitiufgx.supabase.co/auth/v1/verify?token=…&type=signup&redirect_to=https://beta.flipper.mattiaswiberg.com/auth/callback`
  — the callback target is the beta origin's bare `/auth/callback`, not the
  apex, not localhost. Following the link returned through
  `/auth/callback` to `https://beta.flipper.mattiaswiberg.com/authenticated/deals`
  (signed-in deals surface). No untrusted origin appeared anywhere in the
  chain. This is also the end-to-end proof that the Supabase redirect
  allowlist accepts the beta callback URL: the delivered link's `redirect_to`
  was honored rather than falling back to the Site URL.
- Sign-in: signing in at `/log-in` reached `/authenticated/deals`, and the
  cookie session round-trips through the proxy across full reloads of
  protected routes (the `getClaims`/cookie-copy session seam runs on every
  request and is covered by the middleware tests). A refresh past the
  access-token TTL is time-gated and remains an operator check below.
- Password recovery: the recovery request rendered its success state and the
  "Reset Your Password" email arrived at `2026-10-08T11:26:53Z` with link
  shape
  `https://tetsknwxsintaitiufgx.supabase.co/auth/v1/verify?token=…&type=recovery&redirect_to=`(URL-encoded)`https://beta.flipper.mattiaswiberg.com/auth/callback?redirect_to=%2Fauthenticated%2Freset-password`.
  Following the link landed on
  `https://beta.flipper.mattiaswiberg.com/authenticated/reset-password`,
  submitting the new password rendered `Password updated`, and signing in
  with the updated credential reached `/authenticated/deals`. This
  end-to-end proves the recovery `redirect_to` is accepted by the allowlist
  and the callback returns only to the safe local reset surface.
- Sign-out: the account menu's Log out cleared the session and left the
  authenticated surface. On the deployed release (which predates this
  change) the landing page after sign-out is the public home page `/`; this
  change routes client sign-out to `/log-in` (`context/AuthContext.tsx`),
  matching the server-side `signOutAction` and the acceptance criterion.
  Re-checking the landing page on `/log-in` after the next deployment is a
  remaining operator check.
- Observation (cosmetic, operator-owned): the Supabase-hosted email
  templates still reference apex asset URLs
  (`https://flipper.mattiaswiberg.com/favicon.ico`, the `…//documentation`
  footer link) while the repository `emails/*.html` pin the beta origin. The
  Auth callback link itself is correct; syncing the hosted templates is an
  operator action (see `docs/dokploy.md` cutover step 4).

## Remaining Operator-Gated Checks (NOT verified here)

1. Supabase provider configuration read-back: open Auth URL Configuration and
   confirm Site URL is `https://beta.flipper.mattiaswiberg.com` and the
   redirect allowlist contains exactly
   `https://flipper.mattiaswiberg.com/`, `https://flipper.mattiaswiberg.com/**`,
   `https://beta.flipper.mattiaswiberg.com/`, and
   `https://beta.flipper.mattiaswiberg.com/**` (no localhost or Vercel
   entries), and that the SMTP provider is the one that delivered the two
   lifecycle emails above. The functional behavior is proven by the lifecycle
   evidence; only the settings read-back remains.
2. Session refresh past the access-token TTL: leave the verified account
   signed in and idle past the Supabase access-token TTL (default one hour),
   then reload a protected route. Expected: the session refreshes behind the
   proxy without a new login and protected routes stay protected.
3. Sign-out landing after deployment: after this change is deployed, sign out
   from the user menu and confirm the landing is
   `https://beta.flipper.mattiaswiberg.com/log-in` (the deployed release
   predates the fix and lands on `/`).
4. Email template asset sync (cosmetic): sync the repository `emails/*.html`
   (beta-origin asset URLs) into the Supabase Auth email settings so template
   branding links stop referencing the apex.
