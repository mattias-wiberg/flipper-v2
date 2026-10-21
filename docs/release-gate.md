# Release Gate

The release gate is the repeatable proof that a candidate release of Flipper is a
**known-good release**: clean installation, typechecking, tests, production
build, container startup, and the deployed HTTPS/Supabase/Umami workflows,
exercised as a black box. It never mocks Dokploy, Supabase, or Umami internals,
and it never changes the checked-in golden fixture.

It complements two narrower checks:

- `npm run verify:deployment` — the secret-free public boundary check (health,
  public pages, canonical metadata). The gate reuses the same assertions.
- The manual operator checklist in [`docs/dokploy.md`](dokploy.md) — DNS/TLS,
  provider configuration read-back, email delivery, dashboard access, rollback.

## When to run it

Run it after Dokploy reports the candidate release running and before that
release is marked known-good. Keep the previous release available until the
verdict is ACCEPTED (see Rollback in `docs/dokploy.md`).

```sh
npm ci
npx playwright install chromium   # once per machine; needed for Auth and analytics checks
npm run gate:release              # deployed checks
```

Full evidence, including a clean install and the production image starting
locally, is one command on a disposable checkout:

```sh
RELEASE_GATE_LOCAL=1 RELEASE_GATE_INSTALL=1 RELEASE_GATE_CONTAINER=1 \
  npm run gate:release
```

`RELEASE_GATE_INSTALL=1` runs `npm ci`, which replaces `node_modules`; use a
disposable checkout (a release worktree) rather than a working tree you are
editing. `RELEASE_GATE_CONTAINER=1` requires Docker and adds a full image build.

Phase selection:

```sh
npm run gate:release -- deployed   # deployed evidence only (the default)
npm run gate:release -- local      # repository evidence only, before deploying
npm run gate:release -- all        # both (RELEASE_GATE_LOCAL=1 does the same by default)
```

npm 11 treats unknown `--flags` as its own configuration, so the phase is a bare
word. The gate also accepts `RELEASE_GATE_LOCAL=1` to select both phases without
arguments.

A local-only run says so: its verdict covers the local phase, not a deployment.

## Exit codes and verdicts

| Verdict | Meaning | Exit |
| ------- | ------- | ---- |
| `ACCEPTED` | Every selected required check passed. Optional skips (email delivery) are printed. | `0` |
| `REJECTED` | A required check failed, or required evidence was skipped. | `1` |
| `NOT-RUN` | No target was configured and no phase was selected. Nothing was contacted; this is a dry run, not evidence. | `0` |

The gate prints one `PASS` / `FAIL` / `SKIP` line per check with `[required]` or
`[optional]`, then the counts and the final verdict. Every executed result is
recorded in `release-gate-report.json` (override with `RELEASE_GATE_REPORT`),
which is git-ignored and contains the candidate commit, the target origin, the
exact command, the selected phases, and each result. Diagnostics never contain
environment values: known secrets are replaced with `[redacted]`, URL query
strings and hashes are stripped from URLs, and ingestion tokens in paths appear
as `<token>`.

## Environment

Secrets are read from the process environment only. Never commit them, paste
them into an issue, or put them in the repository; only the names below are
documented.

| Variable | Needed for | Notes |
| -------- | ---------- | ----- |
| `RELEASE_BASE_URL` | all deployed checks | Origin under test, e.g. `https://beta.flipper.mattiaswiberg.com`. Unset means no deployed check runs (dry run). `https` is required; `http` is only accepted for `localhost`/`127.0.0.1`. The expected canonical origin always comes from `site-url.config.json`, so a deployment built for another origin is rejected. |
| `SMOKE_EMAIL`, `SMOKE_PASSWORD` | Auth lifecycle | Controlled, verified account. Both or neither; partial values skip Auth by name. |
| `SMOKE_INGESTION_TOKEN` | ingestion probes, golden replay | Dedicated validation token (v4 UUID) that starts and ends with no persisted rows. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | persisted-order proof, golden replay, data independence | The existing production project. Used read-only plus deletion of the dedicated token's own rows (pre-replay cleanup). |
| `UMAMI_URL`, `UMAMI_USERNAME`, `UMAMI_PASSWORD`, `UMAMI_WEBSITE_ID` | Umami surface, page view, recorded privacy | Operator account and the Flipper website identifier. |
| `RELEASE_GATE_LOCAL` | `local` phase | Selects the local phase in addition to deployed checks; combine with `RELEASE_BASE_URL`, or use `npm run gate:release -- local` for local evidence alone. |
| `RELEASE_GATE_INSTALL` | `local.install` | Runs `npm ci`. |
| `RELEASE_GATE_CONTAINER` | `local.container` | Enables the Docker build/run check. |
| `RELEASE_GATE_REPORT` | evidence path | Default `release-gate-report.json` in the current directory. |

