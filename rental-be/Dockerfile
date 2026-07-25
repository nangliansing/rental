# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.17.0-bookworm-slim@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

FROM ${NODE_IMAGE} AS runtime
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="rental-be" \
  org.opencontainers.image.description="Rental API backend" \
  org.opencontainers.image.revision="${BUILD_REVISION}"

ENV NODE_ENV=production \
  PORT=3000

WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "scripts/container-healthcheck.js"]

CMD ["node", "index.js"]
