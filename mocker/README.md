# Golden data

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

Replay the fixture, export the persisted rows to a separate file, and compare
the SHA-256 hashes:

```sh
npm run mock:order:ingest
npm run golden:orders -- --output mocker/data/marketorders.actual.json
node -e "const fs=require('fs'); const crypto=require('crypto'); const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); const expected=hash('mocker/data/marketorders.expected.json'); const actual=hash('mocker/data/marketorders.actual.json'); console.log('expected:', expected); console.log('actual:  ', actual); if (expected !== actual) { console.error('Golden test failed'); process.exit(1); } console.log('Golden test passed');"
```

The test passes when the two hashes are identical. The actual output is only a
temporary comparison file and should not replace `marketorders.expected.json`.

`golden:orders` uses `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from the environment and defaults to the token used
by `mock:order:ingest`. Run the script directly to override the token or output
path:

```sh
node --experimental-fetch mocker/getOrders.js --token <token> --output <file>
```

Database-generated `created_at` values are omitted so the fixture is stable
across replays. Use `--include-created-at` when an exact database snapshot is
required.
