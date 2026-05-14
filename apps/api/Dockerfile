# ═══════════════════════════════════════════════════════════
# E-Commerce API — Multi-stage Docker Build
# ═══════════════════════════════════════════════════════════
# Build:   docker build -t ecommerce-api -f apps/api/Dockerfile .
# Run:     docker run -p 4000:4000 --env-file .env ecommerce-api
# ═══════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────
# Stage 1: Install workspace deps (full graph — needed for build)
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json .npmrc ./
COPY packages/config/tsconfig/package.json ./packages/config/tsconfig/
COPY packages/config/eslint/package.json ./packages/config/eslint/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

ENV HUSKY=0
RUN pnpm install --frozen-lockfile --filter @ecommerce/api... --filter @ecommerce/database...

# ───────────────────────────────────────────────────────────
# Stage 2: Build the application (and generate Prisma client)
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY --from=deps /app/ ./

COPY packages/config/tsconfig/ ./packages/config/tsconfig/
COPY packages/config/eslint/ ./packages/config/eslint/
COPY packages/types/ ./packages/types/
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Generate Prisma client from packages/database (where prisma is installed
# as devDep and the schema lives), then compile the Nest app.
RUN cd packages/database && pnpm exec prisma generate \
 && cd /app && pnpm --filter @ecommerce/api run build

# ───────────────────────────────────────────────────────────
# Stage 3: Production runner — fresh pnpm install (no devDeps)
# Doing a clean install here avoids carrying the builder's
# pnpm symlink graph (which breaks when copied into a slim image).
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Workspace manifests (install needs the full workspace shape).
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json .npmrc ./
COPY --chown=nestjs:nodejs packages/config/tsconfig/package.json ./packages/config/tsconfig/
COPY --chown=nestjs:nodejs packages/config/eslint/package.json ./packages/config/eslint/
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/database/package.json ./packages/database/
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# Fresh install — include dev deps so the `prisma` CLI is available for
# `migrate deploy` at startup. This is small (single CLI) and avoids
# shipping a separate migrator container.
# NODE_ENV=production above would cause pnpm to skip devDeps; pass --prod=false.
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --prod=false --filter @ecommerce/api... --filter @ecommerce/database...

# Built application + Prisma schema/migrations + entrypoint + admin scripts.
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/src ./packages/types/src
COPY --chown=nestjs:nodejs apps/api/scripts ./apps/api/scripts
COPY --chown=nestjs:nodejs apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Generate the Prisma client in the runner so it's wired to the runner's node_modules.
RUN cd packages/database && pnpm exec prisma generate \
 && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/healthz || exit 1

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
