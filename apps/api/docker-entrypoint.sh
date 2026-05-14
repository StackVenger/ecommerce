#!/bin/sh
set -e

cd /app/packages/database

echo "[entrypoint] Applying Prisma migrations (deploy)..."
pnpm exec prisma migrate deploy

cd /app/apps/api

echo "[entrypoint] Migrations applied. Starting API."
exec "$@"
