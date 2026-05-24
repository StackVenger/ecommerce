/**
 * One-time backfill: lowercase + trim all Product.tags arrays.
 *
 * Background: until this PR, tags were stored as-entered (e.g. "Electronics")
 * but the search query lowercases its input (`{ has: search.toLowerCase() }`).
 * Mixed-case tags never matched. Writes now normalize at the DTO layer; this
 * script catches existing rows up.
 *
 * Run:
 *   pnpm --filter @ecommerce/database exec tsx scripts/normalize-product-tags.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, tags: true },
  });
  console.log(`Normalizing tags for ${products.length} products…`);

  let touched = 0;
  for (const p of products) {
    const normalized = Array.from(
      new Set(
        (p.tags ?? [])
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0),
      ),
    );
    const original = p.tags ?? [];
    const changed =
      normalized.length !== original.length ||
      normalized.some((t, i) => t !== original[i]);
    if (!changed) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { tags: normalized },
    });
    touched += 1;
  }

  console.log(`Done. Updated ${touched} of ${products.length} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
