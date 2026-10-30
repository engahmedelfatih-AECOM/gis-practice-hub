# syntax=docker/dockerfile:1.7
# ---- build -----------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# `next build` evaluates route modules to collect page data, which loads the validated
# environment. These placeholders exist only in this build stage: the runtime image gets
# real values from the platform secret store and fails fast at boot if they are missing.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-a-secret-0000000000 \
    APP_URL=http://localhost:3000
RUN npm run build
# Operational scripts (migrate, seed, demo accounts) bundled to plain Node so the runtime image
# needs no dev dependencies.
RUN node_modules/.bin/esbuild scripts/migrate.ts scripts/seed.ts scripts/demo-accounts.ts \
      --bundle --platform=node --target=node22 --format=cjs --outdir=dist-scripts \
      --external:pg-native --log-level=warning

# ---- runtime ---------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/db ./db
COPY --from=build --chown=app:app /app/dist-scripts ./dist-scripts
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
