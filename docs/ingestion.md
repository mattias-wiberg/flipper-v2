# Market-Order Ingestion and Deal Discovery on the Public Origin

This document records how the migration-phase deployment proves market-order
ingestion and authenticated deal discovery against the existing Supabase
project (`tetsknwxsintaitiufgx`, Flipper v2), and what remains operator-gated.
Nothing here changes the Supabase schema, policies, token model, or deal
semantics. The origin contract in `docs/auth.md` applies unchanged: the
configured public origin is `https://beta.flipper.mattiaswiberg.com` during the
migration.

## Golden Replay Parameterization (this change)

`mocker/sendOrders.js` now accepts `--app-url <base-url>` (or
`FLIPPER_APP_URL`), `--token <uuid>` (or `FLIPPER_INGESTION_TOKEN`) and
`--file <capture>`, so the golden market-order replay can target any deployed
Flipper base URL with a dedicated validation token. The default invocation
remains local (`http://localhost:3000` and the checked-in raw capture). The
exporter `mocker/getOrders.js` already takes `--token`; it reads persisted rows
through Supabase regardless of where the replay ran and always writes its
export to a temporary path, refusing to overwrite
`mocker/data/marketorders.expected.json`. `mocker/README.md` documents the
deployed-target flow and its cleanup obligation.

## Controlled Test Identity

One throwaway account (`flipper-smoke-…@ilkovbi.resend.app`, 45-character
address on the controlled Resend inbound domain) was created through the live
beta sign-up form, verified from the delivered "Confirm Your New Account"
email, and used only through the application's own interfaces. Its dedicated
ingestion token is a v4 UUID read from the authenticated token page and held
out of band. Credentials and tokens are never committed or documented; only
shapes, hosts, and lengths appear here.

## Live Evidence (2026-10-08)

All checks ran against the deployed service and the existing Supabase project
with the throwaway account, which starts and ends with zero ingested rows.

### Direct HTTP: successful and rejected ingestion

The deployed beta route `POST /api/<token>/marketorders.ingest` maps any
server-side token-lookup failure to `401 Invalid token`, so a broken service
credential is indistinguishable from an unknown token at the response level.
The Supabase gateway logs separate the two: the beta server's own lookup
`GET /rest/v1/tokens?select=token&token=eq.<token>` is answered `401` (invalid
API key), while the previous known-good release at the apex
`https://flipper.mattiaswiberg.com` — same repository lineage, same current
`Expires` normalization contract (commit `c5cdaf9`), same Supabase project —
answers the same lookup `200` and executes the route's full body. The
behaviour checks therefore ran against the apex as the existing-behavior
reference, with the beta deployment probed alongside at every step:

| Behaviour (existing contract)                                                                                                           | Apex reference                                                           | Beta deployment                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Invalid token                                                                                                                           | `401 Invalid token`                                                      | `401 Invalid token`            |
| Rejected token persists nothing                                                                                                         | 0 rows                                                                   | 0 rows                         |
| Malformed JSON body                                                                                                                     | `400 Invalid JSON`                                                       | rejected at token gate (`401`) |
| Malformed order bodies (non-array `Orders`, wrong field types, empty order)                                                             | `400` JSON `{"error":"Invalid body format","details":[…]}`               | rejected at token gate (`401`) |
| Malformed bodies persist nothing                                                                                                        | 0 rows                                                                   | 0 rows                         |
| Valid batch with unusable item identifier                                                                                               | `200 Ingestion successful`, bad order warned + skipped, 2 of 3 persisted | rejected at token gate (`401`) |
| Normalization: `UnitPriceSilver / 10000`, `tier` from `T<n>`, `location_id` int, `Expires` trim + interior-space strip into `timestamp` | verified on every persisted column                                       | not reachable (Finding 1)      |
| Upsert conflict `onConflict: "token,id"`                                                                                                | duplicate id updates the existing row in place (no second row)           | not reachable (Finding 1)      |

Realistic client traffic matters for these checks: the raw capture's `Expires`
values are ISO `T` timestamps and all 220,124 fixture prices are integral
silver, matching the `unit_price_silver bigint` column and the
`expires timestamp` column. Synthetic values that violate those formats are
rejected by the database (`22008`/cast errors) and surface as
`500 Failed to ingest order`; that is the existing behavior of the route for
out-of-contract values and is not a deployment regression.

### Scheduled cleanup window (existing contract)

The existing Supabase project runs a `pg_cron` job `old_order_cleanup`
(`*/10 * * * *`) whose command is
`DELETE FROM public.orders WHERE created_at < NOW() - INTERVAL '60 minutes'`.
Ingested rows therefore live in a rolling 60-minute window: this is the
product's designed data lifecycle for continuously scanning clients, it
applies identically to the first rollout, and it constrains how the golden
checks are run:

