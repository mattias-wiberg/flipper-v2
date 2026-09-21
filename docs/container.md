# Production Container Boundary

Flipper is built as a Next.js standalone image. The build uses the committed
`package-lock.json`, Node `22.14.0-bookworm-slim` for both build and runtime,
and copies only the standalone server, static assets, public assets, and the
runtime configuration check into the final image. The server runs as `nextjs`
and listens on `0.0.0.0:3000`.

## Configuration

Public values are required as Docker build inputs because Next.js inlines
`NEXT_PUBLIC_*` values into browser bundles:

- `NEXT_PUBLIC_SITE_URL` must be exactly `https://flipper.mattiaswiberg.com` for a production image.
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

Local development can use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, or
derive its origin from the local request when that value is absent. Dokploy,
Umami, and SigNoz are not required for `npm run dev`.

## Release Checks

Run the application checks from a clean checkout:

```sh
npm ci
npx tsc --noEmit
npx jest --runInBand
NEXT_PUBLIC_SITE_URL=https://flipper.mattiaswiberg.com \
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key \
npm run build
```

Build and start the real image without passing any server secret at build
time:

```sh
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://flipper.mattiaswiberg.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key \
  -t flipper:v56 .

docker run --rm --name flipper-v56 \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://flipper.mattiaswiberg.com \
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

The container boundary has been verified locally with non-secret placeholder
values. `npm ci`, `npx tsc --noEmit`, `npx jest --runInBand` (17 suites, 45
tests), and the production build passed. The real image built from the lockfile,
started as UID `1001`, returned `200 {"status":"ok"}` from `/api/health`,
returned `200` for `/` and `/documentation`, and returned `404` for the
development recorder in production. The focused Prettier check for changed
source and documentation files passed.
The historical pre-upgrade baseline in `mocker/README.md` is separate from
this current branch result and does not describe these passing checks.

These checks cover the local image boundary. DNS/TLS, the deployed canonical
domain, Dokploy history, and full release smoke remain deployment-owned checks.
