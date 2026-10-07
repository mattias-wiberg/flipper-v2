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
credentials. Secret values were sourced from operator-stored local
configuration at command runtime and were never echoed, logged, or committed.
Retained provider evidence (identifiers only):

- Dokploy project `Flipper` (`wHuv03684GC3ewNsz88OF`), default environment
  `production` (`Bt_qcV1KLFmvbX7zMQDrr`), application `Flipper`
  (`wrHEV_vFcZLcCXlhmAlWz`, container name `flipper-ez9pcl`).
- Source: custom git `https://github.com/mattias-wiberg/flipper-v2.git` on the
  protected `main` branch, build type `dockerfile` with `Dockerfile` at the
  repository root, no generated env file (`createEnvFile: false`). The
  container contract reaches `main` when the implementation stack merges;
  until then a deploy from `main` fails at the build step by design, and the
  acceptance build runs from the merge-ready stack ref.
- Deployment variables (names only): build inputs `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; runtime adds
  `SUPABASE_SERVICE_ROLE_KEY` only. A read-back on 2026-09-30 confirmed
  `NEXT_PUBLIC_SITE_URL` in both placements; under the migration-phase origin
  contract above the value must be exactly
  `https://beta.flipper.mattiaswiberg.com`, so the stored variable must be
  updated to the beta origin (operator action) before the next deploy. The
  service-role key is runtime-only (absent from build inputs and not
  `NEXT_PUBLIC_`-prefixed). Deployment build and application log scans found
  zero occurrences of any variable value.
- Process checks use the health contract: the swarm health check runs
  `GET http://127.0.0.1:3000/api/health` and requires `200`, body exactly
  `{"status":"ok"}`, and `Cache-Control: no-store` (interval 30s, timeout 5s,
  start period 10s, 3 retries) — the same contract as the Dockerfile
  `HEALTHCHECK`.
- Domain `flipper.mattiaswiberg.com` (`3UMu5KPgWDK0rjmtTc7E6`) is attached to
  the application with HTTPS enabled, a managed (`letsencrypt`) certificate,
  path `/`, and port `3000`. Under the migration-phase origin contract the
  public host serving the Dokploy deployment is
  `beta.flipper.mattiaswiberg.com`; the apex attachment becomes live only at
  final cutover.
- `rollbackActive` is enabled on the application. No registry exists on this
  server, and Dokploy creates versioned rollback records only when a rollback
  registry is configured; see the Rollback section for the restore paths that
  apply on this server.
- The existing Supabase project remains the only production data and Auth
  service. No Supabase resource was created or modified, and the configured
  `NEXT_PUBLIC_SUPABASE_URL` matches both the single existing Supabase project
  and the URL previously served by the live production bundle.

Twelve deployment attempts recorded on 2026-09-30 and 2026-10-01 (eight
manual, four supervised automatic retries) all failed before the build step: the
server-side clone of the repository did not complete because of transient
network failures between the Dokploy server and GitHub (Git LFS smudge
download errors, DNS resolution failures for `github.com`, and early-EOF
object transfers). A separate probe at the end of the run returned HTTP 200
from GitHub's Git LFS batch endpoint, so the failures point at the server's
network path rather than a blocked or quota-limited endpoint. The
repository carries Git LFS test fixtures (`mocker/data/*.json*`, about 124 MB)
that the production image does not include but every deployment clone was
downloading; a failure anywhere in that transfer failed the deployment at the
clone step. Deployment clones now run with `GIT_LFS_SKIP_SMUDGE=1` on the
Dokploy host (operator-side), so deployment checkouts carry LFS pointer files
instead of the fixture payloads; see the Follow-ups section. Every failed
attempt retains its deployment record and log, which
was scanned and contains no credentials. The recorded remediation for the
next operator session is in the Follow-ups and Deploy and Verify sections:
redeploy once the server's GitHub connectivity is stable, then run the
deployment smoke test.

Public baseline still observed at the end of this change:

- `flipper.mattiaswiberg.com` still resolves through the Vercel DNS target and
  keeps serving the existing Vercel release until final cutover. During the
  migration phase the canonical public evidence is observed at the configured
  origin `https://beta.flipper.mattiaswiberg.com` (public pages, metadata,
  robots, and sitemap, plus `npm run verify:deployment` without
  `DEPLOYMENT_BASE_URL`).
- `npm run verify:deployment` can be run through the Dokploy reverse proxy
  before the final cutover with the transport override documented in the Deploy
  and Verify section; the expected configured-origin content is unchanged.

## Follow-ups

- Deployment clones run with `GIT_LFS_SKIP_SMUDGE=1` on the Dokploy host
  (operator-side), so the repository's Git LFS test fixtures
  (`mocker/data/*.json*`, about 124 MB) are pointer files in deployment
  checkouts and the clone step no longer downloads their payloads. The
  production image build and runtime must not depend on real `mocker/data`
  contents: `.dockerignore` excludes `mocker/data` from the build context and
  the only consumer is the development-only recorder, which returns `404`
  outside `NODE_ENV=development`. Dev and test golden replay
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
application or if its source branch is not the protected `main` branch.

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
must target the identified Flipper application and the merged commit on
`main`.

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
   Until then, leave the previous successful release available in Dokploy.

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
item below without disclosing secrets. Status at the end of the
2026-09-30 deployment change:

- Configured: the Dokploy application builds the repository with the committed
  production Dockerfile on port `3000`, and its source branch is the protected
  `main` branch so releases build from production once the container contract
  merges there. No deployment attempt has yet completed end to end: all twelve
  attempts recorded on 2026-09-30 and 2026-10-01 failed during the repository
  clone step before the build, on transient network failures between the
  Dokploy server and GitHub. Acceptance requires one deployment record showing
  a successful build and a healthy start before this item can be marked met.
- Pending operator DNS repoint at final cutover: the apex DNS record, HTTPS
  certificate, HTTP redirect, and forwarded host/protocol route reaching
  Flipper at `https://flipper.mattiaswiberg.com`. During the migration phase
  the same evidence is required at the configured origin
  `https://beta.flipper.mattiaswiberg.com`.
- Pending operator DNS repoint at final cutover: `npm run verify:deployment`
  passing through `https://flipper.mattiaswiberg.com`. During the migration
  phase the same check must pass through
  `https://beta.flipper.mattiaswiberg.com`.
- Configured and verified: public and runtime variables are protected Dokploy
  variables; the service role key is runtime-only and absent from image build
  inputs and logs. One historical exception requires operator action: an
  ingestion token that was hardcoded in `mocker/getOrders.js` and
  `mocker/sendOrders.js` earlier in the repository's history is still readable
  in the public git history even though HEAD is clean. Revoking or rotating
  that token in the existing Supabase project is an operator action (see
  Follow-ups) and must be coordinated with the ingestion-validation work in
  #59.
- Partially verified: the previous successful release remains available until
  acceptance through deployment history and Docker Swarm's retained previous
  service spec; the recorded-DNS fallback restores the recorded known-good
  release. Operator execution of one restore path is still required for full
  acceptance, and a Dokploy rollback record requires attaching a rollback
  registry to the application.
- Verified: the existing Supabase project remains the only production data and
  Auth service.
