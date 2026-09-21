# Dokploy Deployment Runbook

This runbook deploys only the Flipper web service. The existing Supabase
project remains the authoritative production service for Auth, tokens, orders,
row-level access, and cleanup. Do not create or select another production
Supabase project as part of this deployment.

## Evidence Status

Provider-side deployment was not performed from this worktree. The repository
has no Dokploy credentials or saved CLI configuration, so the read-only
commands below could not inspect a project or application. The public baseline
observed before this change was:

- `flipper.mattiaswiberg.com` still resolved through a Vercel DNS target.
- The public response identified Vercel as the server.
- `/`, `/documentation`, `/robots.txt`, and `/sitemap.xml` returned `200`.
- `/api/health` returned `404`.

These observations are not deployment acceptance evidence. An operator with
Dokploy and DNS access must complete the checklist below and retain the
provider evidence without copying secrets into issues, logs, or this repo.

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

1. Keep the current known-good Vercel release available while the Dokploy
   application is built and checked on its temporary or provider URL. Record
   the existing DNS record target and Vercel release before changing either.
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

The default production invocation must omit `DEPLOYMENT_BASE_URL`. The check
does not claim DNS, TLS, Supabase Auth, ingestion, provider history, or
rollback acceptance; those require the operator checks in this document and
the separate release gate.

4. Leave authenticated, ingestion, observability, and broader release gate
   checks to their owning gates. This ticket's verifier intentionally does not
   implement or claim those checks.
5. Mark the new release known-good only after all required evidence passes.
   Until then, leave the previous successful release available in Dokploy.

## Rollback

Rollback is an explicit operator action. It is not performed by this change or
automatically inferred from a failed build.

1. If the new release fails health or public origin checks, stop acceptance and
   record the failed deployment ID and the previous known-good deployment ID
   without copying secrets.
2. Confirm that the previous image/release is still available and that DNS and
   the canonical domain have not been deleted.
3. In Dokploy, select the previous known-good rollback record for the exact
   Flipper application. After confirming that target and effect, an operator
   may use the repository-local CLI:

```sh
npx --no-install dokploy rollback rollback --rollbackId <known-good-rollback-id> --json
```

4. If this is the first Dokploy cutover or Dokploy rollback cannot restore the
   service, confirm the exact DNS target recorded before cutover and restore
   that target to return traffic to the previous known-good provider release.
   This is a separate DNS mutation requiring operator confirmation; do not
   delete the Dokploy application or its deployment history.
5. Recheck deployment status, `/api/health`, the public pages, and canonical
   metadata against whichever release is serving traffic.
6. Keep the failed release and its history for diagnosis. Do not use deletion,
   cleanup, or `rollback delete` as a substitute for rollback evidence.

## Acceptance Evidence

The ticket is not accepted until an operator can retain evidence for each
item below without disclosing secrets:

- Dokploy application source is the protected `main` branch and uses the
  committed production Dockerfile and port `3000`.
- The canonical DNS record, HTTPS certificate, HTTP redirect, and forwarded
  host/protocol route reach Flipper.
- `npm run verify:deployment` passes through
  `https://flipper.mattiaswiberg.com`.
- Public and runtime variables are protected Dokploy variables; the service
  role key is runtime-only and absent from image build inputs and logs.
- The previous successful release remains available until acceptance and the
  documented Dokploy or recorded-DNS fallback rollback procedure has been
  operator-verified.
- The existing Supabase project remains the only production data and Auth
  service.
