/**
 * Watch-store catalogue seed for LOCAL development / testing.
 *
 *   pnpm --filter @ecommerce/database seed:watches
 *
 * What it does (idempotent — safe to re-run):
 *  1. Upserts a two-level watch category tree, watch brands, 87 watch
 *     products (images, variants + attributes, inventory) and watch
 *     homepage banners.
 *  2. Hides everything that isn't part of the watch catalogue so the
 *     storefront shows only watches — non-destructively:
 *       - other products      -> status ARCHIVED
 *       - other categories    -> isActive false
 *       - other banners       -> isActive false
 *     Orders, reviews, carts and users are never touched.
 *
 * Images go through the shared Cloudinary helper (uploaded once, re-used on
 * re-runs); without Cloudinary credentials the Unsplash source URLs are
 * stored directly.
 */
import { AttributeType, Prisma, PrismaClient } from '@prisma/client';

// Also loads the API env files (DATABASE_URL, CLOUDINARY_*) — keep it the
// first local import so the env is ready before PrismaClient is created.
import { seedImage, seedImages, toThumbnailUrl } from './seed-images';
import { WATCH_PRODUCTS, type WatchProductSeed } from './data/watch-products';

const prisma = new PrismaClient();

const IMAGE_FOLDER = 'products/watches';
const unsplash = (id: string, w = 1200, h = 1200) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=85&fm=jpg`;

// ---------------------------------------------------------------------------
// Categories — gender / type at the top, style underneath.
// ---------------------------------------------------------------------------

interface CategorySeed {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  children?: Omit<CategorySeed, 'children'>[];
}

const CATEGORIES: CategorySeed[] = [
  {
    name: "Men's Watches",
    nameBn: 'পুরুষদের ঘড়ি',
    slug: 'mens-watches',
    description: 'Dress, sports, dive, chronograph, automatic and field watches for men.',
    image: unsplash('photo-1692992214153-edeb693a2da3'),
    icon: '⌚',
    children: [
      {
        name: 'Dress Watches',
        nameBn: 'ড্রেস ঘড়ি',
        slug: 'mens-dress-watches',
        description: 'Slim, elegant watches for the office and formal occasions.',
        image: unsplash('photo-1768062251782-fb2ad178c310'),
        icon: '👔',
      },
      {
        name: 'Sports Watches',
        nameBn: 'স্পোর্টস ঘড়ি',
        slug: 'mens-sports-watches',
        description: 'Tough, shock-resistant watches built for an active life.',
        image: unsplash('photo-1605583972593-1fda24a7bea2'),
        icon: '🏃',
      },
      {
        name: 'Diving Watches',
        nameBn: 'ডাইভিং ঘড়ি',
        slug: 'mens-diving-watches',
        description: 'Water-resistant divers with rotating bezels and bright lume.',
        image: unsplash('photo-1646889416154-973ea0e5e36f'),
        icon: '🌊',
      },
      {
        name: 'Chronograph Watches',
        nameBn: 'ক্রোনোগ্রাফ ঘড়ি',
        slug: 'mens-chronograph-watches',
        description: 'Stopwatch complications with sub-dials and tachymeter scales.',
        image: unsplash('photo-1633869699811-cd4f63049b36'),
        icon: '⏱️',
      },
      {
        name: 'Automatic & Mechanical',
        nameBn: 'অটোমেটিক ও মেকানিক্যাল',
        slug: 'mens-automatic-watches',
        description: 'Self-winding and hand-wound watches — no battery required.',
        image: unsplash('photo-1642667049059-04325f205049'),
        icon: '⚙️',
      },
      {
        name: 'Field & Pilot Watches',
        nameBn: 'ফিল্ড ও পাইলট ঘড়ি',
        slug: 'mens-field-pilot-watches',
        description: 'Legible, rugged watches inspired by military and aviation.',
        image: unsplash('photo-1587914839172-657ff0b85b16'),
        icon: '✈️',
      },
    ],
  },
  {
    name: "Women's Watches",
    nameBn: 'মহিলাদের ঘড়ি',
    slug: 'womens-watches',
    description: 'Dress, minimalist, fashion and sports watches for women.',
    image: unsplash('photo-1657159810148-f6a1f3d74f7e'),
    icon: '⌚',
    children: [
      {
        name: 'Dress & Jewellery Watches',
        nameBn: 'ড্রেস ও জুয়েলারি ঘড়ি',
        slug: 'womens-dress-watches',
        description: 'Refined watches with gemstone dials and delicate straps.',
        image: unsplash('photo-1658973071034-0710cd4296a4'),
        icon: '💎',
      },
      {
        name: 'Minimalist Watches',
        nameBn: 'মিনিমালিস্ট ঘড়ি',
        slug: 'womens-minimalist-watches',
        description: 'Clean dials and slim cases for everyday elegance.',
        image: unsplash('photo-1615368144592-44708889c926'),
        icon: '◻️',
      },
      {
        name: 'Fashion Watches',
        nameBn: 'ফ্যাশন ঘড়ি',
        slug: 'womens-fashion-watches',
        description: 'Statement rose-gold and crystal-set pieces.',
        image: unsplash('photo-1751437761644-460ae92e34c9'),
        icon: '✨',
      },
      {
        name: 'Sports Watches',
        nameBn: 'স্পোর্টস ঘড়ি',
        slug: 'womens-sports-watches',
        description: 'Durable, lightweight watches and trackers for workouts.',
        image: unsplash('photo-1620213391117-0d169a917221'),
        icon: '🏃‍♀️',
      },
    ],
  },
  {
    name: 'Unisex Watches',
    nameBn: 'ইউনিসেক্স ঘড়ি',
    slug: 'unisex-watches',
    description: 'Minimalist, retro digital and vintage watches for everyone.',
    image: unsplash('photo-1565530557873-14ab8a68a85b'),
    icon: '⌚',
    children: [
      {
        name: 'Minimalist Watches',
        nameBn: 'মিনিমালিস্ট ঘড়ি',
        slug: 'unisex-minimalist-watches',
        description: 'Simple, modern designs that suit any wrist.',
        image: unsplash('photo-1524592094714-0f0654e20314'),
        icon: '◻️',
      },
      {
        name: 'Digital & Retro',
        nameBn: 'ডিজিটাল ও রেট্রো',
        slug: 'unisex-digital-watches',
        description: 'Classic digital watches with alarms, stopwatches and backlights.',
        image: unsplash('photo-1577993944451-f8618a835822'),
        icon: '📟',
      },
      {
        name: 'Vintage & Pocket Watches',
        nameBn: 'ভিনটেজ ও পকেট ঘড়ি',
        slug: 'vintage-watches',
        description: 'Pre-owned classics and traditional pocket watches.',
        image: unsplash('photo-1778330520628-c52751f86b0c'),
        icon: '🕰️',
      },
    ],
  },
  {
    name: 'Smart Watches',
    nameBn: 'স্মার্ট ঘড়ি',
    slug: 'smart-watches',
    description: 'Smartwatches, GPS sports watches and fitness trackers.',
    image: unsplash('photo-1546868871-7041f2a55e12'),
    icon: '📱',
    children: [
      {
        name: 'Smartwatches',
        nameBn: 'স্মার্টওয়াচ',
        slug: 'smartwatches',
        description: 'Notifications, payments, health tracking and apps on your wrist.',
        image: unsplash('photo-1544117519-31a4b719223d'),
        icon: '📱',
      },
      {
        name: 'Outdoor & GPS Watches',
        nameBn: 'আউটডোর ও জিপিএস ঘড়ি',
        slug: 'outdoor-gps-watches',
        description: 'Multisport GPS watches with maps and long battery life.',
        image: unsplash('photo-1691921673576-07c6032e6306'),
        icon: '🧭',
      },
      {
        name: 'Fitness Trackers',
        nameBn: 'ফিটনেস ট্র্যাকার',
        slug: 'fitness-trackers',
        description: 'Slim bands for steps, heart rate and sleep tracking.',
        image: unsplash('photo-1575311373937-040b8e1fd5b6'),
        icon: '💪',
      },
    ],
  },
  {
    name: 'Luxury Watches',
    nameBn: 'বিলাসবহুল ঘড়ি',
    slug: 'luxury-watches',
    description: 'Swiss luxury icons and limited-edition releases.',
    image: unsplash('photo-1662384197911-e82189f4dc60'),
    icon: '👑',
    children: [
      {
        name: 'Swiss Luxury',
        nameBn: 'সুইস লাক্সারি',
        slug: 'swiss-luxury-watches',
        description: 'Rolex, Omega, Breitling and other Swiss icons.',
        image: unsplash('photo-1691865179028-1729b766a5cd'),
        icon: '👑',
      },
      {
        name: 'Limited Edition',
        nameBn: 'লিমিটেড এডিশন',
        slug: 'limited-edition-watches',
        description: 'Numbered and special-edition releases in limited quantities.',
        image: unsplash('photo-1731000898953-325a3404110f'),
        icon: '🏷️',
      },
    ],
  },
  {
    name: 'Couple Watches',
    nameBn: 'কাপল ঘড়ি',
    slug: 'couple-watches',
    description: 'Matching his & hers sets — perfect for weddings and anniversaries.',
    image: unsplash('photo-1507680576301-98c2029cf434'),
    icon: '💑',
  },
];

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

const BRANDS: { name: string; slug: string; website: string; description: string }[] = [
  {
    name: 'Adriatica',
    slug: 'adriatica',
    website: 'https://www.adriatica.pl',
    description: 'Swiss-made watches with classic, jewellery-inspired designs.',
  },
  {
    name: 'Amazfit',
    slug: 'amazfit',
    website: 'https://www.amazfit.com',
    description: 'Smartwatches and sports watches with long battery life.',
  },
  {
    name: 'Anne Klein',
    slug: 'anne-klein',
    website: 'https://www.anneklein.com',
    description: 'American fashion watches for women since 1968.',
  },
  {
    name: 'Apple',
    slug: 'apple',
    website: 'https://www.apple.com',
    description: 'Apple Watch — health, fitness and connectivity on your wrist.',
  },
  {
    name: 'Breitling',
    slug: 'breitling',
    website: 'https://www.breitling.com',
    description: 'Swiss chronograph and aviation watchmaker since 1884.',
  },
  {
    name: 'Bulova',
    slug: 'bulova',
    website: 'https://www.bulova.com',
    description: 'American watchmaker known for innovation since 1875.',
  },
  {
    name: 'Casio',
    slug: 'casio',
    website: 'https://www.casio.com',
    description: 'Japanese maker of G-Shock, Edifice and classic digital watches.',
  },
  {
    name: 'Citizen',
    slug: 'citizen',
    website: 'https://www.citizenwatch.com',
    description: 'Japanese watchmaker and pioneer of light-powered Eco-Drive.',
  },
  {
    name: 'Curren',
    slug: 'curren',
    website: 'https://www.curren-watch.com',
    description: 'Affordable fashion and chronograph watches.',
  },
  {
    name: 'Daniel Wellington',
    slug: 'daniel-wellington',
    website: 'https://www.danielwellington.com',
    description: 'Swedish minimalist watches and accessories.',
  },
  {
    name: 'Fitbit',
    slug: 'fitbit',
    website: 'https://www.fitbit.com',
    description: 'Fitness trackers and health-focused wearables.',
  },
  {
    name: 'Fossil',
    slug: 'fossil',
    website: 'https://www.fossil.com',
    description: 'American lifestyle watches with vintage-inspired designs.',
  },
  {
    name: 'Garmin',
    slug: 'garmin',
    website: 'https://www.garmin.com',
    description: 'GPS sports, outdoor and fitness smartwatches.',
  },
  {
    name: 'Huawei',
    slug: 'huawei',
    website: 'https://consumer.huawei.com',
    description: 'Smart wearables and fitness bands.',
  },
  {
    name: 'Lola Rose',
    slug: 'lola-rose',
    website: 'https://www.lolarose.co.uk',
    description: 'London-designed watches with natural gemstone dials.',
  },
  {
    name: 'Mido',
    slug: 'mido',
    website: 'https://www.midowatches.com',
    description: 'Swiss automatic watches inspired by architecture since 1918.',
  },
  {
    name: 'Omega',
    slug: 'omega',
    website: 'https://www.omegawatches.com',
    description: 'Swiss luxury watchmaker — Seamaster, Speedmaster, Constellation.',
  },
  {
    name: 'Oris',
    slug: 'oris',
    website: 'https://www.oris.ch',
    description: 'Independent Swiss maker of mechanical watches since 1904.',
  },
  {
    name: 'Rado',
    slug: 'rado',
    website: 'https://www.rado.com',
    description: 'Swiss watches known for high-tech ceramic.',
  },
  {
    name: 'Rolex',
    slug: 'rolex',
    website: 'https://www.rolex.com',
    description: 'Swiss luxury watches — Submariner, Datejust, Day-Date.',
  },
  {
    name: 'Samsung',
    slug: 'samsung',
    website: 'https://www.samsung.com',
    description: 'Galaxy Watch smartwatches running Wear OS.',
  },
  {
    name: 'Seiko',
    slug: 'seiko',
    website: 'https://www.seikowatches.com',
    description: 'Japanese watchmaker — Seiko 5, Presage and Prospex.',
  },
  {
    name: 'Skagen',
    slug: 'skagen',
    website: 'https://www.skagen.com',
    description: 'Danish minimalist design with slim cases.',
  },
  {
    name: 'Timex',
    slug: 'timex',
    website: 'https://www.timex.com',
    description: 'American watches since 1854, famous for Indiglo.',
  },
  {
    name: 'Tissot',
    slug: 'tissot',
    website: 'https://www.tissotwatches.com',
    description: 'Swiss watchmaker since 1853 — PRX, Classic and T-Sport.',
  },
  {
    name: 'Xiaomi',
    slug: 'xiaomi',
    website: 'https://www.mi.com',
    description: 'Smart bands and smartwatches with great value.',
  },
];

// ---------------------------------------------------------------------------
// Homepage banners
// ---------------------------------------------------------------------------

const BANNERS: {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  link: string;
  position: 'HERO' | 'SIDEBAR';
  image: string;
}[] = [
  {
    id: 'watch-hero-swiss',
    title: 'The Swiss Luxury Edit',
    subtitle: 'Rolex, Omega, Breitling and more — authenticated and ready to ship.',
    ctaText: 'Shop Luxury',
    link: '/categories/luxury-watches',
    position: 'HERO',
    image: unsplash('photo-1768062251782-fb2ad178c310', 1800, 800),
  },
  {
    id: 'watch-hero-divers',
    title: 'Built for the Deep',
    subtitle: 'Dive watches from Seiko, Oris and Rado with up to 300m water resistance.',
    ctaText: 'Shop Divers',
    link: '/categories/mens-diving-watches',
    position: 'HERO',
    image: unsplash('photo-1646889416154-973ea0e5e36f', 1800, 800),
  },
  {
    id: 'watch-hero-smart',
    title: 'Smart Watches, Smarter Days',
    subtitle: 'Apple Watch, Galaxy Watch and Garmin — track health, workouts and more.',
    ctaText: 'Shop Smart Watches',
    link: '/categories/smart-watches',
    position: 'HERO',
    image: unsplash('photo-1617043983671-adaadcaa2460', 1800, 800),
  },
  {
    id: 'watch-side-couple',
    title: 'Couple Watches',
    subtitle: 'Matching sets for weddings and anniversaries',
    ctaText: 'Shop Now',
    link: '/categories/couple-watches',
    position: 'SIDEBAR',
    image: unsplash('photo-1507680576301-98c2029cf434', 1200, 600),
  },
  {
    id: 'watch-side-new',
    title: 'New Arrivals',
    subtitle: 'The latest watches in store',
    ctaText: 'Shop Now',
    link: '/collections/new-arrivals',
    position: 'SIDEBAR',
    image: unsplash('photo-1587914839172-657ff0b85b16', 1200, 600),
  },
];

// ---------------------------------------------------------------------------

async function seedCategories(): Promise<Map<string, string>> {
  console.log('Seeding watch categories...');
  const ids = new Map<string, string>();
  let order = 0;
  for (const top of CATEGORIES) {
    const { children, ...data } = top;
    const image = await seedImage(data.image, 'categories');
    const parent = await prisma.category.upsert({
      where: { slug: data.slug },
      update: { ...data, image, parentId: null, isActive: true, sortOrder: order },
      create: { ...data, image, sortOrder: order },
    });
    ids.set(parent.slug, parent.id);
    order++;
    let childOrder = 0;
    for (const child of children ?? []) {
      const childImage = await seedImage(child.image, 'categories');
      const c = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          ...child,
          image: childImage,
          parentId: parent.id,
          isActive: true,
          sortOrder: childOrder,
        },
        create: { ...child, image: childImage, parentId: parent.id, sortOrder: childOrder },
      });
      ids.set(c.slug, c.id);
      childOrder++;
    }
  }
  console.log(`  ${ids.size} categories`);
  return ids;
}

async function seedBrands(): Promise<Map<string, string>> {
  console.log('Seeding watch brands...');
  const ids = new Map<string, string>();
  for (const [i, b] of BRANDS.entries()) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { isActive: true, website: b.website, description: b.description },
      create: { ...b, sortOrder: i, isActive: true },
    });
    ids.set(b.slug, brand.id);
  }
  console.log(`  ${ids.size} brands`);
  return ids;
}

/** Effective stock: sum of variant stock, or the product's own quantity. */
function effectiveStock(p: WatchProductSeed): number {
  return p.variants ? p.variants.items.reduce((s, v) => s + v.quantity, 0) : (p.quantity ?? 0);
}

async function seedProduct(
  p: WatchProductSeed,
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
) {
  const categoryId = categoryIds.get(p.categorySlug);
  if (!categoryId) {
    throw new Error(`Unknown category "${p.categorySlug}" for ${p.name}`);
  }
  const stock = effectiveStock(p);
  const createdAt = new Date(Date.now() - p.ageDays * 24 * 60 * 60 * 1000);

  const data = {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    shortDescription: p.shortDescription,
    price: new Prisma.Decimal(p.price),
    compareAtPrice: p.compareAtPrice !== null ? new Prisma.Decimal(p.compareAtPrice) : null,
    costPrice: new Prisma.Decimal(p.costPrice),
    quantity: stock,
    // Mirrors ProductsService.recomputeProductStatus: sold-out -> OUT_OF_STOCK.
    status: stock > 0 ? ('ACTIVE' as const) : ('OUT_OF_STOCK' as const),
    categoryId,
    brandId: p.brandSlug ? (brandIds.get(p.brandSlug) ?? null) : null,
    tags: p.tags,
    isFeatured: p.isFeatured,
    weight: new Prisma.Decimal(p.categorySlug.includes('luxury') ? 0.2 : 0.12),
    weightUnit: 'kg',
    metaTitle: `${p.name} | Watches`,
    metaDescription: p.shortDescription,
    createdAt,
  };

  const product = await prisma.product.upsert({
    where: { slug: p.slug },
    update: data,
    create: data,
  });

  // Images — deterministic ids so re-seeding updates in place.
  const urls = await seedImages(p.images, IMAGE_FOLDER);
  const imageIds = urls.map((_, i) => `seed-img-${p.slug}-${i}`);
  await prisma.productImage.deleteMany({
    where: { productId: product.id, id: { notIn: imageIds } },
  });
  for (const [i, url] of urls.entries()) {
    const imageData = {
      productId: product.id,
      url,
      thumbnailUrl: toThumbnailUrl(url),
      alt: p.name,
      isPrimary: i === 0,
      sortOrder: i,
    };
    await prisma.productImage.upsert({
      where: { id: imageIds[i] },
      update: imageData,
      create: { id: imageIds[i]!, ...imageData },
    });
  }

  // Variants + attributes (so the product page's option picker works).
  if (p.variants) {
    const attrIds = new Map<string, string>();
    for (const attr of p.variants.attributes) {
      const existing = await prisma.productAttribute.findFirst({
        where: { productId: product.id, name: attr.name },
      });
      const saved = existing
        ? await prisma.productAttribute.update({
            where: { id: existing.id },
            data: { type: attr.type as AttributeType, values: attr.values },
          })
        : await prisma.productAttribute.create({
            data: {
              productId: product.id,
              name: attr.name,
              type: attr.type as AttributeType,
              values: attr.values,
            },
          });
      attrIds.set(attr.name, saved.id);
    }

    const defaultIndex = Math.max(
      0,
      p.variants.items.findIndex((v) => v.quantity > 0),
    );
    for (const [i, v] of p.variants.items.entries()) {
      const variantData = {
        productId: product.id,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        compareAtPrice: v.compareAtPrice !== null ? new Prisma.Decimal(v.compareAtPrice) : null,
        costPrice: new Prisma.Decimal(Math.round(v.price * 0.72)),
        quantity: v.quantity,
        lowStockThreshold: 3,
        isActive: true,
        isDefault: i === defaultIndex,
        sortOrder: i,
      };
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: variantData,
        create: { sku: v.sku, ...variantData },
      });
      for (const [attrName, value] of Object.entries(v.values)) {
        const attributeId = attrIds.get(attrName)!;
        await prisma.productVariantAttributeValue.upsert({
          where: { variantId_attributeId: { variantId: variant.id, attributeId } },
          update: { value },
          create: { variantId: variant.id, attributeId, value },
        });
      }
      // Variant photo (used as the colour swatch on the product page).
      if (v.image !== null) {
        await prisma.productImage.update({
          where: { id: imageIds[v.image] },
          data: { variantId: variant.id },
        });
      }
    }
  }

  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: { quantity: stock, lowStockThreshold: 3 },
    create: {
      productId: product.id,
      quantity: stock,
      reservedQuantity: 0,
      lowStockThreshold: 3,
      trackInventory: true,
      allowBackorder: false,
    },
  });
}

async function seedProducts(categoryIds: Map<string, string>, brandIds: Map<string, string>) {
  console.log(`Seeding ${WATCH_PRODUCTS.length} watch products (images may take a while)...`);
  let done = 0;
  for (const p of WATCH_PRODUCTS) {
    await seedProduct(p, categoryIds, brandIds);
    done++;
    if (done % 10 === 0) {
      console.log(`  ${done}/${WATCH_PRODUCTS.length}`);
    }
  }
  console.log(`  ${done} products`);
}

async function seedBanners() {
  console.log('Seeding watch banners...');
  for (const [i, b] of BANNERS.entries()) {
    const image = await seedImage(b.image, 'banners');
    const data = {
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      link: b.link,
      position: b.position,
      image,
      isActive: true,
      sortOrder: i,
    };
    await prisma.banner.upsert({
      where: { id: b.id },
      update: data,
      create: { id: b.id, ...data },
    });
  }
  console.log(`  ${BANNERS.length} banners`);
}

/** Hide (never delete) everything outside the watch catalogue. */
async function hideNonWatchCatalogue(categorySlugs: string[]) {
  console.log('Hiding the non-watch catalogue (reversible)...');
  const products = await prisma.product.updateMany({
    where: { sku: { not: { startsWith: 'WT-' } }, status: { not: 'ARCHIVED' } },
    data: { status: 'ARCHIVED' },
  });
  const categories = await prisma.category.updateMany({
    where: { slug: { notIn: categorySlugs }, isActive: true },
    data: { isActive: false },
  });
  const banners = await prisma.banner.updateMany({
    where: { id: { notIn: BANNERS.map((b) => b.id) }, isActive: true },
    data: { isActive: false },
  });
  console.log(
    `  archived ${products.count} products, deactivated ${categories.count} categories and ${banners.count} banners`,
  );
}

async function main() {
  console.log('Seeding the watch catalogue...\n');
  const categoryIds = await seedCategories();
  const brandIds = await seedBrands();
  await seedProducts(categoryIds, brandIds);
  await seedBanners();
  await hideNonWatchCatalogue([...categoryIds.keys()]);
  console.log('\nWatch catalogue seeded.');
}

main()
  .catch((e) => {
    console.error('Watch seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
