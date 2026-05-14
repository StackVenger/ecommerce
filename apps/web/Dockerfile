# ═══════════════════════════════════════════════════════════
# E-Commerce Web — Multi-stage Docker Build (Next.js)
# ═══════════════════════════════════════════════════════════
# Build:   docker build -t ecommerce-web -f apps/web/Dockerfile .
# Run:     docker run -p 3000:3000 --env-file .env ecommerce-web
# ═══════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────
# Stage 1: Install dependencies
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json .npmrc ./
COPY packages/config/tsconfig/package.json ./packages/config/tsconfig/
COPY packages/config/eslint/package.json ./packages/config/eslint/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install only the dependencies needed for the Web app
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --filter @ecommerce/web...

# ───────────────────────────────────────────────────────────
# Stage 2: Build the application
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/ ./

# Copy source code for all packages the Web app depends on
COPY packages/config/tsconfig/ ./packages/config/tsconfig/
COPY packages/config/eslint/ ./packages/config/eslint/
COPY packages/types/ ./packages/types/
COPY packages/ui/ ./packages/ui/
COPY apps/web/ ./apps/web/

# Build-time environment variables (Next.js bakes NEXT_PUBLIC_* into the bundle at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app with standalone output
RUN pnpm --filter @ecommerce/web run build

# ───────────────────────────────────────────────────────────
# Stage 3: Production runner
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
