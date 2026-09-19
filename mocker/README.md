# Golden data

The raw market-order capture is replayed through the real ingest route, then
the persisted order rows can be saved as the expected result:

```sh
npm run mock:order:ingest
npm run golden:orders
```

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
