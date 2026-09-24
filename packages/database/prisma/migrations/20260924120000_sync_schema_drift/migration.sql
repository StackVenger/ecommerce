-- Brings the migration history in line with schema.prisma. These columns and
-- tables were added to the schema (and applied to dev databases via db push)
-- without a migration, so a database built by `migrate deploy` was missing them.

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "landmark" TEXT;

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "ctaTextBn" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "subtitleBn" TEXT;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_attributes" ALTER COLUMN "values" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "product_view_events" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_view_events_productId_idx" ON "product_view_events"("productId");

-- CreateIndex
CREATE INDEX "product_view_events_createdAt_idx" ON "product_view_events"("createdAt");

-- CreateIndex
CREATE INDEX "product_view_events_productId_createdAt_idx" ON "product_view_events"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "search_logs_term_idx" ON "search_logs"("term");

-- CreateIndex
CREATE INDEX "search_logs_createdAt_idx" ON "search_logs"("createdAt");

-- CreateIndex
CREATE INDEX "search_logs_term_createdAt_idx" ON "search_logs"("term", "createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_view_events" ADD CONSTRAINT "product_view_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

