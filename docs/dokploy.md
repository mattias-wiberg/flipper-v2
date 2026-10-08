# Dokploy Deployment Runbook

This runbook deploys only the Flipper web service. The existing Supabase
project remains the authoritative production service for Auth, tokens, orders,
row-level access, and cleanup. Do not create or select another production
Supabase project as part of this deployment.

## Public Origin Contract (Migration Phase)

During the migration from Vercel to the home-lab Dokploy deployment the
application runs at `https://beta.flipper.mattiaswiberg.com`. That is the
configured public origin for this phase:

- `NEXT_PUBLIC_SITE_URL` must be exactly
  `https://beta.flipper.mattiaswiberg.com` at build time and runtime. Startup
  validation (`scripts/validate-production-env.mjs`) rejects any other value
  and names the variable only; production never falls back to `VERCEL_URL` or
  `localhost`.
- The apex `https://flipper.mattiaswiberg.com` stays on Vercel until final
  cutover and remains the documented final canonical origin. During the
  migration the apex keeps serving the existing Vercel release.
- All origin-aware behavior (canonical and metadata links, `robots.txt`,
  `sitemap.xml`, the web manifest, the Auth callback and safe-redirect
  validation, and middleware host handling) uses the configured origin from
  `site-url.config.json`, the single source of truth.

Final cutover flips the configured origin back to the apex in one operator
session:

1. Set `canonicalSiteUrl` in `site-url.config.json` back to
   `https://flipper.mattiaswiberg.com` and update the migration-phase tests,
   documentation, and Supabase email templates (`emails/*.html` absolute asset
   URLs) that pin the beta origin.
2. Update the Dokploy `NEXT_PUBLIC_SITE_URL` build input and runtime variable to
   `https://flipper.mattiaswiberg.com`.
3. Repoint the `flipper.mattiaswiberg.com` DNS record at the Dokploy reverse
   proxy and confirm the TLS certificate and HTTP-to-HTTPS redirect.
4. Update the Supabase Auth Site URL and redirect allowlist to the apex origin,
   and sync the updated `emails/*.html` templates into the Supabase Auth email
   settings.
5. Redeploy and run `npm run verify:deployment`; its expected origin defaults to
   the configured origin, which is now the apex.

## Evidence Status

Provider-side configuration was performed from this worktree on 2026-09-30
through the repository-local Dokploy CLI and the operator's stored panel
credentials. The migration-phase beta deployment and its public verification
were accepted on 2026-10-07. Secret values were sourced from operator-stored
local configuration at command runtime and were never echoed, logged, or
committed. Retained provider evidence (identifiers only):

- Dokploy panel `https://dokploy.mattiaswiberg.com`; project `Flipper`
  (`wHuv03684GC3ewNsz88OF`), default environment `production`
  (`Bt_qcV1KLFmvbX7zMQDrr`), application `Flipper` (`wrHEV_vFcZLcCXlhmAlWz`,
  container name `flipper-ez9pcl`).
- Accepted deployment: deploymentId `yTsSGWbMOPxYqULDNGwzp`, status `done`,
  `2026-10-07T19:52:27Z` to `2026-10-07T19:53:29Z` (62s), built from source
  branch `agent/issue-57-dokploy` at `c5e0146`. This is the first successful
  Dokploy release for this application.
- Source: custom git `https://github.com/mattias-wiberg/flipper-v2.git`, build
  type `dockerfile` with `Dockerfile` at the repository root, no generated env
  file (`createEnvFile: false`). The steady-state source branch is
  `agent/issue-57-dokploy` until the implementation stack merges to `main`;
  after the merge, switch the Dokploy source branch to the protected `main`
  branch and redeploy (see Open Items).
- Deployment variables (names only): build inputs `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; runtime adds
  `SUPABASE_SERVICE_ROLE_KEY` only. The accepted deployment ran with
  `NEXT_PUBLIC_SITE_URL` set to the configured origin
  `https://beta.flipper.mattiaswiberg.com`, and startup configuration
  validation is present in the deployment log (see the log evidence below).
  The service-role key is runtime-only (absent from build inputs and not
  `NEXT_PUBLIC_`-prefixed) and log scans found zero occurrences of any
  variable value.