Example (PowerShell and POSIX shells both accept environment variables set in
your own shell profile, a protected CI secret store, or an ignored `.env` file
that you source yourself):

```sh
export RELEASE_BASE_URL=https://beta.flipper.mattiaswiberg.com
export SMOKE_EMAIL=... SMOKE_PASSWORD=...
export SMOKE_INGESTION_TOKEN=...
export NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
export UMAMI_URL=https://umami.mattiaswiberg.com UMAMI_USERNAME=... UMAMI_PASSWORD=... UMAMI_WEBSITE_ID=...
npm run gate:release
```

## What the gate proves

### Local phase

| Check | Required | Proves |
| ----- | -------- | ------ |
| `local.install` | with `RELEASE_GATE_INSTALL=1` | `npm ci` installs the committed lockfile cleanly. |
| `local.typecheck` | yes | `tsc --noEmit` passes. |
| `local.tests` | yes | Jest passes; results are compared with `scripts/release-gate/jest-baseline.json`. |
| `local.build` | yes | `next build` succeeds with `NEXT_PUBLIC_SITE_URL` set to the configured origin. |
| `local.container` | with `RELEASE_GATE_CONTAINER=1` | The committed Dockerfile builds, the container starts as the non-root runtime, and it serves the exact health contract. The image is built with placeholder public Supabase values because the build only needs their presence; no secret is passed. |

The build runs with placeholder `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` values when they are absent, because the shared
layout creates a browser client while prerendering. The container check passes
the same placeholders as runtime variables (the placement Dokploy uses) and
asserts the runtime user is not root; no real secret is needed for either step.
The deployed checks, not the build, prove the real project.

#### Baseline failures

`scripts/release-gate/jest-baseline.json` lists tests that are known to fail
before the candidate change. A listed failure is reported in the check detail
as a documented baseline failure and does not reject the release; any other
failure rejects it, and the gate also flags a baseline entry that now passes
("update jest-baseline.json" in the detail). The baseline is currently empty:
the 2026-09-20 failures recorded in [`mocker/README.md`](../mocker/README.md)
(`utils/items.test.ts`, `lib/upgradeCosts.test.ts`) were fixed before this gate
landed. Never add an entry to hide a regression, and never weaken an assertion.

### Deployed phase

All deployed checks contact `RELEASE_BASE_URL` directly. The canonical origin
assertions come from `scripts/deployment-boundary.js`, the same module behind
`npm run verify:deployment`.

| Check | Required | Proves |
| ----- | -------- | ------ |
| `deployed.health` … `deployed.sitemap` | yes | Exact health contract (`200`, `{"status":"ok"}`, `Cache-Control: no-store`), home/documentation over HTTPS, and canonical links, Open Graph/Twitter metadata, JSON-LD, manifest, robots, and sitemap all on the configured origin. |
| `deployed.protected-access` | yes | Unauthenticated `/authenticated/deals` redirects to `/log-in` on the configured origin, even with injected `X-Forwarded-Host`/`X-Forwarded-Proto`. |
| `deployed.callback-origin` | yes | `/auth/callback` with a missing code, hostile `redirect_to` (absolute, protocol-relative), and spoofed forwarded headers never leaves the configured origin. |
| `deployed.stateless-boundary` | yes | The development recorder returns `404` in production: the running service does not need local application files. |
| `deployed.data-independence` | yes | The existing Supabase `orders` table is readable directly, independent of the container filesystem. |
| `deployed.auth-lifecycle` | yes (with account) | Real browser: sign-in with the controlled account reaches `/authenticated/deals`; an expired access token is refreshed by the deployed session proxy while the protected page still renders; sign-out clears the session and returns to `/log-in`; the forgot-password form accepts the reset request. |
| `deployed.auth-signin`, `deployed.session-refresh`, `deployed.auth-signout`, `deployed.password-reset` | sub-results | Recorded individually so a failure names the step. |
| `deployed.password-reset-email` | optional | Email delivery stays operator-gated: without a mailbox adapter the gate skips it and says so instead of claiming it. |
| `deployed.ingestion-invalid-token` | yes | An unknown token is rejected with `401 Invalid token`. |
| `deployed.ingestion-malformed-json` | yes | Malformed JSON is rejected with `400 Invalid JSON`. |
| `deployed.ingestion-malformed-body` | yes | A malformed order body returns `400` with `Invalid body format` and issue details. |
| `deployed.ingestion-unusable-item` | yes | A valid batch with one order whose `ItemTypeId` has no tier marker is accepted with `200 Ingestion successful`, warns past that order, and persists exactly the valid orders. |
| `deployed.golden-replay` | yes | The dedicated token's rows are cleared, the checked-in raw capture is replayed through `mocker/sendOrders.js` against the deployed base URL with 0 failures, `mocker/getOrders.js --compare` matches the checked-in expected fixture byte for byte, and the expected fixture's SHA-256 is unchanged before and after. |
| `deployed.analytics-tracker` | yes | The deployed page renders the Umami tracker for the configured website with `data-domains`, `data-exclude-search`, `data-exclude-hash`, `data-do-not-track`, and no identity attribute; when `UMAMI_URL` is set, the script origin must match it. |
| `deployed.umami-surface` | yes (with Umami) | `GET /` returns the Umami login page (no basic-auth challenge), `/script.js` is served as JavaScript, and the operator API (`/api/websites`) reaches the configured website. |
| `deployed.analytics-beacons` | yes | Real browser beacons captured from the deployed pages contain only allowlisted fields, no emails/JWTs/cookies/event identity, and the tracked URL of a page loaded with `?query` and `#hash` keeps neither. |
| `deployed.analytics-pageview` | yes (with Umami) | A new page view for `/` appears in Umami's own API within the gate window (count delta, 15-minute window). |
| `deployed.analytics-recorded-privacy` | yes (with Umami) | Recorded URL groups and (when the endpoint exists) recorded events in the last 15 minutes contain no sensitive values. |
| `deployed.telemetry-outage` | yes | With the Umami script and beacons blocked in the browser, the home page, login form, and `/api/health` still work: a telemetry outage is not a process failure. |

