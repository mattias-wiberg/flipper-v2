# Market-Order Ingestion and Deal Discovery on the Public Origin

This document records how the migration-phase deployment proves market-order
ingestion and authenticated deal discovery against the existing Supabase
project (`tetsknwxsintaitiufgx`, Flipper v2), and what remains operator-gated.
Nothing here changes the Supabase schema, policies, token model, or deal
semantics. The origin contract in `docs/auth.md` applies unchanged: the
configured public origin is `https://beta.flipper.mattiaswiberg.com` during the
migration.

## Status (2026-10-08)

- **Deal discovery: proven on the beta deployment.** An authenticated throwaway
  trader loaded the deployed deals UI against golden rows at desktop and mobile
  viewports, and every check matched the repository's own domain code computed
  over exactly the rows the page fetches (AC4, AC6).
- **Ingestion golden replay: proven on the apex reference, not on beta.** The
  parameterized replay sent all 5,131 batches to
  `https://flipper.mattiaswiberg.com` (the previous known-good release, same
  repository lineage and Supabase project) with 0 failures, and deals were
  verified from that data.
- **Beta ingestion: blocked by the deployment's service-role key.** The beta
  runtime `SUPABASE_SERVICE_ROLE_KEY` is invalid, so every ingestion request is
  rejected at the token lookup before any order is read or written. No valid
  market-order request succeeds on beta, so AC1, AC2 and AC3 remain unproven
  there. The operator fix and the exact re-run commands are in Finding 1.
- **Persisted-order export (AC5): not proven under the documented contract.**
  A temporary export of the dedicated token's rows matched the checked-in
  fixture SHA-256 byte for byte, but that run did not use the documented
  service-role export path (Finding 2). AC5 stays open until the exporter
  re-runs through the documented path after the key fix.

## Golden Replay Parameterization (this change)

`mocker/sendOrders.js` now accepts `--app-url <base-url>` (or
`FLIPPER_APP_URL`), `--token <uuid>` (or `FLIPPER_INGESTION_TOKEN`) and
`--file <capture>`, so the golden market-order replay can target any deployed
Flipper base URL with a dedicated validation token. The default invocation
remains local (`http://localhost:3000` and the checked-in raw capture). The
exporter `mocker/getOrders.js` already takes `--token`; it reads persisted rows
through Supabase regardless of where the replay ran. It defaults to a temporary output path, refusing to overwrite
`mocker/data/marketorders.expected.json`. Both scripts read `.env` then
`.env.local` from the directory they are run in, with the process environment
taking precedence and command-line flags taking precedence over both.
`mocker/README.md` documents the deployed-target flow, both scripts' flags, and
the cleanup obligation.

## Controlled Test Identity

One throwaway account (`flipper-smoke-…@ilkovbi.resend.app`, 45-character
address on the controlled Resend inbound domain) was created through the live
beta sign-up form, verified from the delivered "Confirm Your New Account"
email, and used only through the application's own interfaces. Its dedicated
ingestion token is a v4 UUID read from the authenticated token page and held
out of band. Credentials and tokens are never committed or documented; only
shapes, hosts, and lengths appear here.

## Live Evidence (2026-10-08)

Checks ran against the deployed beta service, the apex reference release, and
the existing Supabase project with the throwaway account, which starts and ends
with zero ingested rows. Behaviour that needs a working service-role credential
on the deployment (all successful ingestion paths) was proven on the apex
reference only; beta rejects every ingestion request at its token gate
(Finding 1), while every other check below ran on beta itself.

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
  minutes of the replay (the recorded observation saw all 220,124 rows; see
  Finding 2 for the credential caveat).
- Deal discovery necessarily reflects the rolling window; the verification
  method compares the deployed UI against the domain code computed over
  exactly the rows the page fetches (see below), so values stay comparable at
  any point in the window.
- Rows left behind are not residue: the cleanup job removes every ingested
  row automatically within 70 minutes, on both deployments.

### Finding 1 — beta ingestion is blocked by the service-role key (operator fix pending)

