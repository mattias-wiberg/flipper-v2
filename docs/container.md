# Production Container Boundary

Flipper is built as a Next.js standalone image. The build uses the committed
`package-lock.json`, Node `22.14.0-bookworm-slim` for both build and runtime,
and copies only the standalone server, static assets, public assets, and the
runtime configuration check into the final image. The server runs as `nextjs`
and listens on `0.0.0.0:3000`.

## Configuration

Public values are required as Docker build inputs because Next.js inlines
`NEXT_PUBLIC_*` values into browser bundles:

- `NEXT_PUBLIC_SITE_URL` must be exactly the configured public origin for a
  production image. During the Vercel-to-Dokploy migration phase the configured
  origin is `https://beta.flipper.mattiaswiberg.com`; the apex
  `https://flipper.mattiaswiberg.com` stays on Vercel and remains the documented
  final canonical origin until cutover (see `docs/dokploy.md`).
- `NEXT_PUBLIC_SUPABASE_URL` is the existing Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the existing public Supabase key.

The runtime entrypoint also requires `SUPABASE_SERVICE_ROLE_KEY`. Pass it only
as a protected runtime secret. It is not a Docker build argument, is not
copied into the image, and is never included in validation diagnostics.
Monitoring credentials, when added by the observability work, follow the same
rule and must not use the `NEXT_PUBLIC_` prefix.

The health endpoint is `GET /api/health` and returns only
`{"status":"ok"}` with `Cache-Control: no-store`. It bypasses the session
proxy and performs no Supabase, Auth, data, filesystem, or observability work.
The development recorder returns `404` unless `NODE_ENV=development`.

The `mocker/data` fixtures are Git LFS files used only by dev/test golden
replay. Deployment clones run with `GIT_LFS_SKIP_SMUDGE=1`, so those files are
LFS pointer files in deployment checkouts. `.dockerignore` excludes
`mocker/data` from the image build context and nothing in the production build
or runtime reads those fixtures, so the image builds and runs unchanged from a
pointer-only checkout. A normal LFS checkout (`git lfs pull`) is required only
for `npm run golden:orders` and the mocker tooling.

Local development can use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, or
derive its origin from the local request when that value is absent. Production
never falls back to `VERCEL_URL` or `localhost`. Dokploy, Umami, and SigNoz are
not required for `npm run dev`.

## Release Checks

Run the application checks from a clean checkout:

```sh
npm ci
npx tsc --noEmit
npx jest --runInBand
NEXT_PUBLIC_SITE_URL=https://beta.flipper.mattiaswiberg.com \
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key \
npm run build
```

Build and start the real image without passing any server secret at build
time:

```sh
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://beta.flipper.mattiaswiberg.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key \
  -t flipper:v56 .

docker run --rm --name flipper-v56 \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://beta.flipper.mattiaswiberg.com \
  -e NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=replace-with-runtime-secret \
  flipper:v56
```

In a second shell, verify the container boundary:

```sh
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3000/
curl --fail http://127.0.0.1:3000/documentation
```

The expected health body is `{"status":"ok"}`. The root and documentation
requests are public-page checks; they must succeed without an authenticated
session. The image health check performs the same health request internally.

## Local Verification Evidence

The container boundary was verified locally with non-secret placeholder values
in an earlier run using the apex build input
`NEXT_PUBLIC_SITE_URL=https://flipper.mattiaswiberg.com`, before the
migration-phase origin contract. `npm ci`, `npx tsc --noEmit`, `npx jest
--runInBand` (19 suites, 51 tests at that run), the production build, and the
focused Prettier check for changed source and documentation files passed. The
real image built from the lockfile, started as UID `1001`, returned
`200 {"status":"ok"}` with `Cache-Control: no-store` from `/api/health`,
returned `200` for `/` and `/documentation`, and returned `404` for the
development recorder in production. The local deployment verifier passed for
health, public pages, manifest, robots, and sitemap. The historical pre-upgrade
baseline in `mocker/README.md` is separate from these runs and does not
describe these passing checks.

Re-verified with the migration-phase origin change: `npm ci`, `npx tsc
--noEmit`, `npx jest --runInBand` (20 suites, 61 tests), the focused Prettier
check, and the production build with the canonical build input
`NEXT_PUBLIC_SITE_URL=https://beta.flipper.mattiaswiberg.com` all pass. The
production build was also run with `mocker/data` replaced by Git LFS pointer
text (simulating a `GIT_LFS_SKIP_SMUDGE=1` deployment checkout) and passed
unchanged, confirming the build does not read the fixtures. The fixtures were
restored afterwards; no altered fixtures are committed.

These checks cover the local image boundary. The same boundary is accepted in
production on the Dokploy beta deployment (see `docs/dokploy.md` for the
deployment and public-verification evidence); the apex DNS cutover and the
Supabase Auth steps remain deployment-owned checks.
