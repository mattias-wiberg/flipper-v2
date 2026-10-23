# Flipper

Flipper is a Next.js application for finding profitable Albion Online Black
Market trades. Production runs as the self-hosted **web-and-observability
plane**: the containerized Flipper web service and the self-hosted Umami
product-analytics service, both operated through Dokploy, while the existing
Supabase project remains authoritative for Auth, tokens, orders, and row-level
access. The production product surface records page views and explicitly
defined non-sensitive events through Umami (optional configuration, disabled by
default); Vercel Analytics and Vercel Speed Insights are not part of the
product.

Vercel is not the supported production operation. The apex
`https://flipper.mattiaswiberg.com` (the final canonical origin) remains the
migration-phase production service until the final cutover to Dokploy, and is
the recorded DNS fallback target (`docs/dokploy.md`). During the migration the
configured public origin — the `canonicalSiteUrl` value in
`site-url.config.json` — is `https://beta.flipper.mattiaswiberg.com`.

## Operations

The operator entry point is [`docs/operations.md`](docs/operations.md): plane
map and boundary, prerequisites, environment ownership, local development,
public DNS and TLS, Supabase redirect and SMTP setup, first deployment, health
checks, telemetry verification, upgrade, rollback, and incident response. It
links the focused documents for the Flipper deployment
([`docs/dokploy.md`](docs/dokploy.md)), the container contract
([`docs/container.md`](docs/container.md)), Auth
([`docs/auth.md`](docs/auth.md)), ingestion
([`docs/ingestion.md`](docs/ingestion.md)), the release gate
([`docs/release-gate.md`](docs/release-gate.md)), and Umami including its
backup, restore, and restore rehearsal
([`docs/umami.md`](docs/umami.md)).

## Development

Install dependencies and provide local Supabase values in `.env.local` using
the placeholders in `.env.example`:

```sh
npm ci
npm run dev
```

The development server runs at `http://localhost:3000`. Dokploy and production
secrets are not required for ordinary local development.

## Verification

The production container contract is documented in
[`docs/container.md`](docs/container.md). Run the public deployment boundary
check against the configured public origin (currently
`https://beta.flipper.mattiaswiberg.com`; the apex is the final canonical origin
after cutover):

```sh
npm run verify:deployment
```

A candidate release is only known-good after the release gate accepts it (with
the environment from the same document):

```sh
npm run gate:release
```

The gate records a clean install, typechecking, Jest, the production build,
container startup, and the deployed HTTPS, Auth, ingestion, golden-replay, and
Umami workflows, then prints an accepted/rejected verdict with retained
evidence. Local install and container evidence require `RELEASE_GATE_INSTALL=1`
and `RELEASE_GATE_CONTAINER=1`; without them the gate records an explicit skip.
Its environment matrix, check inventory, and operator-gated remainder are
documented in [`docs/release-gate.md`](docs/release-gate.md).

## Deployment and release verification

The supported deployment is the Dokploy application built from the protected
`main` branch with the committed `Dockerfile`. Environment ownership, DNS/TLS
checks, the Supabase Auth and SMTP setup, first deployment, release retention,
known-good release identification, and rollback are documented in
[`docs/dokploy.md`](docs/dokploy.md) and the plane runbook
[`docs/operations.md`](docs/operations.md). A release is known-good only after
`npm run gate:release` prints `ACCEPTED`; a rollback or recovery of the deployed
plane is complete only after the gate is rerun and accepted against the restored
release (the pre-Dokploy Vercel DNS fallback is the documented exception in the
runbook).

## Observability services

Product analytics runs on a self-hosted Umami service deployed through
Dokploy's Compose capability, with its own dedicated PostgreSQL database and
persistent storage (`deploy/umami/docker-compose.yml`). Its operator surface is
protected by Umami's own login, a `noindex` router, and no published database
or internal ports. Provisioning, access control, lifecycle, backup
destinations and retention, the restore procedure, and the restore-rehearsal
template are documented in [`docs/umami.md`](docs/umami.md) and
[`docs/umami-restore-rehearsal-record.md`](docs/umami-restore-rehearsal-record.md).
No restore rehearsal is recorded in this repository yet; the procedure and
template are maintained for the operator to run and sign.
