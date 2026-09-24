#!/bin/sh
set -e

cd /app/packages/database

echo "[entrypoint] Applying Prisma migrations (deploy)..."
pnpm exec prisma migrate deploy

cd /app/apps/api

echo "[entrypoint] Promoting variant images to product gallery..."
pnpm exec tsx scripts/promote-variant-images.ts || echo "[entrypoint] Warning: promote-variant-images script failed (non-fatal, continuing startup)"

echo "[entrypoint] Startup tasks complete. Starting API."
exec "$@"
