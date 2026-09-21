FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are intentionally build inputs because Next.js inlines
# public configuration into browser bundles. Never add server-only secrets here.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

RUN node scripts/validate-production-env.mjs --build
RUN npm run build

FROM node:22.14.0-bookworm-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/site-url.config.json ./site-url.config.json
COPY --from=builder --chown=nextjs:nodejs /app/site-url-policy.js ./site-url-policy.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/validate-production-env.mjs ./scripts/validate-production-env.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
