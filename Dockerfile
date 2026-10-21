FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are intentionally build inputs because Next.js reads
# public configuration when it builds browser bundles and prerenders pages. Never add server-only secrets here.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# Optional analytics configuration (both or neither). Empty values disable
# analytics, so an image built without them behaves exactly as before.
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL="${NEXT_PUBLIC_UMAMI_SCRIPT_URL}" \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID="${NEXT_PUBLIC_UMAMI_WEBSITE_ID}"

RUN node scripts/validate-production-env.mjs --build
RUN npm run build

FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS runner

WORKDIR /app

# Bake the build-time analytics values into the runtime environment so
# statically prerendered and dynamically rendered pages agree. These are not
# runtime knobs: overriding them at runtime cannot change the tracker already
# baked into static pages.
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL="${NEXT_PUBLIC_UMAMI_SCRIPT_URL}" \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID="${NEXT_PUBLIC_UMAMI_WEBSITE_ID}"

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/site-url.config.json ./site-url.config.json
COPY --from=builder --chown=nextjs:nodejs /app/site-url-policy.js ./site-url-policy.js
# The startup environment validator imports the analytics policy (its single
# source of truth), so that module must be present at runtime as well.
COPY --from=builder --chown=nextjs:nodejs /app/analytics-policy.js ./analytics-policy.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/validate-production-env.mjs ./scripts/validate-production-env.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(async (response) => { if (response.status !== 200 || response.headers.get('cache-control') !== 'no-store' || JSON.stringify(await response.json()) !== JSON.stringify({ status: 'ok' })) process.exit(1); }).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
