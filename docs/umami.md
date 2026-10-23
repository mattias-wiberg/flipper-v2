# Umami Analytics Service Runbook

Umami is the self-hosted product analytics service for the
web-and-observability plane. It records page views for the production Flipper
site plus explicitly defined non-sensitive events (the contract lives in
`analytics-policy.js`). It runs as a separately managed service with its own
dedicated PostgreSQL database and persistent named storage: Umami state never
uses the Flipper container or the existing Supabase project.

The plane-level operator entry point is [`docs/operations.md`](operations.md).
The release gate (#62) verifies the deployed Umami surface, the recorded page
view, and the privacy contract; server observability with
SigNoz/OpenTelemetry (#61) is deliberately out of scope for this rollout.
Recovery for this service — backup destinations, retention, restore, and the
restore rehearsal — is part of this document.

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
- **Access control is Umami's own login**: the `umami` service has one Traefik
  router, `umami-web`, on the external `dokploy-network`. It matches the whole
  host on the `websecure` entrypoint, uses the `letsencrypt` certificate
  resolver and the `umami` service, and applies only `umami-noindex`
  (`X-Robots-Tag: noindex`):

  | Router      | Matches                           | Middleware      |
  | ----------- | --------------------------------- | --------------- |
  | `umami-web` | all paths on the host, any prefix | `umami-noindex` |

  Tracker script, ingestion API, dashboard, and API all reach Umami directly.
  The dashboard and `/api` are protected by Umami's login, session, and
  `Bearer` token checks; no analytics data is exposed anonymously
  (`GET /api/websites` without a token is Umami's own `401`). `/script.js` and
  `/api/send` are inherently public: browsers on the Flipper site must load
  them without credentials. Do not add a Dokploy UI domain for this service:
  that would create a second router for the same host.

- **Why there is no Traefik basic-auth layer**: Traefik basic auth and Umami
  share the single `Authorization` header. The SPA sends
  `Authorization: Bearer <token>`; a basic-auth middleware expects
  `Authorization: Basic <creds>` on that same header, so the token never
  reaches Umami and dashboard API calls fail with `401` even after a successful
  login. Basic auth also forced a second password prompt in front of Umami's
  own login. Umami's login is therefore the single control, and because the
  login page itself is now public, enable two-factor authentication on the
  administrator account (the stack provisions `TWO_FACTOR_ENCRYPTION_KEY` for
  exactly that).
- **Required operator input**: the three secrets listed under Initial
  Provisioning. There is no basic-auth user list. A stale
  `UMAMI_BASIC_AUTH_USERS` value left in an existing deploy environment is
  unused and can be deleted at the operator's convenience.
- **Verify from outside** after deployment. These are the acceptance checks of
  the router model, and the release gate in #62 must repeat all four:
  1. `curl -s -o /dev/null -w '%{http_code}' https://umami.mattiaswiberg.com/`
     prints `200` and a plain GET returns Umami's login page, never a
     basic-auth prompt (`curl -sI` shows no `WWW-Authenticate: Basic`).
  2. `curl -sI https://umami.mattiaswiberg.com/script.js` returns `200` with a
     JavaScript content type: the tracker still loads on the Flipper site.
  3. `curl -s -o /dev/null -w '%{http_code}' https://umami.mattiaswiberg.com/api/websites`
     prints `401` without a token: the API is not exposed. The release gate
     asserts this too.
  4. The API works end to end. Prompt for the password so it never lands in
     shell history (`read -r -s -p 'Umami administrator password: ' UMAMI_PASSWORD`),
     set `UMAMI_USER`, then log in and reuse the returned token:
     `TOKEN=$(curl -s -H 'content-type: application/json' -d "{\"username\":\"$UMAMI_USER\",\"password\":\"$UMAMI_PASSWORD\"}" https://umami.mattiaswiberg.com/api/auth/login | jq -r .token)`
     then
     `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" https://umami.mattiaswiberg.com/api/websites`
     must print `200`. This is the check that failed while basic auth covered
     the host, because one `Authorization` header cannot carry both schemes.

  Never protect `/script.js` or `/api/send` (it disables product page views),
  and never put a basic-auth middleware back on the router (it breaks every
  dashboard API call).

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
   two-factor authentication as recommended above: the login page is reachable
   without a reverse-proxy password, and the stack already provides
   `TWO_FACTOR_ENCRYPTION_KEY`.
4. Add a website for Flipper and note its website ID (Settings → Websites).
5. Configure Flipper's two optional public build variables in Dokploy and
   redeploy (both or neither; see the matrix in `docs/dokploy.md`). They are
   read when the image is built, so changing them requires a rebuild:
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
  deleting the named volume deletes page-view history. The #60 rollout
  recorded a page view persisting across a stack restart; repeat that check by
  comparing the page-view count before and after any restart you need to trust
  (`docs/operations.md`, Telemetry Verification).
- **Upgrades**: bump the pinned Umami and PostgreSQL image tags and digests in
  `deploy/umami/docker-compose.yml` after reviewing the release notes, back up
  the database first (see Backup, Restore, and Restore Rehearsal below), then
  pull and recreate. Umami runs its schema migrations automatically on start.
- **Availability decoupling**: Umami being down never affects Flipper. The
  integration is a deferred browser-side script; if the analytics host is
  unreachable, pages, Auth, and ingestion are unaffected and failed beacons
  are dropped by the browser. Conversely, Flipper deployments do not restart
  Umami.
- The release gate ([`docs/release-gate.md`](release-gate.md)) owns end-to-end
  checks of the deployed product surface and the recorded page view; backup,
  restore, and the restore rehearsal for page-view data are owned by this
  document. The plane-level flow is in
  [`docs/operations.md`](operations.md).

## Backup, Restore, and Restore Rehearsal

This section is the recovery contract for Umami page-view data. It covers what
is stateful, where backups live, how long they are kept, how to restore into a
scratch database, how to verify restored data in Umami, and how to perform the
production restore. The **restore rehearsal** is the deliberate exercise of
that procedure; its sign-off record is
[`umami-restore-rehearsal-record.md`](umami-restore-rehearsal-record.md).

Rehearsal status: **completed on 2026-10-22 at the data level.** A backup
(`umami-20261022T230816Z.dump`, 66,921 bytes, SHA-256
`c497687a105387300d6b16df7c49dd5dd311596131a5e82549e2056d55a55d1e`) was
restored into `umami_rehearsal` with the committed scripts. Restored counts
matched the backup reference exactly: 22 page views, 5 distinct URLs, 1 website,
equal first and last page-view timestamps, and equal top-5 URLs. Both guards
were exercised (restore onto the live database refused, backup into the
repository refused), the scratch database was dropped, and the live database was
untouched. The signed record is held in the operator record store outside git
and is not committed here. The full UI usability step (temporary Umami container
and sign-in) was **not** performed: this is a data-level rehearsal, and that step
is optional. The procedure, scripts, and record template are maintained here;
run the rehearsal on the documented cadence. The UI step is optional, but the
restored-count comparison is not: after any upgrade that changes the analytics
data path, rerun the data-level rehearsal at minimum.

### What is state and what is configuration

| Item                                          | Where it lives                                                                                                        | Recovery note                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page views, events, sessions, websites, users | PostgreSQL database `umami` in named volume `umami-analytics-9zaxkp_umami-db-data` (mounted at `/var/lib/postgresql`) | The only analytics state. Deleting the volume deletes history. Back it up with `pg_dump`.                                                            |
| `UMAMI_DB_PASSWORD`                           | Dokploy Compose environment                                                                                           | Needed to reach the database; not in the dump. Reuse it when restoring into the same stack.                                                          |
| `UMAMI_APP_SECRET`                            | Dokploy Compose environment                                                                                           | Signs sessions. Restoring into a stack with a different value invalidates existing sessions and dashboard logins.                                    |
| `UMAMI_TWO_FACTOR_ENCRYPTION_KEY`             | Dokploy Compose environment                                                                                           | Encrypts TOTP secrets stored in the dump. A restore without the same key leaves 2FA unusable, so store it with the backups and not only on the host. |
| Administrator credential and 2FA enrollment   | Umami dashboard / operator password manager                                                                           | The dump contains a password hash and an encrypted TOTP secret; keep the credential and the encryption key together.                                 |
| Image pins and router model                   | `deploy/umami/docker-compose.yml` in git                                                                              | The previous known-good pins are recovered from git history.                                                                                         |

Dumps contain password hashes, encrypted TOTP secrets, session/device/country
metadata, and page-view URLs. Treat every dump as sensitive: never commit it,
never attach it to an issue, and keep it readable only by the operator account.

### Backup destinations and retention (operator-owned)

The repository defines no backup location and runs no backup job. The operator
owns both; record the actual destination, schedule, and retention in the
operator log.

- **Primary copy**: a directory on the Dokploy host, outside this repository
  and on storage separate from the Docker volume, for example
  `/var/backups/flipper/umami` with mode `0700`. The backup scripts refuse a
  destination inside the repository.
- **Off-host copy**: at least one copy outside the Dokploy host, on the
  operator's recorded backup target. A host-local dump does not survive host
  loss, and the named volume is not a backup: it is the live single copy.
- **Recommended retention**: 7 daily, 4 weekly, and 6 monthly dumps, plus the
  dump taken immediately before every upgrade and every production restore.
  Retention must cover the rollback window and the time since the last
  successful rehearsal. No script deletes a backup; pruning is an explicit
  operator action.
- **Recommended schedule**: daily at a quiet hour, for example a root crontab
  entry that logs one line per run:

  ```cron
  20 3 * * * /opt/flipper/scripts/backup-umami.sh /var/backups/flipper/umami >> /var/log/flipper-umami-backup.log 2>&1
  ```

  Then copy new dumps off-host with the operator's backup tool. A failed cron
  run leaves no dump; check the log and the newest dump age.

- **Volume snapshots** are a secondary, cold copy only: stop the database
  container before snapshotting the volume. A snapshot taken while PostgreSQL
  runs is not a consistent backup.

### Backup procedure

Run on the Docker host from a repository checkout. Create the destination once
with mode `0700`, then run the script. It discovers the database container from
the volume name, writes a PostgreSQL custom-format dump plus a SHA-256 sidecar,
verifies the archive is readable, and prints the counts that the rehearsal
record compares:

```sh
install -d -m 700 /var/backups/flipper/umami
scripts/backup-umami.sh /var/backups/flipper/umami
```

Output fields: dump path, checksum, page views, distinct URLs, websites, first
and last page-view timestamps, and the top five URLs. Copy the dump and its
`.sha256` sidecar off-host, then record the file name, checksum, size, creation
time, and those counts as the restore-rehearsal reference.

The equivalent manual command, if the script is unavailable:

```sh
DB=$(docker ps -q --filter volume=umami-analytics-9zaxkp_umami-db-data | sed -n '1p')
umask 077
docker exec "$DB" pg_dump -U umami -d umami --format=custom \
  --no-owner --no-privileges > "/var/backups/flipper/umami/umami-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Write the sidecar yourself when you take the manual path:

```sh
sha256sum /var/backups/flipper/umami/<file>.dump > /var/backups/flipper/umami/<file>.dump.sha256
```

Verify either form before relying on it:

```sh
docker exec -i "$DB" pg_restore --list < /var/backups/flipper/umami/<file>.dump > /dev/null
(cd /var/backups/flipper/umami && sha256sum -c <file>.dump.sha256)
```

A dump that `pg_restore --list` cannot read is not a backup.

### Restore into a scratch database (always first)

Never rehearse over the live `umami` database. Restore into a scratch database
inside the same PostgreSQL instance, compare counts, and drop it afterwards:

```sh
scripts/restore-umami.sh /var/backups/flipper/umami/<file>.dump
```

The script verifies the checksum sidecar when present, creates
`umami_rehearsal`, restores with `--single-transaction --no-owner
--no-privileges`, and prints the live and scratch counts side by side (page
views, distinct URLs, websites, first and last page view) plus the top five
restored URLs. It refuses any target database name that does not start with
`umami_rehearsal`, so it cannot overwrite `umami`.

Compare the scratch counts with the **counts printed when the dump was taken**,
not only with the live database: page views recorded since then legitimately
raise the live count. The scratch page views, distinct URLs, websites, first
event, and top URLs must match the backup-time reference exactly. A missing
`website` row means the dump is incomplete or from a different schema
generation; do not proceed to the production restore.

### Full rehearsal: verify the restored data in Umami (optional usability step)

SQL counts prove the data is present; a temporary Umami instance proves it is
usable. This UI usability step is optional: the 2026-10-22 rehearsal was
data-level and did not perform it. The scratch database holds the restored
website, users, sessions, and page views, so a temporary container can serve
exactly that data without touching the live stack.

1. Restore into the scratch database (previous section) and note the first and
   last page-view timestamps and the top URLs it prints. Use a dump with
   representative production page-view traffic; a dump from an empty install
   proves the mechanism but not that real page views survived.
2. Create an operator-owned environment file outside the repository, mode
   `0600`, reusing the stack's secrets so 2FA and sessions are interpretable:

   ```sh
   DATABASE_URL=postgresql://umami:<UMAMI_DB_PASSWORD>@db:5432/umami_rehearsal
   APP_SECRET=<UMAMI_APP_SECRET>
   TWO_FACTOR_ENCRYPTION_KEY=<UMAMI_TWO_FACTOR_ENCRYPTION_KEY>
   DISABLE_TELEMETRY=1
   DISABLE_UPDATES=1
   PRIVATE_MODE=1
   ```

3. Find the stack's internal network and start the same pinned image on the
   host loopback only:

   ```sh
   docker network ls --filter name=umami
   docker run --rm -d --name umami-rehearsal \
     --network umami-analytics-9zaxkp_default \
     --env-file /root/umami-rehearsal.env \
     -p 127.0.0.1:3001:3000 \
     ghcr.io/umami-software/umami:3.4.0@sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367
   ```

   Reach `http://127.0.0.1:3001` through an SSH tunnel from the operator
   machine (`ssh -L 3001:127.0.0.1:3001 <host>`); the scratch dashboard is
   never publicly routed. Migrations may run against the scratch database on
   start; that is expected and does not affect the live database.

4. Verify usability in Umami:
   - Sign in with the restored administrator account (2FA uses the restored
     secret and the same encryption key).
   - Set the dashboard date range to include the restored first and last page
     view; a default recent window can hide an older dump.
   - The Flipper website is listed with the restored page views.
   - Analytics → Pages shows the restored URLs and counts matching the top-URL
     output.
   - The API returns the same data for the restored window
     (`startAt`/`endAt` in epoch milliseconds from the recorded first/last
     event):

     ```sh
     curl -s -H "Authorization: Bearer $TOKEN" \
       "http://127.0.0.1:3001/api/websites/$WEBSITE_ID/stats?startAt=$START&endAt=$END"
     curl -s -H "Authorization: Bearer $TOKEN" \
       "http://127.0.0.1:3001/api/websites/$WEBSITE_ID/metrics?startAt=$START&endAt=$END&type=path"
     ```

     Umami 3.4 groups URL metrics by `path`; `url` is not a valid type. Use the
     dashboard login or a password prompt for `TOKEN` so credentials do not
     land in shell history.

5. Tear down: stop and remove the temporary container, then drop the scratch
   database:

   ```sh
   docker stop umami-rehearsal
   docker exec "$DB" psql -U umami -d postgres \
     -c 'DROP DATABASE "umami_rehearsal" WITH (FORCE)'
   ```

6. Complete
   [`umami-restore-rehearsal-record.md`](umami-restore-rehearsal-record.md) in
   the operator record store: what was restored, when, by whom, the pre/post
   counts, the verified URLs, and the sign-off. Aggregate counts only; no
   secrets, dumps, or telemetry payloads.

Rehearsal cadence (recommended): before every Umami upgrade, after any restore
or data-loss incident, and at least quarterly. A rehearsal that finds a broken
dump or a count mismatch is a failed rehearsal; keep the record and fix the
cause before the next production change.

### Production restore

Only after a scratch restore and a full rehearsal have verified the dump. Plan
for a short analytics outage: Flipper keeps serving, and page views sent during
the outage are dropped by the browser.

1. **Freeze writes.** Stop the Umami service in Dokploy (or `docker compose stop umami` in the stack directory). Leave the database running. Record the current page-view count as the pre-restore value.
2. **Take a safety backup** of the live database with the backup script and
   copy it off-host. This is the rollback of the restore itself.
3. **Restore into a new database** and `pg_restore` it, then swap names so the
   old data stays available until acceptance:

   ```sh
   DB=$(docker ps -q --filter volume=umami-analytics-9zaxkp_umami-db-data | sed -n '1p')
   docker exec "$DB" psql -U umami -d postgres -v ON_ERROR_STOP=1 \
     -c 'DROP DATABASE IF EXISTS umami_restored WITH (FORCE)' \
     -c 'CREATE DATABASE umami_restored'
   docker exec -i "$DB" pg_restore -U umami -d umami_restored \
     --no-owner --no-privileges --single-transaction < /var/backups/flipper/umami/<file>.dump
   docker exec "$DB" psql -U umami -d postgres -v ON_ERROR_STOP=1 \
     -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'umami' AND pid <> pg_backend_pid()" \
     -c 'ALTER DATABASE umami RENAME TO umami_pre_restore' \
     -c 'ALTER DATABASE umami_restored RENAME TO umami'
   ```

4. **Start Umami.** Migrations run on start if the dump predates the pinned
   image. Confirm the login page, the website, and the page-view count matches
   the backup-time reference printed for the dump being restored — not the live
   count at the moment of the restore.
5. **Verify in the dashboard and API** using the restored window, as in the
   full rehearsal. Then run `npm run gate:release` against the plane; its Umami
   checks must pass before the recovery is accepted
   ([`release-gate.md`](release-gate.md)).
6. **Accept or revert.** Once accepted, keep `umami_pre_restore` for the
   rollback window, then drop it. To revert instead, stop Umami, rename
   `umami` to `umami_failed_restore`, rename `umami_pre_restore` to `umami`,
   and start the service.

Restoring into the same volume and database name preserves the Compose
contract: `DATABASE_URL` still points at `umami`, and no secret or compose
value changes.

### Upgrade and rollback

- **Before an upgrade**: take a backup, restore it into a scratch database, and
  complete the rehearsal if the release changes anything about the data path
  (Umami major/minor, PostgreSQL major). Record the current image tags and
  digests from `deploy/umami/docker-compose.yml` as the previous known-good
  pins.
- **Upgrade**: change tag and digest together, review the diff, redeploy, and
  verify health, login, tracker, and recorded page views.
- **Rollback with no schema migration**: redeploy the previous known-good pins
  (`git log -p -- deploy/umami/docker-compose.yml`) and verify as above.
- **Rollback across a schema migration**: Umami migrates forward on start and
  does not provide a downgrade. Restore the pre-upgrade dump with the
  production restore procedure, using the previous known-good image pins.
  Pinning the old image without restoring the dump can leave the service
  unable to read its own database.
- Record the rollback, its gate verdict, and the restored dump in the operator
  register (`docs/operations.md`, Release and Recovery Flow).

## Privacy Contract

The integration is page views plus explicitly defined non-sensitive events
only (`ANALYTIC_EVENTS` in `analytics-policy.js`). It never carries email
addresses, auth cookies, Supabase keys, ingestion tokens, raw order payloads,
passwords, or sensitive request URLs, and no authenticated identity is
attached (`umami.identify` and `data-distinct-id` are never used). The policy
module emits the tracker attributes and event shapes; its tests assert them,
and the release gate in #62 verifies the deployed wire:

- Query strings (Auth codes) and hashes (reset tokens) are stripped by the
  Umami tracker, which reads `data-exclude-search`, `data-exclude-hash`,
  `data-do-not-track`, and `data-domains` from the attributes this module
  emits. Beacons are limited to the configured public host; when both
  settings are absent, no script is rendered at all.
- Flipper page routes carry secrets only in query strings or hashes; API
  routes such as the tokened ingestion endpoint render no HTML and load no
  tracker.
- Event names must be explicitly allowlisted and per-event data keys are
  fixed; only values in each key's declared vocabulary are sent, and every
  other value (emails, URLs, keys, tokens, passwords, raw payload shapes) is
  dropped.
- With both optional settings absent (the local-development and test
  default), no tracker script is rendered and the browser makes no outbound
  analytics requests at all.

Settings and diagnostics never echo configured values: build validation
(`scripts/validate-production-env.mjs --build`) names environment variables
only, and a partial or invalid configuration is ignored (the build renders no
tracker) while Flipper keeps serving public pages, Auth, and ingestion. The
analytics settings are build-time inputs: build and runtime values must match,
and the release gate in #62 verifies the built surface.
