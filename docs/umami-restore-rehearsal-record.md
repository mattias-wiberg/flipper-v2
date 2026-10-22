# Umami Restore Rehearsal Record (template)

Copy this file to the operator record store and fill it in after a **restore
rehearsal** (`docs/umami.md`, "Backup, Restore, and Restore Rehearsal"). Keep
the completed record outside git: it names an operator and backup locations.
Committing this template must never add secrets, dumps, backup credentials,
telemetry payloads, or personal data. Aggregate counts and URL paths only.

A rehearsal is complete when the restored data matches the pre-restore reference,
the scratch resources are removed, and the operator signs below. Verifying the
restored data in a temporary Umami instance is an **optional usability step**;
record it as not performed when the rehearsal is data-level. If anything fails,
record the failure and leave the record open.

## Record identity

| Field                           | Value |
| ------------------------------- | ----- |
| Record ID                       |       |
| Status                          |       |
| Rehearsal date and time (UTC)   |       |
| Operator (name and role)        |       |
| Ticket or change reference      |       |
| Repository commit under test    |       |
| Umami image tag and digest      |       |
| PostgreSQL image tag and digest |       |
| Why this rehearsal ran          |       |

Status values: `passed`, `failed`, `aborted`. Use `failed` when counts differ or
the dump cannot be restored. A data-level pass (counts match) is `passed` even
when the optional UI usability step was not performed; say so in that section.

## Backup restored

| Field                     | Value              |
| ------------------------- | ------------------ |
| Scope restored            |                    |
| Dump file name            |                    |
| Dump SHA-256              |                    |
| Dump size (bytes)         |                    |
| Dump created (UTC)        |                    |
| Backup command or script  |                    |
| Source volume             |                    |
| Dump destination          |                    |
| Off-host copy confirmed   |                    |
| Scratch database name     |                    |
| Temporary Umami container | (optional UI step) |

Scope restored: normally the full `umami` database (users, websites, sessions,
page views, events, and their metadata). Note any exclusion.

Do not paste the dump, connection strings, or secret values.

## Pre-restore reference

Recorded from the backup output at dump time. For a production restore, record
the live counts immediately before the restore as well; page views recorded
since the dump legitimately raise the live numbers.

| Measure                 | Value |
| ----------------------- | ----- |
| Page views              |       |
| Distinct URLs           |       |
| Websites                |       |
| First page view (UTC)   |       |
| Last page view (UTC)    |       |
| Top URL 1 (path, count) |       |
| Top URL 2 (path, count) |       |
| Top URL 3 (path, count) |       |
| Top URL 4 (path, count) |       |
| Top URL 5 (path, count) |       |

## Post-restore result

Recorded from the scratch database and the temporary Umami instance.

| Measure                 | Value | Matches pre-restore |
| ----------------------- | ----- | ------------------- |
| Page views              |       | yes / no            |
| Distinct URLs           |       | yes / no            |
| Websites                |       | yes / no            |
| First page view (UTC)   |       | yes / no            |
| Last page view (UTC)    |       | yes / no            |
| Top URL 1 (path, count) |       | yes / no            |
| Top URL 2 (path, count) |       | yes / no            |
| Top URL 3 (path, count) |       | yes / no            |
| Top URL 4 (path, count) |       | yes / no            |
| Top URL 5 (path, count) |       | yes / no            |

## Usability verification (optional)

The 2026-10-22 data-level rehearsal did not perform this section; a data-level
record says "not performed (data-level)" for these rows rather than implying UI
evidence.

| Check                                                    | Result | Evidence |
| -------------------------------------------------------- | ------ | -------- |
| Administrator sign-in on the temporary instance          |        |          |
| Flipper website listed with restored page views          |        |          |
| Analytics → Pages shows the restored URLs                |        |          |
| API `/stats` returns the expected page-view count        |        |          |
| API `/metrics?type=path` returns the expected URL groups |        |          |
| No sensitive value appeared in the rehearsal output      |        |          |
| `pg_restore --list` accepted the dump                    |        |          |

Evidence is a short description and timestamp, for example
`2026-10-22T12:05Z, API stats pageviews=1 for website <id>`. Never paste a
token, cookie, password, or dump content.

## Cleanup

| Action                                    | Done |
| ----------------------------------------- | ---- |
| Temporary Umami container stopped/removed |      |
| Scratch database dropped                  |      |
| Scratch environment file deleted          |      |
| Dump and sidecar retained per retention   |      |
| Off-host copy verified                    |      |
| Live `umami` database untouched           |      |

## Findings and follow-ups

| Finding | Owner | Follow-up ticket or action |
| ------- | ----- | -------------------------- |
|         |       |                            |

## Sign-off

| Field                         | Value |
| ----------------------------- | ----- |
| Operator signature            |       |
| Signed at (UTC)               |       |
| Reviewer (if a second person) |       |
| Reviewed at (UTC)             |       |
| Next rehearsal due            |       |
| Related release gate verdict  |       |
