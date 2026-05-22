/**
 * One-shot backfill script: promotes every variant-bound ProductImage URL
 * that has no matching product-level (variantId = NULL) row into the product
 * gallery.
 *
 * Run (dry-run first, then for real):
 *   pnpm --filter @ecommerce/api exec tsx scripts/promote-variant-images.ts --dry-run
 *   pnpm --filter @ecommerce/api exec tsx scripts/promote-variant-images.ts
 *
 * Or via the package.json alias once added:
 *   pnpm --filter @ecommerce/api promote:images
 *
 * Flags:
 *   --dry-run      Print what would be created without writing to the DB.
 *   --product=ID   Only process the given product ID (useful for spot-checks).
 *
 * The script is fully idempotent: if a gallery row already exists for a URL
 * it is skipped. Running it multiple times is safe.
 */

import * as path from 'path';

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

// ─── Env bootstrap ─────────────────────────────────────────────────────────────

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

// ─── Flags ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const PRODUCT_ARG = argv.find((a) => a.startsWith('--product='));
const ONLY_PRODUCT = PRODUCT_ARG ? PRODUCT_ARG.slice('--product='.length).trim() : null;

// ─── Prisma ────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

// ─── Core logic ────────────────────────────────────────────────────────────────

interface Stats {
  productsScanned: number;
  urlsScanned: number;
  rowsCreated: number;
  rowsSkipped: number;
}

async function promoteForProduct(productId: string, stats: Stats): Promise<void> {
  // Find all distinct variant-bound URLs for this product.
  const variantImages = await prisma.productImage.findMany({
    where: { productId, variantId: { not: null } },
    select: { url: true },
    distinct: ['url'],
    orderBy: { url: 'asc' },
  });

  if (variantImages.length === 0) {
    return;
  }

  stats.productsScanned++;

  for (const { url } of variantImages) {
    stats.urlsScanned++;

    // Check whether a product-level row already exists for this URL.
    const existing = await prisma.productImage.findFirst({
      where: { productId, url, variantId: null },
      select: { id: true },
    });

    if (existing) {
      stats.rowsSkipped++;
      continue;
    }

    // Determine the next sortOrder value in the gallery.
    const lastGallery = await prisma.productImage.findFirst({
      where: { productId, variantId: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (lastGallery?.sortOrder ?? -1) + 1;

    if (DRY_RUN) {
      console.log(
        `  [DRY-RUN] would create gallery row for product ${productId}  sortOrder=${sortOrder}`,
      );
      console.log(`            url: ${url}`);
      stats.rowsCreated++;
      continue;
    }

    await prisma.productImage.create({
      data: {
        productId,
        variantId: null,
        url,
        sortOrder,
        isPrimary: false,
      },
    });

    console.log(`  ✓ created gallery row (sortOrder=${sortOrder})`);
    console.log(`    url: ${url}`);
    stats.rowsCreated++;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    `\nVariant-image promotion backfill${DRY_RUN ? ' [DRY RUN]' : ''}${ONLY_PRODUCT ? ` — product ${ONLY_PRODUCT} only` : ''}\n`,
  );

  const stats: Stats = {
    productsScanned: 0,
    urlsScanned: 0,
    rowsCreated: 0,
    rowsSkipped: 0,
  };

  if (ONLY_PRODUCT) {
    // Spot-check mode: process only the given product.
    const product = await prisma.product.findUnique({
      where: { id: ONLY_PRODUCT },
      select: { id: true, name: true },
    });
    if (!product) {
      console.error(`Product "${ONLY_PRODUCT}" not found.`);
      process.exit(1);
    }
    console.log(`Product: ${product.name} (${product.id})`);
    await promoteForProduct(product.id, stats);
  } else {
    // Full sweep: find every product that has at least one variant-bound image.
    const affected = await prisma.productImage.findMany({
      where: { variantId: { not: null } },
      select: { productId: true },
      distinct: ['productId'],
    });

    console.log(`Found ${affected.length} product(s) with variant-bound images.\n`);

    for (const { productId } of affected) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
      });
      if (!product) {
        continue;
      }
      console.log(`▶ ${product.name} (${product.id})`);
      await promoteForProduct(product.id, stats);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`Products scanned  : ${stats.productsScanned}`);
  console.log(`URLs scanned      : ${stats.urlsScanned}`);
  console.log(`Gallery rows created : ${stats.rowsCreated}${DRY_RUN ? ' (dry-run, not written)' : ''}`);
  console.log(`Already existed   : ${stats.rowsSkipped}`);
  console.log('─────────────────────────────────────────\n');

  if (DRY_RUN) {
    console.log('Re-run without --dry-run to apply the changes.\n');
  } else {
    console.log('Done. All variant URLs now have a matching product-gallery row.\n');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