- Process checks use the health contract: the swarm health check runs
  `GET http://127.0.0.1:3000/api/health` and requires `200`, body exactly
  `{"status":"ok"}`, and `Cache-Control: no-store` (interval 30s, timeout 5s,
  start period 10s, 3 retries) — the same contract as the Dockerfile
  `HEALTHCHECK`.
- Public verification on 2026-10-07: `npm run verify:deployment` passed without
  overrides against `https://beta.flipper.mattiaswiberg.com` for health, home,
  documentation, manifest, robots, and sitemap, with canonical links equal to
  the configured origin. The health contract matched exactly: HTTP `200`, body
  `{"status":"ok"}`, `Cache-Control: no-store`. Home and documentation returned
  HTTP `200`, and the development recorder returned `404` outside development.
- DNS (Spaceship zone `mattiaswiberg.com`, read-back verified 2026-10-07):
  `beta.flipper` is a CNAME to `mattiaswiberg.com`; `flipper` remains a CNAME
  to `3494aaa2b2faa2e2.vercel-dns-017.com`, so the apex stays on Vercel until
  final cutover.
- Dokploy domains on the application: `beta.flipper.mattiaswiberg.com`
  (`qmSiPOPoSGdM7WxFn6T0v`, HTTPS, `letsencrypt`, port `3000`) added
  2026-10-07; the pre-existing `flipper.mattiaswiberg.com` domain
  (`3UMu5KPgWDK0rjmtTc7E6`) is retained unchanged for final cutover.
- Deployment transport: `GIT_LFS_SKIP_SMUDGE=1` is set on the Dokploy swarm
  service on the host (server-wide, operator-approved 2026-10-07), so
  deployment clones no longer smudge the ~123 MB `mocker/data` LFS fixtures
  (58.8 MB `marketorders.expected.json`, 64.6 MB `marketorders.raw.jsonl`).
  The production image build and runtime are independent of real fixture
  contents (proven by the LFS-pointer checkout simulation recorded in
  `docs/container.md`); dev/test golden replay still requires a normal LFS
  checkout. The accepted deployment's log contains zero LFS references.
- Deployment log scan (log `flipper-ez9pcl-2026-10-07:19:52:27.log`, 204
  lines): zero occurrences of `SUPABASE_SERVICE_ROLE_KEY=`, zero JWT-shaped
  strings, zero occurrences of any `NEXT_PUBLIC_*` assignment; startup
  configuration validation is present.
- `rollbackActive` is enabled on the application. No registry exists on this
  server, and Dokploy creates versioned rollback records only when a rollback
  registry is configured; see the Rollback section for the restore paths that
  apply on this server.
- The existing Supabase project (`tetsknwxsintaitiufgx`, Flipper v2) remains
  the only production data and Auth service and was untouched and authoritative
  throughout. No Supabase resource was created or modified, and the configured
  `NEXT_PUBLIC_SUPABASE_URL` matches both the single existing Supabase project
  and the URL previously served by the live production bundle.

Deployment history context: twelve deployment attempts recorded on 2026-09-30
and 2026-10-01 (eight manual, four supervised automatic retries) failed before
the build step when the server-side clone did not complete during transient
network episodes between the Dokploy server and GitHub (Git LFS smudge
download errors at about 52 KiB/s, intermittent DNS resolution failures for
`github.com`, and early-EOF object transfers). A probe at the end of that run
returned HTTP 200 from GitHub's Git LFS batch endpoint, so the failures pointed
at the server's network path rather than a blocked or quota-limited endpoint.
The repository carries Git LFS test fixtures (`mocker/data/*.json*`, about 123
MB) that the production image does not include but every deployment clone was
downloading; a failure anywhere in that transfer failed the deployment at the
clone step. Every failed attempt retains its deployment record and log, which
was scanned and contains no credentials. The transport was repaired on
2026-10-07 by the `GIT_LFS_SKIP_SMUDGE=1` deployment-clone fix above plus
stable link conditions, after which the deployment completed and passed public
verification as recorded above.