The beta deployment returns `401 Invalid token` for every ingestion request,
including the dedicated token that the same deployment's token page issued
(row present in `tokens`, verifiably owned by the test account, exact match).
No valid market-order request can succeed there, so AC1, AC2 and AC3 are not
proven on beta. Supabase gateway logs show the beta server's token lookup being
rejected with `401` (invalid API key) while the apex's identical lookup returns
`200`, and the full ingestion behaviour matrix above was proven on the apex
reference instead. The route reads `SUPABASE_SERVICE_ROLE_KEY` at runtime
(`utils/supabase/admin.ts`, `lib/config.ts`), and the runtime
`NEXT_PUBLIC_SUPABASE_URL`/anon key are provably correct (server-side Auth
flows work on beta), so the invalid credential is the runtime service-role key
on the Dokploy application. Fixing it is an operator action outside this
ticket's reach (no Dokploy access here):

1. Set `SUPABASE_SERVICE_ROLE_KEY` on the Dokploy application
   (`wrHEV_vFcZLcCXlhmAlWz`) to the production project's service-role key and
   redeploy/restart.
2. Re-run the two commands below with the dedicated token; the replay should
   report 5,131 sent / 0 failed against the beta base URL and the export
   comparison should print the fixture hash.

```sh
node --experimental-fetch mocker/sendOrders.js --app-url https://beta.flipper.mattiaswiberg.com --token <dedicated-token>
node --experimental-fetch mocker/getOrders.js --compare --token <dedicated-token>
```

### Finding 2 — stale local development key; the AC5 export never ran under the documented service-role contract

The repository's local `.env` carries the `supabase-demo` development
service-role key (`iss: supabase-demo`), which the production project rejects
(`Invalid API key`) — a plausible copy source for Finding 1. The documented
golden export contract (`SUPABASE_SERVICE_ROLE_KEY` from `.env` or the process
environment) therefore could not run as written from this worktree.

The checked-in exporter `mocker/getOrders.js` sends the credential it is given
in both the `apikey` and `Authorization: Bearer` headers and has no
password-grant, session-token, or header-rewrite option. An earlier draft of
this document described the successful export as authenticated with the
throwaway account's own session and a rewritten `apikey` header; that is not a
code path in this repository, so the claim is withdrawn.

Consequently, **the AC5 fixture comparison did not run under the documented
service-role contract.** The recorded observation — a temporary export of the
dedicated token's rows matching the checked-in fixture SHA-256
`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`
byte for byte — came from an out-of-band invocation whose credential path is
not reproducible from the checked-in tooling, so it does not satisfy AC5. AC5
is proven only by re-running the documented command after the service-role key
is fixed:

```sh
node --experimental-fetch mocker/getOrders.js --compare --token <dedicated-token>
```

The exporter reads Supabase directly, so the check is independent of
`--app-url`; it must run within the 60-minute cleanup window after a replay.

The ingestion token that was hardcoded earlier in the repository's history was
assessed by the operator on 2026-10-08 as the local test token used by this
mocker tooling, not a production credential, and closed as N/A on #59. No
rotation is required, and it is not an open operator item.

### Golden replay and persisted-order export

The golden replay is proven on the apex reference, not on beta. The replay of
the checked-in raw capture (5,131 batches) ran through the parameterized CLI
with the dedicated token: every batch reached the beta route and was rejected
at its token gate (Finding 1), and the persisted data was then produced through
the same CLI against the apex ingestion path
(`--app-url https://flipper.mattiaswiberg.com`): 5,131 sent, 0 failed. The
temporary export of the dedicated token's rows — column set, ordering, and
`created_at` exclusion exactly as the tooling contract specifies — matched the
checked-in expected fixture SHA-256
`6775375bd98d636d5fd89b2d40540193f3e1391ce32d64f213c4e86b186b326e`
byte for byte, as an observation outside the documented credential path
(Finding 2). The expected fixture was not regenerated or modified.

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

1. Finding 1 fix (the beta runtime `SUPABASE_SERVICE_ROLE_KEY`), then the two
   re-run commands above against the beta base URL: the successful/rejected
   ingestion matrix (AC1, AC2) and the fixture-hash comparison (AC5).
2. Refresh the local `.env` with a valid production service-role key and re-run
   `node --experimental-fetch mocker/getOrders.js --compare --token <dedicated-token>`
   so the documented service-role export path produces the fixture comparison
   (Finding 2).
3. Final cutover items stay as recorded in `docs/dokploy.md` and
   `docs/auth.md`.
