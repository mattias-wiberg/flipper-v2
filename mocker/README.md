# Upgrade verification contract

Run these checks from a clean checkout before and after the dependency and
component upgrade. `npm ci` verifies that the committed lockfile produces a
clean installation.

```sh
npm ci
npx tsc --noEmit
npx jest --runInBand
npm run build
```

The Jest result must be compared with the baseline below. Existing failures
are not upgrade regressions unless the upgrade changes their baseline status.

## Baseline status

Captured on 2026-09-20 before the dependency and component upgrade:

- `npm ci`: passed; npm reported deprecated transitive packages and 16 audit vulnerabilities.
- `npx tsc --noEmit`: passed.
- `npx jest --runInBand`: failed 5 tests in 2 existing suites. `utils/items.test.ts` fails for `UNIQUE_HIDEOUT` and `NON_EXISTENT_ITEM`; `lib/upgradeCosts.test.ts` fails three assertions against the current return and validation contracts.
- `npm run build`: passed with existing Baseline Browser Mapping, Browserslist, middleware-convention, and edge-runtime warnings.
- Golden replay: passed against the pre-upgrade commit `4cd2a69` in an isolated worktree. The old app replayed 5,131 batches with 0 failures, exported 220,124 orders, and matched the expected SHA-256 (`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`).

Keep this baseline separate from any failures introduced by the upgrade.

## Golden replay

The raw market-order capture can be replayed through the real ingest route and
compared with the checked-in expected result.

## Verification flow

Before running the test:

- Start the app with `npm run dev`.
- Set `FLIPPER_INGESTION_TOKEN` to a dedicated validation token that exists in
  the configured Supabase database. Keep the token in an ignored local env
  file or protected operator environment; never commit it.
- Use a fresh token, or remove its previous orders, before a repeat run. The
  ingest route upserts orders but does not remove rows that are missing from a
  later replay.
- Ensure `.env` contains `NEXT_PUBLIC_SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.

Replay the fixture and compare the SHA-256 hash of a temporary export with the
checked-in expected output:

```sh
npm run mock:order:ingest
npm run golden:orders
```

By default the replay targets the local app (`http://localhost:3000`) and uses
`FLIPPER_INGESTION_TOKEN` for the ingestion token. Both are parameterized so
the same replay can target a deployed Flipper base URL and a dedicated
validation token without any local app:

```sh
node --experimental-fetch mocker/sendOrders.js --app-url <base-url> --token <token>
node --experimental-fetch mocker/getOrders.js --compare --token <token>
```

Both scripts read `.env` and then `.env.local` from the directory they are run
in, and the process environment overrides those files; command-line flags
override everything. `--flag=value` is accepted as well as `--flag value`.

`mocker/sendOrders.js` replays a raw capture and exits non-zero when any batch
fails:

| Flag              | Meaning                                                | Default                              |
| ----------------- | ------------------------------------------------------ | ------------------------------------ |
| `--app-url <url>` | Flipper base URL to replay against (`FLIPPER_APP_URL`) | `http://localhost:3000`              |
| `--token <uuid>`  | Ingestion token (`FLIPPER_INGESTION_TOKEN`)            | none; required                       |
| `--file <file>`   | Raw capture to replay                                  | `mocker/data/marketorders.raw.jsonl` |
| `--help`          | Print usage and exit 0                                 |                                      |

A `.jsonl` capture is read as one `{ body }` object per line; any other
extension is parsed as a JSON array of batches. A replay against a deployed
service writes that token's rows there: start from clean order state (a fresh
token, or the app's Reset actions after a previous run) and clean up the
ingested rows afterwards through the same app actions.

`mocker/getOrders.js` exports the replayed token's persisted orders from
Supabase directly and coordinates the comparison:

| Flag                   | Meaning                                                 | Default                |
| ---------------------- | ------------------------------------------------------- | ---------------------- |
| `--url <url>`          | Supabase URL (`NEXT_PUBLIC_SUPABASE_URL`)               | none; required         |
| `--key <key>`          | Service-role key (`SUPABASE_SERVICE_ROLE_KEY`)          | none; required         |
| `--token <uuid>`       | Token to export (`FLIPPER_INGESTION_TOKEN`)             | none; required         |
| `--output <file>`      | Output JSON path                                        | OS temporary directory |
| `--page-size <number>` | Rows per request                                        | `1000`                 |
| `--include-created-at` | Include database-generated `created_at` values          | excluded               |
| `--compare`            | Compare the output with the checked-in expected fixture | off                    |
| `--help`               | Print usage and exit 0                                  |                        |

The exporter talks to Supabase directly and is unaffected by `--app-url`; scope
it to the replayed token with `--token`.

`golden:orders` writes its default export to the OS temporary directory,
compares its SHA-256 (the digest of the raw export file bytes, exactly as
written, including the trailing newline) with `marketorders.expected.json`, and
fails when the digests differ. The exporter also rejects the expected fixture as
an output path — including case variants, symlinks, and hardlinks to it — so the
checked-in fixture cannot be replaced by the replay tool.

`golden:orders` uses `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `FLIPPER_INGESTION_TOKEN` from the environment.
Run the script directly to override the token or output path:

```sh
node --experimental-fetch mocker/getOrders.js --compare --token <token> --output <temporary-file>
```

Database-generated `created_at` values are omitted so the fixture is stable
across replays. Use `--include-created-at` when an exact database snapshot is
required.

The replay requires a running app (`npm run dev`), a Supabase project with the
service-role credentials in `.env`, and a fresh token or an order state cleaned
of rows from previous runs. The raw capture also needs to be present from Git
LFS. The ingest route upserts orders but does not remove rows missing from a
later replay.

The checked-in expected output is the persisted-order contract. Preserve order
identifiers, item and location data, tier, quality, enchantment, prices,
quantities, action types, expiry values, normalization, and domain behavior;
only database-generated `created_at` values are excluded from the comparison.
Never regenerate `marketorders.expected.json` to make an upgrade pass.
