/**
 * One-time backfill for Product.averageRating + Product.totalReviews.
 *
 * Background: until this PR, the two denormalized columns existed but were
 * never written — so every storefront card showed 0 stars and sort-by-rating
 * was effectively random. The reviews service now keeps them in sync on
 * every create/update/delete/moderate; this script catches existing data up.
 *
 * Run:
 *   pnpm --filter @ecommerce/database exec tsx scripts/backfill-product-rating-stats.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ select: { id: true } });
  console.log(`Backfilling rating stats for ${products.length} products…`);

  let updated = 0;
  for (const { id } of products) {
    const stats = await prisma.review.aggregate({
      where: { productId: id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    });
    await prisma.product.update({
      where: { id },
      data: {
        averageRating: Math.round((stats._avg.rating ?? 0) * 100) / 100,
        totalReviews: stats._count.id,
      },
    });
    updated += 1;
    if (updated % 50 === 0) {
      console.log(`  …${updated}/${products.length}`);
    }
  }

  console.log(`Done. Recomputed ${updated} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
