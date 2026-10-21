# Umami Analytics Service Runbook

Umami is the self-hosted product analytics service for the
web-and-observability plane. It records page views for the production Flipper
site plus explicitly defined non-sensitive events (the contract lives in
`analytics-policy.js`). It runs as a separately managed service with its own
dedicated PostgreSQL database and persistent named storage: Umami state never
uses the Flipper container or the existing Supabase project.

Related work, deliberately out of scope here: server observability with
SigNoz/OpenTelemetry (#61), the release deployment smoke gate (#62), and the
observability backup/restore and restore-rehearsal runbook (#63).

## Pinned Services

`deploy/umami/docker-compose.yml` defines the stack. Images are pinned to
reviewed versions and digests; `latest` is never used. Sources checked
2026-10-08:

| Service    | Image                                                           | Version | Sources checked                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Umami      | `ghcr.io/umami-software/umami:3.4.0@sha256:85909afc...abb2f367` | `3.4.0` | GitHub release `v3.4.0` (published 2026-09-17); GHCR tag list and manifest digest for `3.4.0`                                                                                                                           |
| PostgreSQL | `postgres:18.6-alpine@sha256:77f58511...4f60a1873`              | `18.6`  | Docker Hub `library/postgres` tags (newest published 18.x patch tag at review time); Prisma ORM v7 supported databases lists PostgreSQL 18 (Umami v3 uses Prisma 7); Umami documents PostgreSQL >= 12.14 as its minimum |

Umami's own reference compose file (tag `v3.4.0`) pins `postgres:15-alpine`;
PostgreSQL 18.6 was chosen instead as the newest supported major verified
against the ORM Umami runs on. Upgrades are deliberate edits to these pins
after review, never automatic pulls: change the version and digest together,
then redeploy (see Lifecycle).

## Networking and Access Control

- **Hostname**: the Umami operator surface lives on its own HTTPS route at
  `https://umami.mattiaswiberg.com` (DNS and Traefik are wired by the
  orchestrator, outside this repository).
- **Access-control requirement**: the Umami dashboard is an operator surface.
  It must be protected from ordinary public users at the reverse proxy (for
  example a Traefik basic-auth or forwarded-auth middleware, or an IP
  allowlist) in addition to the Umami login, and it must not be indexed (send
  `X-Robots-Tag: noindex`). Only two paths stay anonymously reachable, because
  browsers on the Flipper site must fetch and beacon to them: `/script.js`
  (tracker script) and `/api/send` (page-view/event collection). Everything
  else on the host requires operator access.
- **Concrete setup step**: in the Dokploy service, attach the chosen
  middleware to the `umami` router, then verify from outside:
  `curl -sI https://umami.mattiaswiberg.com/` returns `401` or `403` (not
  `200`), while `curl -sI https://umami.mattiaswiberg.com/script.js` returns
  `200` with a JavaScript content type and `POST /api/send` stays reachable.
  The release gate in #62 must repeat this check, including the unauthenticated
  tracker paths.
- **No public database ports**: the compose stack publishes no ports at all.
  PostgreSQL is reachable only on the internal stack network, and the Umami
  web service (port `3000`) is `expose`d for reverse-proxy routing only and is
  never published on the host.

## Initial Provisioning

1. Generate three secrets with `openssl rand -hex 32` and provide them to the
   deploy environment (placeholders in `deploy/umami/.env.example`). The
   database password must be URL-safe hex because it is embedded in
   `DATABASE_URL` without escaping, and `TWO_FACTOR_ENCRYPTION_KEY` must be
   exactly 64 hex characters. No secret is ever committed to this repository.
2. Deploy `deploy/umami/docker-compose.yml` as a Dokploy **Compose** service.
   Database migrations run automatically on first start.
3. Log in at `https://umami.mattiaswiberg.com` with the default Umami account
   (`admin` / `umami`) and **change the default administrator credential
   immediately** (Umami's own install documentation mandates this). Enable
   two-factor authentication if desired; the stack already provides
   `TWO_FACTOR_ENCRYPTION_KEY`.
4. Add a website for Flipper and note its website ID (Settings → Websites).
5. Configure Flipper's two optional public build variables in Dokploy and
   redeploy (both or neither; see the matrix in `docs/dokploy.md`). They are
   inlined at build time, so changing them requires a rebuild:
   - `NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://umami.mattiaswiberg.com/script.js`
   - `NEXT_PUBLIC_UMAMI_WEBSITE_ID=<website ID from step 4>`
6. Verify: the home page HTML contains the tracker script with the privacy
   attributes (`data-exclude-search`, `data-exclude-hash`, `data-do-not-track`,
   `data-domains`), and a page view appears in the Umami dashboard.
7. Optional: exclude the operator's own visits (Umami "Exclude my own visits"
   or `IGNORE_IP`) so test traffic does not pollute page views.

## Lifecycle: Restarts, Upgrades, Data

- **Restarts preserve page-view data.** All analytics state is the
  `umami-db-data` named volume mounted at `/var/lib/postgresql` in the
  dedicated PostgreSQL service. PostgreSQL 18 keeps its data directory under
  that path (`/var/lib/postgresql/18/docker`), so the named volume must mount
  the parent, not the pre-18 `/var/lib/postgresql/data` path. Restarting or
  recreating containers, and image upgrades, keep that volume; only explicitly
  deleting the named volume deletes page-view history. The verification for this contract is a restart
  of the stack followed by confirming representative page views still load in
  the dashboard.
- **Upgrades**: bump the pinned Umami and PostgreSQL image tags and digests in
  `deploy/umami/docker-compose.yml` after reviewing the release notes, back up
  the database first (the backup/restore runbook is owned by #63), then pull
  and recreate. Umami runs its schema migrations automatically on start.
- **Availability decoupling**: Umami being down never affects Flipper. The
  integration is a deferred browser-side script; if the analytics host is
  unreachable, pages, Auth, and ingestion are unaffected and failed beacons
  are dropped by the browser. Conversely, Flipper deployments do not restart
  Umami.
- The release deployment smoke gate (#62) owns end-to-end checks of the
  deployed product surface; the backup, restore, and restore-rehearsal
  procedures for page-view data are owned by #63.

## Privacy Contract

The integration is page views plus explicitly defined non-sensitive events
only (`ANALYTIC_EVENTS` in `analytics-policy.js`). It never carries email
addresses, auth cookies, Supabase keys, ingestion tokens, raw order payloads,
passwords, or sensitive request URLs, and no authenticated identity is
attached (`umami.identify` and `data-distinct-id` are never used). Enforced by
`analytics-policy.js` and its tests:

- Tracker attributes exclude query strings and hashes from tracked URLs (so
  Supabase Auth authorization codes and password-reset tokens cannot leak),
  honor the browser Do Not Track header, and restrict beacons to the
  configured public host. When the optional settings are present, the script
  itself can load; outside the configured host it sends no page-view or event
  beacons. With both settings absent (the local-development and test default),
  no tracker script is rendered at all.
- Flipper page routes carry secrets only in query strings or hashes; API
  routes such as the tokened ingestion endpoint render no HTML and load no
  tracker.
- Event names must be explicitly allowlisted, per-event data keys are fixed,
  and values are redacted unless they are short inert tokens (emails, URLs,
  keys, tokens, passwords, and raw payload shapes are dropped).
- With both optional settings absent (the local-development and test
  default), no tracker script is rendered and the browser makes no outbound
  analytics requests at all.

Settings and diagnostics never echo configured values: build validation
(`scripts/validate-production-env.mjs --build`) names environment variables
only, and a partial or invalid configuration is ignored (the build renders no
tracker) while Flipper keeps serving public pages, Auth, and ingestion. The
analytics settings are build-time inputs: build and runtime values must match,
and the release gate in #62 verifies the built surface.
