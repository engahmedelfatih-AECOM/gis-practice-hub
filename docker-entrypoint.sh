#!/bin/sh
# Container start: apply migrations, bootstrap the first Administrator (when SEED_ADMIN_* are set),
# refresh demo accounts (when DEMO_ACCOUNTS_PASSWORD is set), then start the web server.
# Hosted demos (Render) use this; an AECOM production rollout should run migrations as a
# release step instead and leave SEED_* and DEMO_* unset.
set -e
echo "[start] applying migrations"
node dist-scripts/migrate.js
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  echo "[start] bootstrap seed"
  node dist-scripts/seed.js
fi
if [ -n "$DEMO_ACCOUNTS_PASSWORD" ]; then
  echo "[start] demo accounts"
  node dist-scripts/demo-accounts.js || echo "[start] demo accounts skipped"
fi
echo "[start] web server"
exec node server.js
