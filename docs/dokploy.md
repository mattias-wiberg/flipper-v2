# Dokploy Deployment Runbook

This runbook deploys only the Flipper web service. The existing Supabase
project remains the authoritative production service for Auth, tokens, orders,
row-level access, and cleanup. Do not create or select another production
Supabase project as part of this deployment.

## Evidence Status

Provider-side configuration was performed from this worktree on 2026-09-30
through the repository-local Dokploy CLI and the operator's stored panel
credentials. Secret values were sourced from operator-stored local
configuration at command runtime and were never echoed, logged, or committed.
Retained provider evidence (identifiers only):

- Dokploy project `Flipper` (`wHuv03684GC3ewNsz88OF`), default environment
  `production` (`Bt_qcV1KLFmvbX7zMQDrr`), application `Flipper`
  (`wrHEV_vFcZLcCXlhmAlWz`, container name `flipper-ez9pcl`).
- Source: custom git `https://github.com/mattias-wiberg/flipper-v2.git`,
  build type `dockerfile` with `Dockerfile` at the repository root, no
  generated env file (`createEnvFile: false`).
- Deployment variables (names only): build inputs `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; runtime adds
  `SUPABASE_SERVICE_ROLE_KEY` only. A read-back confirmed `NEXT_PUBLIC_SITE_URL`
  is exactly `https://flipper.mattiaswiberg.com` in both placements and the
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
  path `/`, and port `3000`.
- `rollbackActive` is enabled on the application. No registry exists on this
  server, and Dokploy creates versioned rollback records only when a rollback
  registry is configured; see the Rollback section for the restore paths that
  apply on this server.
- The existing Supabase project remains the only production data and Auth
  service. No Supabase resource was created or modified, and the configured
  `NEXT_PUBLIC_SUPABASE_URL` matches both the single existing Supabase project
  and the URL previously served by the live production bundle.

Deployment attempts recorded on 2026-09-30 failed before the build step: the
server-side clone of the repository did not complete because of transient
network failures between the Dokploy server and GitHub (Git LFS smudge
download errors, DNS resolution failure for `github.com`, and an early-EOF
object transfer). The repository carries Git LFS test fixtures
(`mocker/data/*.json*`, about 124 MB) that the production image does not
include but every deployment clone downloads; a failure anywhere in that
transfer fails the deployment at the clone step. Failed attempts retain their
deployment records and logs, which were scanned and contain no credentials.

Public baseline still observed at the end of this change:

- `flipper.mattiaswiberg.com` still resolves through the Vercel DNS target, so
  canonical public evidence (public pages, metadata, robots, and sitemap at
  `https://flipper.mattiaswiberg.com`, plus `npm run verify:deployment` without
  `DEPLOYMENT_BASE_URL`) remains pending the operator DNS repoint described in
  the DNS section below.
- `npm run verify:deployment` can be run through the Dokploy reverse proxy
  before the DNS cutover with the transport override documented in the Deploy
  and Verify section; the expected canonical-origin content is unchanged.

## Follow-ups

- Every Dokploy deployment clone downloads the repository's Git LFS test
  fixtures (`mocker/data/*.json*`, about 124 MB) even though the production
  image does not use them. That transfer has failed repeatedly over the
  homelab link and fails the deployment at the clone step. Until the fixtures
  leave LFS or deployment clones can skip LFS smudge, treat a failed clone as
  a retryable transport failure and redeploy; it is not an application defect.
  Changing the fixture storage is tracked outside this deployment change.
- An ingestion token that was hardcoded earlier in the repository's history
  remains readable in the public git history even though HEAD is clean.
  Revoke or rotate it in the existing Supabase project (operator action,
  coordinated with #59), and keep ingestion credentials in environment
  variables only. A git history rewrite is not required for this deployment
  work.

## Target Contract

Configure one Dokploy application with these values:

| Setting                     | Required value                              |
| --------------------------- | ------------------------------------------- |
| Repository                  | `mattias-wiberg/flipper-v2`                 |
| Protected production branch | `main`                                      |
| Build type                  | Dockerfile at repository root               |
| Build context               | Repository root                             |
| Container port              | `3000` over HTTP inside the private network |
| Public domain               | `https://flipper.mattiaswiberg.com`         |
| Health path                 | `GET /api/health`                           |
| Health response             | `200` and exactly `{"status":"ok"}`         |
| Health cache policy         | `Cache-Control: no-store`                   |
| Storage                     | No application volume; Flipper is stateless |

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

| Variable                        | Placement                        | Contract                                           |
| ------------------------------- | -------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Build input and runtime variable | Exactly `https://flipper.mattiaswiberg.com`        |
| `NEXT_PUBLIC_SUPABASE_URL`      | Build input and runtime variable | URL of the existing authoritative Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build input and runtime variable | Existing public Supabase key                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Protected runtime secret only    | Existing server-only Supabase service-role key     |

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

1. Keep the current known-good release available on its existing provider while
   the Dokploy application is built and checked on its temporary or provider
   URL. Record the existing DNS record target and known-good release before
   changing either.
2. Point the `flipper.mattiaswiberg.com` DNS record at the Dokploy reverse
   proxy target supplied by the operator's server. Do not commit that target
   or provider credentials.
3. Add the exact host to the Dokploy application domain with HTTPS enabled and
   a managed certificate. Do not expose port `3000` directly to the Internet.
4. Redirect HTTP to HTTPS and preserve the public `Host` and protocol through
   `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`.
   The public protocol must arrive as `https`.
5. Do not change the existing Supabase project, production data service, or
   Auth provider during this web-service cutover. A separate release gate owns
   authenticated and ingestion workflow verification.

Verify the provider route without exposing configuration values:

```powershell
Resolve-DnsName flipper.mattiaswiberg.com
curl.exe -sS -I --max-time 20 http://flipper.mattiaswiberg.com/
curl.exe -sS -I --max-time 20 https://flipper.mattiaswiberg.com/
npx --no-install dokploy domain by-application-id --applicationId <application-id> --json
npx --no-install dokploy application read-traefik-config --applicationId <application-id> --json
```

The HTTP request must redirect to HTTPS, the HTTPS certificate must match the
canonical host, and the Traefik configuration must route the host to port
`3000`. The application deliberately uses the configured canonical origin in
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
metadata references, `robots.txt`, and `sitemap.xml`. For a local image built
with the production canonical build input, the transport endpoint can be
overridden without changing the expected public origin:

```sh
DEPLOYMENT_BASE_URL=http://127.0.0.1:3000 npm run verify:deployment
```

The default production invocation must omit `DEPLOYMENT_BASE_URL`. Before the
DNS cutover, the same check can run against the Dokploy reverse proxy target
while preserving the canonical `Host` header (for example through a local
forwarding proxy pointed at the server address), also with
`DEPLOYMENT_BASE_URL`; the expected canonical-origin content is unchanged.
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
  merges there. No deployment attempt has yet completed end to end: all
  attempts recorded on 2026-09-30 failed during the repository clone step
  before the build, on transient network failures between the Dokploy server
  and GitHub. Acceptance requires one deployment record showing a successful
  build and a healthy start before this item can be marked met.
- Pending operator DNS repoint: the canonical DNS record, HTTPS certificate,
  HTTP redirect, and forwarded host/protocol route reaching Flipper at
  `https://flipper.mattiaswiberg.com`.
- Pending operator DNS repoint: `npm run verify:deployment` passing through
  `https://flipper.mattiaswiberg.com`.
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