- The persisted-order export and fixture comparison must run within 60
  minutes of the replay (it did; the comparison saw all 220,124 rows).
- Deal discovery necessarily reflects the rolling window; the verification
  method compares the deployed UI against the domain code computed over
  exactly the rows the page fetches (see below), so values stay comparable at
  any point in the window.
- Rows left behind are not residue: the cleanup job removes every ingested
  row automatically within 70 minutes, on both deployments.

### Finding 1 — deployed ingestion rejects every token (blocks acceptance)

The beta deployment returns `401 Invalid token` for every ingestion request,
including the dedicated token that the same deployment's token page issued
(row present in `tokens`, verifiably owned by the test account, exact match).
Supabase gateway logs show the beta server's token lookup being rejected with
`401` (invalid API key) while the apex's identical lookup returns `200`. The
route reads `SUPABASE_SERVICE_ROLE_KEY` at runtime
(`utils/supabase/admin.ts`, `lib/config.ts`), and the runtime
`NEXT_PUBLIC_SUPABASE_URL`/anon key are provably correct (server-side Auth
flows work on beta), so the invalid credential is the runtime service-role key
on the Dokploy application. Fixing it is an operator action outside this
ticket's reach (no Dokploy access here):

1. Set `SUPABASE_SERVICE_ROLE_KEY` on the Dokploy application
   (`wrHEV_vFcZLcCXlhmAlWz`) to the production project's service-role key
   (a fresh, rotated value — see Finding 2) and redeploy/restart.
2. Re-run the two commands below with the dedicated token; the replay should
   report 5,131 sent / 0 failed against the beta base URL and the export
   comparison should print the fixture hash.

```sh
node --experimental-fetch mocker/sendOrders.js --app-url https://beta.flipper.mattiaswiberg.com --token <dedicated-token>
node --experimental-fetch mocker/getOrders.js --compare --token <dedicated-token>
```

### Finding 2 — stale local development key; leaked historical token

The repository's local `.env` carries the `supabase-demo` development
service-role key (`iss: supabase-demo`), which the production project rejects
(`Invalid API key`) — a plausible copy source for Finding 1. The documented
golden export contract (service-role credential in `.env`) could therefore not
run with the local credential; the export ran the checked-in `mocker/getOrders.js`
export-and-compare code path unmodified, authenticated with the dedicated
account's own session (password grant), with only the `apikey` header rewritten
to the project anon key so that Supabase RLS confines the export to the
account's own rows. Separately, an ingestion token hardcoded earlier in the
repository's history is still readable in the public git history; revoking or
rotating it in the existing Supabase project remains an operator action
(`docs/dokploy.md` Follow-ups) and should be combined with a service-key
rotation.

### Golden replay and persisted-order export

The replay of the checked-in raw capture (5,131 batches) ran through the
parameterized CLI with the dedicated token. Targeting the deployed beta base
URL is demonstrated (every batch reaches the beta route and is rejected at its
token gate — Finding 1); the persisted data was then produced through the same
CLI against the apex ingestion path (`--app-url https://flipper.mattiaswiberg.com`):
5,131 sent, 0 failed. The temporary export of the dedicated token's rows —
column set, ordering, and `created_at` exclusion exactly as the tooling
contract specifies — matches the checked-in expected fixture SHA-256
`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`
byte for byte. The expected fixture was not regenerated or modified.

Because the scheduled cleanup window (above) rolls the data away after 60
minutes, the later deal-discovery checks ran against a second targeted replay
of 2,000 golden batches through the same parameterized CLI (`--file` +
`--app-url`): 2,000 sent, 0 failed. Deal values are compared against the
domain code computed over exactly the rows the page fetches at the same
moment, so the rolling window cannot create false mismatches.

### Row-level access and persisted fields

As the throwaway user (session JWT, anon apikey): the `tokens` table exposes
exactly one row — the account's own token; `orders` rows with any other token
are invisible; sampled own rows carry only the dedicated token. As the anon
role, `orders` and `tokens` both return empty. Persisted field assertions
covered every exported column (identifiers, item and location data, tier,
quality, enchantment, price conversion, quantity, action type, expiry) against
values sent. No schema or data migration was performed.

### Authenticated deal discovery (deployed beta UI, golden data)

Deals were verified in the deployed beta UI against the expected deal contract
computed from the golden data with the repository's own domain code
(`lib/deals.ts`, `lib/upgradeCosts.ts`, `utils/items.ts`), at desktop
(1280x800) and mobile (375x812) viewports, with no mocking of Supabase
internals. The deals page fetches orders through the user's RLS-scoped
session with no explicit limit, so the project's PostgREST `max-rows` of
100,000 bounds the sell side (the page reports `from 100,000/15,151 sell/buy
orders` while 204,973/15,151 rows exist — identical query behavior on the
first rollout, since the max-rows setting is a property of the unchanged
Supabase project). The expected values were therefore computed over exactly
the rows the page fetches (same selects and filters, same session scope),
which the UI matched exactly.

