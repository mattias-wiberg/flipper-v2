# Flipper

Flipper is a Next.js application for finding profitable Albion Online Black
Market trades. Its production web service is containerized for deployment
through Dokploy; the existing Supabase project remains authoritative for Auth,
tokens, orders, and row-level access.

## Development

Install dependencies and provide local Supabase values in `.env.local` using
the placeholders in `.env.example`:

```sh
npm ci
npm run dev
```

The development server runs at `http://localhost:3000`. Dokploy and production
secrets are not required for ordinary local development.

## Verification

The production container contract is documented in
[`docs/container.md`](docs/container.md). Run the public deployment boundary
check against the canonical origin with:

```sh
npm run verify:deployment
```

## Dokploy

The protected-branch deployment, environment variables, DNS/TLS checks,
release retention, and rollback procedure are documented in
[`docs/dokploy.md`](docs/dokploy.md).
