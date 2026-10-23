# Web-and-Observability Plane Operations Runbook

This is the operator entry point for the web-and-observability plane: the
Flipper web service and the Umami product-analytics service, both operated on
the home-lab Dokploy host, plus the external Supabase project they depend on.
It covers the full operating cycle (prerequisites, ownership, local
development, DNS and TLS, Supabase Auth, first deployment, health, telemetry,
upgrade, rollback, and incident response) and links to the focused documents
that hold the detailed evidence.

The runbook is versioned in git: ship documentation changes in the same
reviewed commit as the behavior they describe, and record the repository commit
when retaining operator evidence. Server observability with SigNoz is
deliberately out of scope for this rollout (#61); the observability plane here
is Umami only.

## Plane Map

| Component            | Runs on                                                      | State                                                                                                                                    | Detail                                                     |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Flipper web service  | Dokploy application, Dockerfile at repository root           | Stateless; marker `Cache-Control: no-store` on health, no volume                                                                         | [`dokploy.md`](dokploy.md), [`container.md`](container.md) |
| Umami                | Dokploy Compose stack, `deploy/umami/docker-compose.yml`     | PostgreSQL in named volume `umami-analytics-9zaxkp_umami-db-data`; three deploy secrets                                                  | [`umami.md`](umami.md)                                     |
| Supabase project     | External, authoritative (`tetsknwxsintaitiufgx`, Flipper v2) | Auth, tokens, orders, row-level access, scheduled cleanup                                                                                | [`auth.md`](auth.md), [`ingestion.md`](ingestion.md)       |
| DNS and TLS          | Spaceship zone `mattiaswiberg.com` + Dokploy Traefik         | Certificates managed by the `letsencrypt` resolver                                                                                       | [`dokploy.md`](dokploy.md), [`umami.md`](umami.md)         |
| Release verification | Operator machine or disposable checkout                      | `release-gate-report.json` is git-ignored evidence; the deployed phase makes transient token-scoped Supabase writes and Umami page views | [`release-gate.md`](release-gate.md)                       |

Public routes:

| Route                                    | Serves                                                                        | Access control                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `https://beta.flipper.mattiaswiberg.com` | Flipper (migration-phase public origin)                                       | Public pages; Auth for `/authenticated/*`             |
| `https://umami.mattiaswiberg.com`        | Umami dashboard, API, tracker, ingestion API                                  | Umami's own login and tokens; `X-Robots-Tag: noindex` |
| `https://flipper.mattiaswiberg.com`      | Pre-Dokploy Vercel release still serving the apex; DNS fallback until cutover | Public pages; superseded at cutover                   |

Boundary rules that no procedure below overrides:

1. The Supabase project is external and authoritative. Never create, migrate,
   or point production at a different project as part of operating this plane.
2. Flipper is stateless. No database, volume, or analytics state is ever
   attached to the Flipper application.
3. Umami is separate from Flipper and from Supabase: its own Compose stack, its
   own PostgreSQL, its own login. Umami being down must never affect Flipper
   health, public pages, Auth, or ingestion.

## Prerequisites

Access the operator must hold before starting:

| Access                      | Used for                                                          | Never stored in this repository |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| Dokploy panel administrator | Flipper application, Umami Compose service, deployments, rollback | Session cookies, API keys       |
| SSH to the Dokploy host     | Docker container inspection, Umami backups and restores           | Host credentials                |
| Spaceship DNS zone control  | Public host records and the apex cutover/fallback                 | Provider credentials            |
| Supabase project dashboard  | Auth Site URL, redirect allowlist, SMTP, email templates          | Service-role key                |
| Umami administrator account | Dashboard access and API token; enable 2FA                        | Password, TOTP seed             |
| Off-host backup destination | Copy of every Umami dump (see `umami.md`)                         | Backup credentials              |

Operator workstation tooling: Node.js 22 and npm 11 (`npm ci`), Docker (for the
container check and local rehearsal), `git lfs` (golden-replay fixtures only),
`curl`, `jq`, `openssl`, and Playwright Chromium
(`npx playwright install chromium`, once per machine). PowerShell and POSIX
shells are both supported; the examples use POSIX shell syntax unless a step is
marked bash/zsh (the password prompt).

Secrets are entered only in the Dokploy panel, the Supabase dashboard, the
Umami dashboard, or a protected local file the operator sources. This
repository contains placeholders and variable names only: `.env.example` for
local development and `deploy/umami/.env.example` for the analytics stack.

## Environment Ownership

| Surface                                           | Owner and source of truth                 | Change rule                                                                      |
| ------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| Application variables (Flipper)                   | Dokploy protected build/runtime variables | Change in the panel, then redeploy; public `NEXT_PUBLIC_*` values are build-time |
| Analytics stack variables (Umami)                 | Dokploy Compose environment               | Change secrets only in the panel; never commit a value                           |
| Compose topology and image pins                   | `deploy/umami/docker-compose.yml` in git  | Reviewed commit, then redeploy                                                   |
| Public DNS records                                | Spaceship zone                            | Operator action with the pre-change target recorded                              |
| TLS certificates                                  | Dokploy Traefik (`letsencrypt`)           | Automatic; do not add a second router for the same host                          |
| Supabase Auth, SMTP, email templates              | Existing Supabase project                 | Operator dashboard change plus settings read-back                                |
| Backup destinations, retention, rehearsal records | Operator-owned, outside git               | Documented in `umami.md`; record the actual destination in the operator log      |

Never duplicate a value across surfaces. If a build input and a runtime
variable both exist, they must match; if a secret is rotated, rotate it in the
owning surface and restart the consuming service.

## Local Development

Local development needs none of the production plane:

```sh
npm ci
cp .env.example .env.local   # fill in local Supabase placeholders
npm run dev                  # http://localhost:3000
```

The optional Umami variables stay unset, so no tracker is rendered and no
outbound analytics request is made. Dokploy, Umami, Supabase CLI migrations,
and SigNoz are not required for `npm run dev`. The development recorder and
golden-replay fixtures require `NODE_ENV=development` and a normal Git LFS
checkout (`git lfs pull`) respectively; deployment checkouts use LFS pointer
files and the production image never reads them (`container.md`).

To exercise the release gate without touching production, run the repository
phase in a disposable checkout:

```sh
RELEASE_GATE_INSTALL=1 RELEASE_GATE_CONTAINER=1 npm run gate:release -- local
```

## Public DNS and TLS

The plane has three public names with distinct roles: the migration-phase
Flipper origin (`beta.flipper`), the Umami operator surface (`umami`), and the
apex (`flipper`) that still serves the pre-Dokploy known-good Vercel release
until the final cutover. The complete cutover procedure is in `dokploy.md`
(Public Origin Contract); this section is the standing check.

1. DNS resolves each name to the intended target. Record the target before any
   change; the apex target is the rollback path until cutover.
2. HTTP redirects to HTTPS, and the certificate matches the host.
3. Traefik routes the host to the container port: `3000` for Flipper and Umami.
   No application port is published on the host.
4. The Umami host keeps its single `umami-web` router and the `umami-noindex`
   middleware. Do not add a basic-auth middleware or a second Dokploy domain
   for it.

Read-only checks from a machine on the public Internet (substitute the host
under test):

```sh
Resolve-DnsName beta.flipper.mattiaswiberg.com    # PowerShell
curl.exe -sS -I --max-time 20 http://beta.flipper.mattiaswiberg.com/
curl.exe -sS -I --max-time 20 https://beta.flipper.mattiaswiberg.com/
npx --no-install dokploy domain by-application-id --applicationId <application-id> --json
```

The HTTP response must redirect to the HTTPS origin, the HTTPS certificate must
be valid for the host, and `curl -sI https://umami.mattiaswiberg.com/` must not
return `WWW-Authenticate: Basic`.

## Supabase Redirect and SMTP Setup

The existing Supabase project owns Auth. In its dashboard
(`https://supabase.com/dashboard/project/tetsknwxsintaitiufgx/auth/configuration`)
the expected state is:

| Setting            | Required value                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Site URL           | The configured public origin (`https://beta.flipper.mattiaswiberg.com` during the migration) |
| Redirect allowlist | The canonical allowlist table in [`auth.md`](auth.md) (apex pair plus beta pair)             |
| Email SMTP         | A working provider used by the verification and recovery flows                               |
| Email templates    | The repository `emails/*.html`, with absolute asset URLs on the same public origin           |

`auth.md` owns the allowlist values; this table only points at them so the two
documents cannot drift. Both the bare and `?redirect_to=...` callback forms must
be accepted: verification returns through the bare `/auth/callback`, recovery
through `/auth/callback?redirect_to=...`. An exact-only callback entry fails
recovery. After any change, read the settings back and record identifiers only,
then prove delivery by requesting a verification or recovery email and following
the link through the callback (`auth.md`, "Remaining Operator-Gated Checks").
Apex cutover steps, including switching the allowlist pair, are in `dokploy.md`.

## First Deployment

Deploy in this order so the tracker and its data store exist before a Flipper
image bakes the tracker into prerendered pages.

1. **Prove the candidate locally.** From a disposable checkout, run
   `RELEASE_GATE_INSTALL=1 RELEASE_GATE_CONTAINER=1 npm run gate:release -- local`.
   Require `ACCEPTED` for the local phase.
2. **Deploy Umami.** Create the Dokploy Compose service from
   `deploy/umami/docker-compose.yml`, supply the three secrets
   (`UMAMI_DB_PASSWORD`, `UMAMI_APP_SECRET`,
   `UMAMI_TWO_FACTOR_ENCRYPTION_KEY`), deploy, then follow
   `umami.md` (Initial Provisioning): change the default administrator
   password, enable 2FA, add the Flipper website, and record its website ID.
3. **Configure Flipper build inputs.** In the Dokploy application set the
   required variables plus both optional analytics values from the table in
   `dokploy.md` (both or neither). Values are read at build time; changing them
   requires a new image.
4. **Deploy Flipper.** Build from the protected `main` branch, confirm the build
   used the committed `Dockerfile`, and confirm no server secret appears in
   build inputs or logs.
5. **Verify the public boundary.** `npm run verify:deployment` must pass against
   the configured origin (health, public pages, canonical metadata, robots,
   sitemap).
6. **Verify telemetry.** Follow "Telemetry Verification" below.
7. **Run the release gate.** `npm run gate:release` must print `ACCEPTED`.
8. **Record the known-good release.** Deployment ID, commit, gate report path,
   and Umami image pins go into the operator register (see "Release and
   Recovery Flow").

## Health Checks

| What                 | Check                                                                     | Expected                                                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Flipper process      | `curl -fsS https://<origin>/api/health`                                   | `{"status":"ok"}`, `Cache-Control: no-store`, HTTP 200    |
| Flipper container    | Docker/Swarm health check in the Dockerfile                               | healthy, interval 30s, 3 retries                          |
| Flipper public pages | `npm run verify:deployment`                                               | pass                                                      |
| Umami process        | `docker ps --filter name=umami`                                           | database and Umami containers healthy                     |
| Umami heartbeat      | `curl -fsS https://umami.mattiaswiberg.com/api/heartbeat`                 | HTTP 200 (the compose healthcheck uses the same endpoint) |
| Umami login surface  | `curl -s -o /dev/null -w '%{http_code}' https://umami.mattiaswiberg.com/` | `200`, login page, no basic-auth challenge                |
| Umami tracker script | `curl -sI https://umami.mattiaswiberg.com/script.js`                      | `200` with a JavaScript content type                      |
| Umami database       | `docker exec <db> pg_isready -U umami -d umami`                           | `accepting connections`                                   |

The health contract deliberately bypasses Supabase, Auth, data, filesystem,
and observability work: Flipper health must never depend on Umami or Supabase
reachability, and an Umami outage is not a Flipper incident
(`release-gate.md`, "Restart and replacement").

### Umami operator surface protection

The live-verified access model (`umami.md`, Networking and Access Control) is
restated here because no incident procedure may weaken it:

- The dashboard and API are protected by **Umami's own login, session, and
  `Bearer` token checks**. There is no reverse-proxy basic-auth layer: it would
  force a second password prompt and overwrite the single `Authorization`
  header Umami uses for its token, breaking every dashboard API call with
  `401`. Do not add one back.
- The whole host is one Traefik router (`umami-web`) with the `umami-noindex`
  middleware (`X-Robots-Tag: noindex`). Tracker `/script.js` and ingestion
  `/api/send` are intentionally public; the dashboard and `/api` are not.
- The stack publishes **no ports**: PostgreSQL is reachable only inside the
  compose network, and Umami's port `3000` is `expose`d for Traefik only.
- Enable two-factor authentication on the administrator account: the login page
  is public by design, and the stack provisions `TWO_FACTOR_ENCRYPTION_KEY` for
  exactly that. Confirm 2FA after any restore.

Verify from outside after any change to the router, proxy, or stack:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://umami.mattiaswiberg.com/          # 200, login page
curl -sI https://umami.mattiaswiberg.com/ | grep -i '^www-authenticate'             # no output
curl -s -o /dev/null -w '%{http_code}\n' https://umami.mattiaswiberg.com/api/websites  # 401 without a token
curl -sI https://umami.mattiaswiberg.com/script.js | grep -i '^content-type'        # JavaScript
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  https://umami.mattiaswiberg.com/api/websites                                      # 200 (operator token; see Telemetry Verification)
```

## Telemetry Verification

Verify both the built surface and the recorded data; neither alone is
sufficient.

1. **Tracker in the built page.** The deployed home page HTML contains the
   Umami script tag for the configured website with `data-domains`,
   `data-exclude-search`, `data-exclude-hash`, and `data-do-not-track`, and no
   identity attribute.
2. **Beacons.** Load the deployed site in a browser and confirm the tracker
   calls `/api/send` on the Umami origin, with no email, token, query string,
   or hash in the payload.
3. **Recorded page view.** Within the gate's 15-minute window, the operator
   website's page-view count increases by one for a newly loaded page. The
   release gate checks this through the API.
4. **URL visibility.** Umami's own UI (Analytics → Pages) and the API's path
   metrics show the loaded paths. Umami 3.4 groups URL metrics by `path`;
   the `url` type returns `400` (`release-gate.md`).

Operator API check (token from the login response, never written down; the
password is prompted, not typed into the command line):

```sh
# bash/zsh: `read -s` keeps the password out of the terminal and shell history
read -r -s -p "Umami administrator password: " UMAMI_PASSWORD
printf '\n'
TOKEN=$(curl -s -H 'content-type: application/json' \
  -d "{\"username\":\"$UMAMI_USER\",\"password\":\"$UMAMI_PASSWORD\"}" \
  https://umami.mattiaswiberg.com/api/auth/login | jq -r .token)
unset UMAMI_PASSWORD
curl -s -H "Authorization: Bearer $TOKEN" https://umami.mattiaswiberg.com/api/websites
```

Set `UMAMI_USER` to the administrator name first; do not put either credential in
a committed command.

A healthy tracker with no recorded page views points at the website ID, the
build/runtime mismatch, or an excluded operator IP — not at Flipper health.

## Upgrade

Upgrades are deliberate, reviewed commits; never automatic pulls.

### Flipper

1. Merge to the protected `main` branch and let Dokploy build the new release.
2. Keep the previous release available until the new one is accepted.
3. Run `npm run verify:deployment` and `npm run gate:release`; require
   `ACCEPTED`.
4. Mark the new release known-good and keep the previous known-good deployment
   record until the next acceptance.

### Umami

1. Read the Umami and PostgreSQL release notes; review the new tags and
   digests.
2. Take a fresh backup and confirm it restores into a scratch database
   (`umami.md`, "Backup, Restore, and Restore Rehearsal").
3. Change the Umami/PostgreSQL version and digest together in
   `deploy/umami/docker-compose.yml`, review the diff, and redeploy the Compose
   service.
4. Confirm the stack is healthy, the database volume is still
   `umami-analytics-9zaxkp_umami-db-data`, the tracker still loads, and the
   page-view count continues from the pre-upgrade value.
5. Run the release gate; its Umami checks fail the release if the tracker,
   privacy contract, or page-view recording regressed.
6. If the upgrade fails, follow "Rollback" below. Umami migrates its schema
   forward on start, so an image rollback across a migration boundary requires
   restoring the pre-upgrade dump, not just pinning the old image.

## Release and Recovery Flow

One flow for a release, a rollback, and the verification that closes a
recovery. The terms are the `CONTEXT.md` ones: a **release** becomes a
**known-good release** only after the **release gate** accepts it; a
**rollback** restores the previous known-good release; the **operator
checklist** is this document plus the provider checks in the linked documents.

### 1. Record the current known-good release

Before deploying, record in the operator register (outside git):

| Field                        | Source                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Known-good deployment ID     | Dokploy deployment history paired with the retained gate verdict (see below) |
| Release commit               | Dokploy deployment record                                                    |
| Release gate verdict         | `release-gate-report.json` (git-ignored) plus the printed verdict            |
| Umami image pins             | `git log -p -- deploy/umami/docker-compose.yml`                              |
| Latest Umami backup          | Dump file name, SHA-256, creation time, destination                          |
| Public origin and DNS target | Recorded before the change                                                   |

The previous known-good release is the newest deployment with accepted gate
evidence and no later failed acceptance attempt — not simply the newest
deployment.

### 2. Prepare the candidate

Run the repository checks and the local gate phase in a disposable checkout.
Keep the Umami backup fresh before any change that touches the analytics stack.

### 3. Deploy and prove

Deploy, run `npm run verify:deployment`, then `npm run gate:release` against the
same origin. Do not mark anything known-good until the gate prints `ACCEPTED`.
A skipped required check is a rejection.

### 4. Mark known-good

Update the register with the new deployment ID, commit, gate report, and Umami
pins. Keep the previous known-good record and, for Umami, the pre-upgrade dump
until the next acceptance.

### 5. Rollback (explicit operator action)

Rollback is never inferred from a failed build and is never automatic. Use the
detailed steps in [`dokploy.md`](dokploy.md) (Rollback) and
[`umami.md`](umami.md) (Upgrade and rollback). In order:

1. Stop acceptance, record the failed deployment ID, and keep its history.
2. Confirm the previous known-good image/release and its DNS target still
   exist; do not delete the application, volume, or deployment records.
3. Flipper: restore the previous known-good release through the Dokploy
   rollback record when a registry exists, otherwise the retained Swarm service
   spec, otherwise the recorded DNS fallback to the existing provider.
4. Umami: restore the pre-upgrade image pins if no schema migration occurred;
   otherwise restore the pre-upgrade dump into the database as documented in
   `umami.md`.
5. Recheck `/api/health`, the public pages, canonical metadata, and the Umami
   login/tracker surface on whichever release is serving traffic.

### 6. Rerun the release gate after rollback or recovery

A rollback or a restore is not complete until the deployed phase of
`npm run gate:release` returns `ACCEPTED` against the configured origin, and the
register records that verdict with the restored release commit. The gate proves
the public boundary, Auth, ingestion, and analytics again; it does not deploy,
roll back, or change provider configuration. Its deployed checks do make
transient token-scoped writes to the production Supabase project and record
Umami page views (`release-gate.md`, "What the gate writes").

One exception is explicit: during the migration phase the recorded DNS fallback
returns traffic to the pre-Dokploy Vercel release, which was built for the apex
and therefore cannot pass a gate whose expected canonical origin comes from
`site-url.config.json`. Record that exception, the reason, and the retained
known-good evidence for that release; rerun the gate as soon as a Dokploy
release serves the configured origin again.

## Incident Response

Preserve evidence first: deployment IDs, timestamps, gate report, and container
health. Never paste secrets, cookies, raw request bodies, dumps, or unredacted
logs into an issue, chat, or commit.

| Symptom                               | First checks                                                                 | Action                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Flipper unreachable or 5xx            | `/api/health`, Dokploy deployment status, container health, recent deploy    | If health or the public boundary fails, roll back (`dokploy.md`); rerun the gate after recovery                                         |
| Sign-in or email links fail           | Supabase Auth settings read-back, SMTP delivery, callback origin             | Fix the setting or SMTP provider, re-test the lifecycle (`auth.md`); do not change schema or data                                       |
| Ingestion returns `401 Invalid token` | Runtime `SUPABASE_SERVICE_ROLE_KEY`, token row, deployment logs              | Correct the runtime credential and redeploy; re-run the ingestion gate checks (`ingestion.md`)                                          |
| Ingestion returns `400`/`500`         | Payload shape, item identifiers, service logs                                | Correct out-of-contract client payloads; if a contract-valid payload fails, treat it as a release defect and roll back (`ingestion.md`) |
| No page views appear                  | Tracker tag, website ID, build vs runtime values, excluded IPs, Umami health | Fix the build inputs or exclusion; Flipper remains healthy without analytics                                                            |
| Umami dashboard/API unreachable       | Container health, Traefik router, certificate, database                      | Restart or redeploy the Compose stack; Flipper is unaffected; if data is suspect, restore a backup                                      |
| Umami data missing or corrupt         | Volume present, database reachable, recent backups                           | Stop writes, take a fresh backup if possible, restore into a scratch database, then follow the production restore in `umami.md`         |
| Certificate errors                    | DNS target, Traefik router, resolver state                                   | Fix DNS or the router; do not add a second router for the same host                                                                     |
| Suspected secret exposure             | Which variable, where it appears                                             | Rotate in the owning surface, redeploy/restart, and record the rotation; never commit the new value                                     |
| Host storage low                      | Docker volumes, backup copies                                                | Free space outside the Umami volume first; never delete `umami-analytics-9zaxkp_umami-db-data` to reclaim space                         |

Escalate from an incident to a rollback when the serving release fails health,
the public boundary, Auth, ingestion, or analytics and the cause is not
immediately fixable. A telemetry outage alone is not a rollback trigger.

## Operator Checklist

This is the repository-side summary; each item links to the evidence it needs.
Items requiring provider access cannot be proven by repository tests.

- [ ] Candidate built from the committed `Dockerfile` on the expected branch
      and commit (`dokploy.md`).
- [ ] `npm run verify:deployment` passes on the configured public origin.
- [ ] `npm run gate:release` prints `ACCEPTED`; required skips are treated as
      failures.
- [ ] DNS, TLS, and forwarded host/protocol verified for every public route.
- [ ] Supabase Auth Site URL, redirect allowlist, SMTP delivery, and email
      templates read back and recorded (`auth.md`).
- [ ] Umami operator surface: own login only, no basic auth, `noindex`, no
      public database or internal ports; 2FA enabled (`umami.md`).
- [ ] Umami page views recorded and visible in the dashboard and API.
- [ ] Umami backup exists, its checksum verified, and a copy is off-host
      (`umami.md`).
- [ ] Restore rehearsal completed and signed in the record template after any
      upgrade that changes the analytics data path.
- [ ] Previous known-good release identified and retained; rollback path
      recorded.
- [ ] After a rollback or recovery, the gate was rerun and accepted, or the
      documented Vercel-fallback exception was recorded.

## Evidence and Records

- **Release gate report**: `release-gate-report.json` in the working directory
  (override with `RELEASE_GATE_REPORT`); git-ignored, contains the candidate
  commit, origin, phases, and each result with secrets redacted.
- **Deployment and rollback history**: Dokploy. Retain every failed deployment
  record; do not delete history as a substitute for rollback evidence.
- **Backup evidence**: dump file name, SHA-256, size, creation time, source
  volume, and destination. Never commit the dump, its contents, or telemetry
  data.
- **Restore rehearsal**: copy
  [`umami-restore-rehearsal-record.md`](umami-restore-rehearsal-record.md) and
  complete it in the operator record store. A data-level rehearsal was
  completed on 2026-10-22 and its signed record is held in that store, not in
  git; `umami.md` records the aggregate result. Re-run the rehearsal on the
  documented cadence.
- **Operator register**: the known-good release table above, kept outside git
  because it names deployment IDs and backup locations.

## Document Map

| Document                                                                                                                       | Owns                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [`dokploy.md`](dokploy.md)                                                                                                     | Dokploy application contract, DNS/TLS, deployment, rollback, operator evidence |
| [`container.md`](container.md)                                                                                                 | Production image, build inputs, health contract, local container checks        |
| [`auth.md`](auth.md)                                                                                                           | Supabase Auth origin contract, redirect allowlist, SMTP, lifecycle evidence    |
| [`ingestion.md`](ingestion.md)                                                                                                 | Ingestion contract, golden replay, controlled test identity                    |
| [`umami.md`](umami.md)                                                                                                         | Umami provisioning, access control, lifecycle, backup/restore/rehearsal        |
| [`umami-restore-rehearsal-record.md`](umami-restore-rehearsal-record.md)                                                       | Restore rehearsal sign-off and evidence template                               |
| [`release-gate.md`](release-gate.md)                                                                                           | Release gate checks, environment matrix, verdicts, evidence                    |
| [`adr/0001`](adr/0001-self-host-web-and-observability-plane.md), [`adr/0002`](adr/0002-self-hosted-observability-providers.md) | Boundary and provider decisions                                                |
