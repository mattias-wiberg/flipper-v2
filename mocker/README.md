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
- Golden replay: not run here because it requires the live app, a configured Supabase project, and a clean token/order state. The replay/tool safety checks pass locally.

Keep this baseline separate from any failures introduced by the upgrade.

## Golden replay

The raw market-order capture can be replayed through the real ingest route and
compared with the checked-in expected result.

## Verification flow

Before running the test:

- Start the app with `npm run dev`.
- Ensure the default token exists in the configured Supabase database.
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

`golden:orders` writes its default export to the OS temporary directory,
compares it with `marketorders.expected.json`, and fails when the hashes differ.
The exporter also rejects the expected fixture as an output path, so the
checked-in fixture cannot be replaced by the replay tool.

`golden:orders` uses `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from the environment and defaults to the token used
by `mock:order:ingest`. Run the script directly to override the token or output
path:

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