Public baseline on 2026-10-07:

- `https://beta.flipper.mattiaswiberg.com` serves the accepted Dokploy release;
  `npm run verify:deployment` passes there for the health contract, public
  pages, canonical metadata, manifest, robots, and sitemap.
- `flipper.mattiaswiberg.com` still resolves through the Vercel DNS target and
  keeps serving the existing Vercel release until final cutover; the apex
  remains the documented final canonical origin.

## Open Items

Open items are pending obligations that gate acceptance or final cutover; the
Follow-ups section below lists deferred cleanups and background constraints.

- Steady-state source branch: the Dokploy application builds from
  `agent/issue-57-dokploy` until the implementation stack merges to `main`.
  After the merge, switch the Dokploy source branch to the protected `main`
  branch and redeploy so releases build from production.
- First successful release and rollback: the accepted beta deployment is the
  first successful Dokploy release for this application, so no previous Dokploy
  release or rollback record exists to restore. The previous known-good release
  is the Vercel deployment at the apex `https://flipper.mattiaswiberg.com`, and
  the applicable rollback path is the documented DNS fallback (Rollback
  section, step 4).
- Supabase Auth for beta sign-in: the Supabase Auth Site URL and redirect
  allowlist still need an entry for the beta callback origin
  (`https://beta.flipper.mattiaswiberg.com`). This is an operator step owned by
  #58; sign-in on the beta deployment requires it.

## Follow-ups

- Deployment clones run with `GIT_LFS_SKIP_SMUDGE=1`, set on the Dokploy swarm
  service on the host (server-wide, operator-approved 2026-10-07), so the
  repository's Git LFS test fixtures (`mocker/data/*.json*`, ~123 MB: 58.8 MB
  `marketorders.expected.json`, 64.6 MB `marketorders.raw.jsonl`) are pointer
  files in deployment checkouts and the clone step no longer downloads their
  payloads. The production image build and runtime must not depend on real
  `mocker/data` contents: `.dockerignore` excludes `mocker/data` from the
  build context and the only consumer is the development-only recorder, which
  returns `404` outside `NODE_ENV=development`. Dev and test golden replay
  (`npm run golden:orders`, the mocker tooling) still require a normal LFS
  checkout (`git lfs pull`); a deployment checkout cannot run them. If a
  deployment clone is ever made without the skip flag and the fixture transfer
  fails, treat it as a retryable transport failure and redeploy; it is not an
  application defect. Changing the fixture storage is tracked outside this
  deployment change.