<!-- DEALS_EVIDENCE -->

Method: for every check block, the expected values (counts, rows, upgrade
decisions and costs, profits, margins, facet counts, page counts) were
computed with the repository's own domain code over exactly the rows the
deals page fetches at that moment, then read back from the deployed UI
minutes later. All reads matched digit-for-digit across three data states as
the scheduled cleanup window rolled (page fetch `100,000/15,151`, then
`87,572/15,151`, then `70,798/15,151` sell/buy orders):

- Counts and rows: every variant's counts line and top rows matched
  (`633/6,664`, `658/14,541`, `970/20,494`, `616/5,976`, `10/113`,
  `144/1,600`, `398/3,602` — each against its own expected computation).
- Quality/enchantment upgrade decisions and costs: the quality-upgrade deal
  "Grandmaster's Cleric Cowl" renders the "Quality upgrade required" icon and
  a Profit Breakdown of Buy order `4,476,958`, Sell order `-4,000,000`, Sales
  tax (4%) `-179,078`, Quality upgrade `-4,506` (expected `4,505.6`), total
  `293,374` — exactly the domain-code result; the "Master's Assassin Jacket"
  quality deal (`535,596`) carries the same decision under the AND/OR gates.
  Enchantment-upgrade deals are absent from the golden contract in every
  state and no enchantment icon renders — the expected decision, verified.
- Profits and margins: rendered profit/margin/amount/tier/location cells match
  the contract row for row (for example `Elder's Halberd 294,804/3`,
  `Grandmaster's Knight Helmet 280,785/31`, `Elder's Heretic Cape
216,979/30`), and expanded Profit Breakdown arithmetic closes exactly
  (`2,421,576 − 2,000,000 − 193,726` = `227,850` at 8% tax;
  `10,348,384 − 9,500,000 − 413,935` = `434,449` at 4%).
- Filters: flip parameters through the Options popover (Enchantment/Quality
  upgrades, Premium, Minimum profit `100000`, Minimum percentual profit `25`,
  AND/OR gate tabs) produce exactly the contract URLs and counts; the name
  filter (`Halberd` → exactly the 2 contract rows) and the Tier faceted
  filter (facet counts `258/81/59` = the contract's per-tier deal counts;
  selecting Elder → exactly 59 rows, all tier 8) match as well.
- Sorting: the Profit column header menu sorts Asc (`Grandmaster's Broadsword
45` → `Master's Guardian Helmet 48`, the contract's ascending first rows)
  and Desc (the contract's descending first rows `216,979 > 213,788 >
190,845`); margins and other columns follow the same header-menu pattern.
- Pagination: `Page 1 of 16` at 25 rows and `Page 1 of 40` at 10 rows match
  the contract's page counts exactly; page 2 renders the next 10 contract
  rows in order.
- Order inspection: expanding rows renders the Sell/Buy order table (item
  images, enchantment `Pristine (4)`, quality `Normal (1)`/`Outstanding (3)`,
  prices, ages) and the Profit Breakdown for the same orders.

Mobile (375x812): deal loading, counts, the Tier faceted filter, row
expansion (order inspection + Profit Breakdown), and pagination (`Page 2 of
16`) all work in the narrow layout, with zero browser console errors in all
sessions. The Reset/Options/View controls are intentionally `lg`-visible
only, so the reset cleanup flow runs at desktop size. Observed (pre-existing,
identical client code on the existing release): the deals table's natural
width overflows a 375px viewport by roughly 80 css px
(`documentElement.scrollWidth` 442 vs 360), so the page scrolls horizontally
on mobile; the workflow remains fully usable.

### Cleanup and residue

Ingested rows were removed through the application's own reset actions
(Reset → Item orders and Reset → Crafting material orders, each behind its
confirmation dialog) before the golden replay and again after the final
checks, and the export of the dedicated token returned 0 rows afterwards.
Residue that has no application interface: the throwaway Auth user and its
single `tokens` row (the application has no account- or token-deletion
surface). They hold no market data, and any accidental rows would be removed
by the scheduled cleanup within 70 minutes.

### Browser checks without secrets

The responsive user workflow (deal loading, filtering, sorting, pagination,
order inspection, and the reset cleanup flow) ran in a real browser on the
deployed beta origin at both viewport sizes with zero browser console errors.
All HTTP checks above use only the throwaway account's own token and rows.

## Remaining Operator-Gated Checks (NOT verified here)

1. Finding 1 fix, then the two re-run commands above against the beta base
   URL, including the fixture-hash comparison.
2. Rotate the historically leaked ingestion token and the service-role key
   (Finding 2); refresh the local `.env` with the rotated credential so the
   documented service-role export path runs again.
3. Final cutover items stay as recorded in `docs/dokploy.md` and
   `docs/auth.md`.