### Golden replay contract

The gate reuses the parameterized tooling from #59 and never regenerates
`mocker/data/marketorders.expected.json`; `mocker/getOrders.js` refuses to write
to it. The replay needs a real Git LFS checkout of
`mocker/data/marketorders.raw.jsonl`; when the file is an LFS pointer the check
skips with `git lfs pull` as the operator action.

Ingested rows live in the existing project's rolling 60-minute window
(`old_order_cleanup`). The gate clears the dedicated token's rows before the
replay and deletes them again afterwards; if the cleanup call fails, the
scheduled job removes them within 70 minutes. The replay takes several minutes
(5,131 batches) and the export comparison must finish inside that window.

### Restart and replacement

A deployed run is executed against a freshly deployed container, so a passing
deployed run is the replacement evidence: the new container serves health,
public pages, Auth, and ingestion, and reads the existing Supabase data. The
gate additionally proves the two properties that make a restart safe:

1. all market-order data the application reads lives in Supabase and is readable
   without the container (`deployed.data-independence`), and
2. the production service does not depend on local application files
   (`deployed.stateless-boundary`), and a telemetry outage does not make the
   process unhealthy (`deployed.telemetry-outage`).

The restart itself remains an operator action in Dokploy. Perform it, then re-run
the deployed phase against the same origin; the gate records the new candidate
commit and the results, and the Supabase rows must still be reachable. Rollback
stays an explicit operator action (`docs/dokploy.md`).

## Reading the evidence

```text
PASS  deployed.health                      [required]  health matches the configured origin contract
...
SKIP  deployed.password-reset-email        [optional]  email delivery is operator-gated: ...
...
22 passed, 0 failed, 2 skipped for the deployed phase(s)
Release gate: ACCEPTED — 22 required check(s) passed
```

`ACCEPTED` means the selected required checks passed for the recorded candidate
commit and origin. `REJECTED` lists the failing or skipped required checks; fix
the cause and re-run before marking the release known-good. `NOT-RUN` means no
target was configured, so nothing was contacted — it is a dry run.

## Known limits (deliberate)

- **Session refresh** is proven by aging the real access token in the browser
  session cookie and observing the deployed proxy issue a refreshed session, not
  by idling for the wall-clock token TTL. The TTL observation stays in the
  operator checklist (`docs/auth.md`).
- **Page-view attribution** uses the Umami API's URL count delta in a 15-minute
  window. If the operator excludes the gate's egress IP in Umami ("Exclude my
  own visits") the delta stays flat; run the gate from a non-excluded machine.
- **Telemetry outage** is simulated by blocking the tracker and its beacons in
  the gate's browser, not by stopping the Umami stack.
- **Invalid-token rejection alone** cannot distinguish an unknown token from a
  broken runtime service-role credential, because the route maps both to
  `401 Invalid token` (see `docs/ingestion.md`). A broken credential still
  rejects the release: the valid-batch persistence check and the golden replay
  fail in that case.
- **Email delivery** (verification and reset messages, and the callback origin
  inside them) needs a controlled mailbox and stays operator-gated.
- **DNS/TLS, Supabase Auth settings read-back, Umami 2FA/dashboard access,
  backup/restore rehearsal, Dokploy deployment history and rollback** remain
  operator checks in `docs/dokploy.md`, `docs/auth.md`, and `docs/umami.md`.
- The gate does not deploy, roll back, restart, or modify provider configuration.
