'use client';

import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { EmptyState, ShopSectionHeading } from '@/components/ui/bento';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { apiClient } from '@/lib/api/client';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  averageRating: number;
  reviewCount: number;
  brandName: string | null;
  categoryName: string | null;
  isFeatured: boolean;
  shortDescription: string | null;
  stock: number;
  defaultVariantId?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string | null;
  _count?: { products: number };
  children?: Category[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function normalizeProduct(raw: any): Product {
  const defaultVariant = Array.isArray(raw.variants)
    ? (raw.variants.find((v: any) => v.isDefault === true) ?? raw.variants[0] ?? null)
    : null;

  const defaultVariantImage: string | null = (() => {
    const img = defaultVariant?.images?.[0];
    if (!img) {
      return null;
    }
    return typeof img === 'string' ? img : (img.url ?? null);
  })();

  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
    : [];

  const price = defaultVariant ? Number(defaultVariant.price) : Number(raw.price);
  const compareAtPrice = defaultVariant
    ? defaultVariant.compareAtPrice
      ? Number(defaultVariant.compareAtPrice)
      : undefined
    : raw.compareAtPrice
      ? Number(raw.compareAtPrice)
      : undefined;
  const stock = defaultVariant ? (defaultVariant.quantity ?? 0) : (raw.quantity ?? 0);
  const defaultVariantId = defaultVariant ? defaultVariant.id : undefined;

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price,
    compareAtPrice,
    images: defaultVariantImage ? [defaultVariantImage, ...rawImages] : rawImages,
    averageRating: Number(raw.averageRating ?? 0),
    // Prefer the denormalized column — it's written by the same recompute
    // helper as averageRating, so the stars and count always agree. _count
    // is a fallback for any legacy response that lacks totalReviews.
    reviewCount: raw.totalReviews ?? raw._count?.reviews ?? 0,
    brandName: raw.brand?.name ?? raw.brandName ?? null,
    categoryName: raw.category?.name ?? raw.categoryName ?? null,
    isFeatured: raw.isFeatured ?? false,
    shortDescription: raw.shortDescription ?? null,
    stock,
    defaultVariantId,
  };
}

function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

function discountPercent(price: number, compare?: number): number {
  if (!compare || compare <= price) {
    return 0;
  }
  return Math.round((1 - price / compare) * 100);
}

// A HERO slide derived from either an admin Banner row or the baked-in
// defaults below. Each slide is a single image + copy + link.
interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  href: string;
  image: string;
}

interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  link?: string | null;
}

// Fallbacks used when no HERO banners exist in the DB (fresh install /
// admin cleared the carousel). Keep this lean — admins are expected to
// replace these with real promotions in /admin/banners.
const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'default-eid',
    title: 'Eid Collection 2026',
    subtitle: 'Discover the finest traditional & modern wear',
    cta: 'Shop Now',
    href: '/categories/fashion',
    image:
      'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-electronics',
    title: 'Electronics Festival',
    subtitle: 'Up to 40% off on smartphones & gadgets',
    cta: 'Explore Deals',
    href: '/categories/electronics',
    image:
      'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-home',
    title: 'Home & Living Sale',
    subtitle: 'Transform your space with up to 30% off furniture & decor',
    cta: 'Shop Home',
    href: '/categories/home-living',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-beauty',
    title: 'Beauty & Wellness',
    subtitle: 'Premium skincare, makeup & self-care essentials',
    cta: 'Explore Beauty',
    href: '/categories/beauty-health',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-free-delivery',
    title: 'Free Delivery Week',
    subtitle: 'Free shipping on all orders over ৳1,000',
    cta: 'Shop All',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&h=700&fit=crop&q=80',
  },
];

/**
 * Normalise the Banner model rows coming from GET /banners?position=HERO
 * into the HeroSlide shape the carousel renders. Skips rows without an
 * image or title.
 */
function bannersToHeroSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows = raw as Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    image: string;
    link?: string | null;
    ctaText?: string | null;
  }>;
  return rows
    .filter((r) => r?.image && r.title)
    .map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle ?? undefined,
      cta: r.ctaText ?? 'Shop Now',
      href: r.link ?? '/products',
      image: r.image,
    }));
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  fashion: '👗',
  'home-living': '🏠',
  beauty: '💄',
  'sports-outdoors': '⚽',
  'books-stationery': '📚',
  'baby-kids': '👶',
  'food-grocery': '🛒',
};

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [sidebarBanners, setSidebarBanners] = useState<PromoBanner[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { cart, addItem } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function fetchData() {
      try {
        const [featuredRes, newRes, catRes, heroRes, sidebarRes] = await Promise.all([
          apiClient.get('/products', {
            params: { limit: 8, sortBy: 'viewCount', sortOrder: 'desc', isFeatured: true },
          }),
          apiClient.get('/products', {
            params: { limit: 8, sortBy: 'createdAt', sortOrder: 'desc' },
          }),
          apiClient.get('/categories'),
          apiClient.get('/banners', { params: { position: 'HERO' } }).catch(() => null),
          apiClient.get('/banners', { params: { position: 'SIDEBAR' } }).catch(() => null),
        ]);

        setFeaturedProducts((featuredRes.data.data || []).map(normalizeProduct));
        setNewArrivals((newRes.data.data || []).map(normalizeProduct));
        setCategories(
          Array.isArray(catRes.data)
            ? catRes.data
            : Array.isArray(catRes.data.data)
              ? catRes.data.data
              : [],
        );

        // Use admin HERO banners when configured; keep defaults otherwise.
        // The API response has `{ banners, data }` — prefer `data`.
        if (heroRes) {
          const payload = heroRes.data?.data ?? heroRes.data?.banners ?? heroRes.data;
          const fromAdmin = bannersToHeroSlides(payload);
          if (fromAdmin.length > 0) {
            setHeroSlides(fromAdmin);
          }
        }

        if (sidebarRes) {
          const payload = sidebarRes.data?.data ?? sidebarRes.data?.banners ?? sidebarRes.data;
          if (Array.isArray(payload)) {
            setSidebarBanners(
              payload
                .filter((b: { image?: string; title?: string }) => b?.image && b?.title)
                .map((b) => ({
                  id: b.id,
                  title: b.title,
                  subtitle: b.subtitle ?? null,
                  image: b.image,
                  link: b.link ?? null,
                })),
            );
          }
        }
      } catch (err) {
        console.error('Failed to fetch homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Auto-rotate hero — depends on `heroSlides` so swapping the source
  // mid-session (defaults → admin) picks up the new length cleanly.
  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }
    const timer = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem(
        {
          productId: product.id,
          variantId: product.defaultVariantId,
          quantity: 1,
        },
        { openDrawer: false },
      );
    },
    [addItem],
  );

  // Get top-level categories with product counts
  const topCategories = categories.slice(0, 8);

  // ── Render helpers ──

  function renderProductCard(product: Product) {
    const isAlreadyInCart = cart?.items?.some((item) => item.productId === product.id);
    const discount = discountPercent(product.price, product.compareAtPrice);

    return (
      <ProductCard
        key={product.id}
        href={`/products/${product.slug}`}
        name={product.name}
        image={product.images[0]}
        brand={product.brandName}
        rating={product.averageRating}
        reviewCount={product.reviewCount}
        price={product.price}
        originalPrice={product.compareAtPrice}
        formatPrice={formatBDT}
        badges={discount > 0 ? [{ label: `-${discount}%`, tone: 'sale' }] : []}
        inCart={isAlreadyInCart}
        outOfStock={product.stock <= 0}
        onAddToCart={() => handleAddToCart(product)}
        wishlisted={wishlist.has(product.id)}
        onToggleWishlist={() => toggleWishlist(product.id)}
      />
    );
  }

  // ── Skeleton loaders ──
  function renderProductSkeleton() {
    return Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />);
  }

  const activeSlide = heroSlides[heroIndex] ?? heroSlides[0];

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ─── Hero slider ─────────────────────────────────────────────── */}
      <section
        className="relative h-[420px] overflow-hidden bg-gray-50 sm:h-[480px] lg:h-[560px]"
        aria-roledescription="carousel"
        aria-label="Featured promotions"
      >
        {heroSlides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === heroIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
            aria-hidden={i !== heroIndex}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                i === heroIndex ? 'scale-105' : 'scale-100'
              }`}
            />
            {/* Light wash from the left keeps the dark copy legible on any photo. */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-white/0 dark:from-black/85 dark:via-black/55 dark:to-black/0 sm:via-white/60 sm:dark:via-black/45" />

            <div className="site-container relative flex h-full items-center px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl">
                <h1
                  className={`font-heading text-3xl font-semibold leading-tight text-gray-900 transition-all delay-200 duration-700 sm:text-4xl lg:text-[3.125rem] ${
                    i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                  }`}
                >
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p
                    className={`mt-4 text-base text-gray-700 transition-all delay-300 duration-700 sm:text-lg ${
                      i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    {slide.subtitle}
                  </p>
                )}
                <Link
                  href={slide.href}
                  tabIndex={i === heroIndex ? undefined : -1}
                  className={`btn btn-primary btn-lg mt-7 transition-all delay-[400ms] duration-700 ${
                    i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                  }`}
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}

        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-card/80 text-gray-900 transition-colors hover:bg-primary hover:text-white md:flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-card/80 text-gray-900 transition-colors hover:bg-primary hover:text-white md:flex"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {heroSlides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === heroIndex}
                  className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                    i === heroIndex ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {activeSlide
            ? `Slide ${heroIndex + 1} of ${heroSlides.length}: ${activeSlide.title}`
            : ''}
        </span>
      </section>

      {/* ─── Feature strip ───────────────────────────────────────────── */}
      <section className="site-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-b border-gray-200 py-7 sm:py-8 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3 sm:gap-4">
              <item.icon
                className="h-9 w-9 shrink-0 text-primary sm:h-10 sm:w-10"
                strokeWidth={1.25}
              />
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold text-primary">{item.title}</p>
                <p className="text-[13px] text-gray-600">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Promo panels ────────────────────────────────────────────── */}
      <section className="site-container px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link
            href="/categories/electronics"
            className="group relative flex min-h-[200px] flex-col justify-center overflow-hidden bg-ink p-8 text-white sm:min-h-[220px] sm:p-10"
          >
            <Zap
              className="absolute -right-6 -top-6 h-48 w-48 text-white/[0.06] transition-transform duration-700 group-hover:scale-110"
              strokeWidth={1}
              aria-hidden
            />
            <p className="text-sm uppercase tracking-wide text-primary">Limited time</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">Flash Sale</h3>
            <p className="mt-2 text-sm text-white/80">
              Up to 50% off on electronics — limited time!
            </p>
            <span className="mt-5 w-fit border-b-2 border-white pb-0.5 font-heading text-sm font-semibold uppercase tracking-wide transition-colors group-hover:border-primary group-hover:text-primary">
              View Deals
            </span>
          </Link>

          <Link
            href="/categories/fashion"
            className="group relative flex min-h-[200px] flex-col justify-center overflow-hidden bg-gray-100 p-8 sm:min-h-[220px] sm:items-end sm:p-10 sm:text-right"
          >
            <Sparkles
              className="absolute -left-6 -top-6 h-48 w-48 text-gray-900/[0.05] transition-transform duration-700 group-hover:scale-110"
              strokeWidth={1}
              aria-hidden
            />
            <p className="text-sm uppercase tracking-wide text-primary">Collection</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900 sm:text-3xl">
              Traditional Wear
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Authentic Bangladeshi clothing for every occasion
            </p>
            <span className="mt-5 w-fit border-b-2 border-gray-900 pb-0.5 font-heading text-sm font-semibold uppercase tracking-wide text-gray-900 transition-colors group-hover:border-primary group-hover:text-primary">
              Shop Now
            </span>
          </Link>
        </div>
      </section>

      {/* ─── Sidebar promo banners (SIDEBAR position) ────────────────── */}
      {sidebarBanners.length > 0 && (
        <section className="site-container px-4 pt-3 sm:px-6 lg:px-8">
          <div
            className={`grid gap-3 ${
              sidebarBanners.length === 1
                ? 'grid-cols-1'
                : sidebarBanners.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {sidebarBanners.slice(0, 6).map((b) => {
              const card = (
                <div className="group relative overflow-hidden bg-gray-50">
                  <img
                    src={b.image}
                    alt={b.title}
                    className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-56"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                  <div className="absolute inset-y-0 left-7 right-7 flex flex-col justify-center text-white">
                    <h3 className="font-heading text-2xl font-semibold">{b.title}</h3>
                    {b.subtitle && <p className="mt-1 text-sm text-white/85">{b.subtitle}</p>}
                    {b.link && (
                      <span className="mt-4 w-fit border-b-2 border-white pb-0.5 font-heading text-sm font-semibold uppercase tracking-wide">
                        Shop Now
                      </span>
                    )}
                  </div>
                </div>
              );
              return b.link ? (
                <Link key={b.id} href={b.link}>
                  {card}
                </Link>
              ) : (
                <div key={b.id}>{card}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Shop by Category ────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <section className="site-container px-4 pt-14 sm:px-6 lg:px-8">
          <ShopSectionHeading
            title="Shop by Categories"
            action={
              <Link
                href="/categories"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-primary"
              >
                View All
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCategories.map((cat: any) => {
              const productCount =
                cat.productCount ??
                cat._count?.products ??
                cat.children?.reduce(
                  (s: number, c: any) => s + (c.productCount ?? c._count?.products ?? 0),
                  0,
                ) ??
                0;
              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group flex flex-col border border-gray-200 bg-card text-center transition-colors hover:border-primary"
                >
                  {cat.image ? (
                    <span className="relative block aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </span>
                  ) : (
                    <span className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-2xl transition-transform duration-300 group-hover:scale-110">
                      {CATEGORY_ICONS[cat.slug] || '📦'}
                    </span>
                  )}
                  <span className="px-3 pb-4 pt-3">
                    <h3 className="w-full truncate font-heading text-sm font-semibold text-gray-900 transition-colors group-hover:text-primary">
                      {cat.name}
                    </h3>
                    {productCount > 0 && (
                      <span className="mt-1 block text-xs text-gray-500">
                        {productCount} products
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Featured Products ───────────────────────────────────────── */}
      <section className="site-container px-4 pt-14 sm:px-6 lg:px-8">
        <ShopSectionHeading
          title="Featured Products"
          action={
            <Link
              href="/products?isFeatured=true"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              View All
            </Link>
          }
        />

        <ProductGrid>
          {loading ? renderProductSkeleton() : featuredProducts.map(renderProductCard)}
        </ProductGrid>

        {!loading && featuredProducts.length === 0 && (
          <EmptyState bare icon={Zap} title="No featured products available." />
        )}
      </section>

      {/* ─── New Arrivals ────────────────────────────────────────────── */}
      <section className="site-container px-4 pt-14 sm:px-6 lg:px-8">
        <ShopSectionHeading
          title="New Arrivals"
          action={
            <Link
              href="/products?sortBy=createdAt&sortOrder=desc"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              View All
            </Link>
          }
        />

        <ProductGrid>
          {loading ? renderProductSkeleton() : newArrivals.map(renderProductCard)}
        </ProductGrid>
      </section>
    </div>
  );
}

const TRUST_ITEMS: { title: string; caption: string; icon: LucideIcon }[] = [
  { title: 'Free Delivery', caption: 'On orders over ৳2,000', icon: Truck },
  { title: 'Secure Payment', caption: 'bKash, Nagad, Cards', icon: ShieldCheck },
  { title: 'Easy Returns', caption: '7-day return policy', icon: RotateCcw },
  { title: 'Made in Bangladesh', caption: 'Supporting local businesses', icon: Sparkles },
];