- An ingestion token that was hardcoded earlier in the repository's history
  remains readable in the public git history even though HEAD is clean.
  Revoke or rotate it in the existing Supabase project (operator action,
  coordinated with #59), and keep ingestion credentials in environment
  variables only. A git history rewrite is not required for this deployment
  work.

## Target Contract

Configure one Dokploy application with these values:

| Setting                     | Required value                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| Repository                  | `mattias-wiberg/flipper-v2`                                                 |
| Protected production branch | `main`                                                                      |
| Build type                  | Dockerfile at repository root                                               |
| Build context               | Repository root                                                             |
| Container port              | `3000` over HTTP inside the private network                                 |
| Public domain               | `https://beta.flipper.mattiaswiberg.com` (migration phase; apex at cutover) |
| Health path                 | `GET /api/health`                                                           |
| Health response             | `200` and exactly `{"status":"ok"}`                                         |
| Health cache policy         | `Cache-Control: no-store`                                                   |
| Storage                     | No application volume; Flipper is stateless                                 |

The committed `Dockerfile` is the production container contract. It pins the
Node runtime, uses the lockfile, binds the server to `0.0.0.0:3000`, runs as
`nextjs`, and has an equivalent Docker health check. Do not override its
entrypoint or start command.

The deployment trigger may follow merges to `main`, but preview deployments
and unprotected branches must not replace production. Keep the current
known-good release and its deployment history until the new release has
passed the deployment smoke test and operator checklist.

## Command Discovery

Discover the CLI shape before inspecting or changing a resource. These commands
are read-only; do not infer IDs or flags from a previous Dokploy version:

```sh
npx --no-install dokploy --help
npx --no-install dokploy project --help
npx --no-install dokploy project all --help
npx --no-install dokploy application --help
npx --no-install dokploy application search --help
npx --no-install dokploy application one --help
npx --no-install dokploy deployment --help
npx --no-install dokploy deployment all --help
npx --no-install dokploy domain --help
npx --no-install dokploy domain by-application-id --help
npx --no-install dokploy rollback --help
npx --no-install dokploy rollback rollback --help
```

## Read-Only Inspection

Use the repository-local CLI only. Configure its existing local credentials or
ignored environment variables outside the repository first. Never paste a
Dokploy token or an environment dump into a command, log, issue, or report.

```sh
npx --no-install dokploy user get
npx --no-install dokploy project all --json
npx --no-install dokploy application search --q flipper --limit 20 --json
npx --no-install dokploy application one --applicationId <application-id> --json
npx --no-install dokploy deployment all --applicationId <application-id> --json
npx --no-install dokploy domain by-application-id --applicationId <application-id> --json
npx --no-install dokploy application read-traefik-config --applicationId <application-id> --json
```

Treat application and deployment JSON as sensitive. Inspect the values locally
but do not publish environment values, credentials, cookies, or raw logs.
The deployment must be stopped if the selected application is not the Flipper
application or if its source branch is not the expected release branch (`main`,
or `agent/issue-57-dokploy` during the migration phase; see Open Items).

Known CLI limitation (`@dokploy/cli` 0.30.7): read-by-id commands such as
`application one` and `project one` return HTTP 400 because the CLI sends the
tRPC input unwrapped. When that happens, use the equivalent read-only request
against the same tRPC endpoint with the operator's locally stored API key,
wrapping the input as `{"json":{...}}`:

```sh
curl -sS -H "x-api-key: $DOKPLOY_API_KEY" \
  "$DOKPLOY_URL/api/trpc/application.one?input=%7B%22json%22%3A%7B%22applicationId%22%3A%22%3Cid%3E%22%7D%7D"
```

Keep using the CLI for every mutating operation. Never place an API key or a
variable value in a command example that gets committed.

## Deployment Variables

Enter these through Dokploy's protected application environment and build
variable controls. The `.env.example` file contains placeholders for local
development only and is not a production source of values.

| Variable                        | Placement                        | Contract                                                                             |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`          | Build input and runtime variable | Exactly `https://beta.flipper.mattiaswiberg.com` (migration-phase configured origin) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Build input and runtime variable | URL of the existing authoritative Supabase project                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build input and runtime variable | Existing public Supabase key                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Protected runtime secret only    | Existing server-only Supabase service-role key                                       |

The three `NEXT_PUBLIC_*` values are intentionally available to the image
build because Next.js inlines browser configuration. They must still be
managed by Dokploy, not committed to Git. `SUPABASE_SERVICE_ROLE_KEY` must not
be a build argument, build secret, `NEXT_PUBLIC_*` variable, Dockerfile value,
or logged value. Do not add monitoring, analytics, or second-database
variables to this application for this ticket.

The image validation names missing or invalid variable names only. A failed
validation message is safe to retain; it must never contain a variable value.
Review build output and application logs for the absence of credentials before
accepting a release.

## DNS, TLS, and Forwarded Headers

1. Keep the current known-good release available on its existing provider (the
   Vercel apex during the migration phase) while the Dokploy application is
   built and checked on its temporary or provider URL. Record the existing DNS
   record target and known-good release before changing either.
2. During the migration phase the public host for the Dokploy deployment is
   `beta.flipper.mattiaswiberg.com`: add that exact host to the Dokploy
   application domain with HTTPS enabled and a managed certificate. At final
   cutover (see the Public Origin Contract section), point the
   `flipper.mattiaswiberg.com` DNS record at the Dokploy reverse proxy target
   supplied by the operator's server. Do not commit that target or provider
   credentials.
3. Do not expose port `3000` directly to the Internet.
4. Redirect HTTP to HTTPS and preserve the public `Host` and protocol through
   `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`.
   The public protocol must arrive as `https`.
5. Do not change the existing Supabase project, production data service, or
   Auth provider during this web-service cutover. A separate release gate owns
   authenticated and ingestion workflow verification.

Verify the provider route without exposing configuration values (substitute the
host under test — the beta host during the migration phase, the apex at final
cutover):

```powershell
Resolve-DnsName beta.flipper.mattiaswiberg.com
curl.exe -sS -I --max-time 20 http://beta.flipper.mattiaswiberg.com/
curl.exe -sS -I --max-time 20 https://beta.flipper.mattiaswiberg.com/
npx --no-install dokploy domain by-application-id --applicationId <application-id> --json
npx --no-install dokploy application read-traefik-config --applicationId <application-id> --json
```

The HTTP request must redirect to HTTPS, the HTTPS certificate must match the
host under test, and the Traefik configuration must route the host to port
`3000`. The application deliberately uses the configured public origin in
production instead of trusting an arbitrary forwarded host; preserved
forwarded headers are still required for correct proxy and request behavior.

## Deploy and Verify

Before any deployment, record the current successful deployment and rollback
record from Dokploy. Do not remove it. A deployment is an operator action and
must target the identified Flipper application and the expected release commit
(the merged commit on `main`, or `agent/issue-57-dokploy` at the recorded
accepted SHA during the migration phase; see Open Items).

After the image starts:

1. Confirm the build used the committed `Dockerfile` and did not receive
   `SUPABASE_SERVICE_ROLE_KEY` as a build input.
2. Inspect deployment status and a bounded startup-log tail. Do not export or
   paste raw logs; reject any log containing credentials, cookies, tokens,
   passwords, request bodies, or a full ingestion URL.
3. Run the secret-free public boundary check from a machine that can reach the
   public origin:

```sh
npm run verify:deployment
```

The check verifies the health contract, public home, documentation, canonical
metadata references, `robots.txt`, and `sitemap.xml` against the configured
public origin (`https://beta.flipper.mattiaswiberg.com` during the migration
phase, the apex after final cutover). For a local image built with the
production configured-origin build input, the transport endpoint can be
overridden without changing the expected public origin:

```sh
DEPLOYMENT_BASE_URL=http://127.0.0.1:3000 npm run verify:deployment
```

The expected origin itself is parameterized with `EXPECTED_SITE_URL`, which
defaults to the configured origin; use it only when verifying a deployment that
is intentionally built for a different origin, for example while validating the
cutover step. The default production invocation must omit both
`DEPLOYMENT_BASE_URL` and `EXPECTED_SITE_URL`. Before the
final cutover, the same check can run against the Dokploy reverse proxy target
while preserving the configured `Host` header (for example through a local
forwarding proxy pointed at the server address), also with
`DEPLOYMENT_BASE_URL`; the expected configured-origin content is unchanged.
The check does not claim DNS, TLS, Supabase Auth, ingestion, provider history,
or rollback acceptance; those require the operator checks in this document
and the separate release gate.

4. Leave authenticated, ingestion, observability, and broader release gate
   checks to their owning gates. This ticket's verifier intentionally does not
   implement or claim those checks.
5. Mark the new release known-good only after all required evidence passes.
   Until then, leave the previous successful release available in Dokploy (or
   on its existing provider, before the first Dokploy release exists; see Open
   Items).

## Rollback

Rollback is an explicit operator action. It is not performed by this change or
automatically inferred from a failed build.

1. If the new release fails health or public origin checks, or an owning
   deployment smoke test/release gate reports an Auth, ingestion, or
   observability failure, stop acceptance and record the failed deployment ID
   and the previous known-good deployment ID without copying secrets. Hand off
   redacted release evidence to the owning gate; this ticket does not implement
   those workflow checks.
2. Confirm that the previous image/release is still available and that DNS and
   the canonical domain have not been deleted.
3. Dokploy keeps a versioned rollback record per release only when the
   application has a rollback registry and `rollbackActive` enabled. On this
   server `rollbackActive` is enabled but no registry is configured, so the
   operator restore paths for the exact Flipper application are, in order:
   a. Docker Swarm's retained previous service spec for the Flipper service,
   which holds the previous successful release until the new release is
   accepted;
   b. after a rollback registry is attached, the Dokploy rollback record for
   the previous successful release:

```sh
npx --no-install dokploy rollback rollback --rollbackId <known-good-rollback-id> --json
```

c. the recorded-DNS fallback in step 4, which returns traffic to the
recorded known-good release on its existing provider.

4. If this is the first Dokploy cutover or Dokploy rollback cannot restore the
   service, confirm the exact DNS target recorded before cutover and restore
   that target to return traffic to the recorded known-good release.
   This is a separate DNS mutation requiring operator confirmation; do not
   delete the Dokploy application or its deployment history.
5. Recheck deployment status, `/api/health`, the public pages, and canonical
   metadata against whichever release is serving traffic.
6. Keep the failed release and its history for diagnosis. Do not use deletion,
   cleanup, or `rollback delete` as a substitute for rollback evidence.

## Acceptance Evidence

The ticket is not accepted until an operator can retain evidence for each
item below without disclosing secrets. Status at the end of the 2026-10-07
beta deployment evidence:

- Verified: the Dokploy application builds the repository with the committed
  production Dockerfile on port `3000`, and deployment
  `yTsSGWbMOPxYqULDNGwzp` (2026-10-07, status `done`, 62s) completed end to
  end from source branch `agent/issue-57-dokploy` at `c5e0146` and started
  healthy. The steady-state source branch switches to the protected `main`
  branch after the implementation stack merges (see Open Items).
- Verified at the migration-phase configured origin on 2026-10-07: DNS
  (`beta.flipper` CNAME read-back), the managed HTTPS certificate on the
  Dokploy domain, and the forwarded host/protocol route reach Flipper at
  `https://beta.flipper.mattiaswiberg.com`. Pending at final cutover: the same
  evidence at the apex `https://flipper.mattiaswiberg.com`.
- Verified on 2026-10-07: `npm run verify:deployment` passing through
  `https://beta.flipper.mattiaswiberg.com`. Pending at final cutover: the same
  check passing through `https://flipper.mattiaswiberg.com`.
- Configured and verified: public and runtime variables are protected Dokploy
  variables; the service role key is runtime-only and absent from image build
  inputs and logs. One historical exception requires operator action: an
  ingestion token that was hardcoded in `mocker/getOrders.js` and
  `mocker/sendOrders.js` earlier in the repository's history is still readable
  in the public git history even though HEAD is clean. Revoking or rotating
  that token in the existing Supabase project is an operator action (see
  Follow-ups) and must be coordinated with the ingestion-validation work in
  #59.
- Partially verified: the previous known-good release is the Vercel deployment
  at the apex and remains available and serving until final cutover; the
  recorded-DNS fallback restores it (Rollback section, step 4). Because the
  beta deployment is the first successful Dokploy release, no Dokploy rollback
  record exists, and operator execution of the DNS fallback remains required
  for full rollback acceptance.
- Verified: the existing Supabase project (`tetsknwxsintaitiufgx`, Flipper v2)
  remains the only production data and Auth service. Sign-in on the beta
  deployment is pending the Supabase Auth Site URL / redirect allowlist step
  owned by #58 (see Open Items).
