'use client';

import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import {
  BentoGlow,
  EmptyState,
  IconTile,
  SectionHeader,
  type BentoTone,
} from '@/components/ui/bento';
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count?: { products: number };
  children?: Category[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function normalizeProduct(raw: any): Product {
  const defaultVariantImage: string | null = (() => {
    const v = Array.isArray(raw.variants) ? raw.variants[0] : null;
    const img = v?.images?.[0];
    if (!img) {
      return null;
    }
    return typeof img === 'string' ? img : (img.url ?? null);
  })();

  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
    : [];

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: Number(raw.price),
    compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : undefined,
    images: defaultVariantImage ? [defaultVariantImage, ...rawImages] : rawImages,
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw._count?.reviews ?? raw.totalReviews ?? 0,
    brandName: raw.brand?.name ?? raw.brandName ?? null,
    categoryName: raw.category?.name ?? raw.categoryName ?? null,
    isFeatured: raw.isFeatured ?? false,
    shortDescription: raw.shortDescription ?? null,
    stock: raw.quantity ?? 0,
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
// defaults below. Each slide is a single image + overlay + copy + link.
interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  href: string;
  image: string;
  overlay: string;
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
    overlay: 'from-black/70 via-black/50 to-black/30',
    image:
      'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-electronics',
    title: 'Electronics Festival',
    subtitle: 'Up to 40% off on smartphones & gadgets',
    cta: 'Explore Deals',
    href: '/categories/electronics',
    overlay: 'from-blue-900/75 via-blue-900/50 to-blue-900/25',
    image:
      'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-home',
    title: 'Home & Living Sale',
    subtitle: 'Transform your space with up to 30% off furniture & decor',
    cta: 'Shop Home',
    href: '/categories/home-living',
    overlay: 'from-emerald-900/75 via-emerald-900/50 to-emerald-900/25',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-beauty',
    title: 'Beauty & Wellness',
    subtitle: 'Premium skincare, makeup & self-care essentials',
    cta: 'Explore Beauty',
    href: '/categories/beauty-health',
    overlay: 'from-rose-900/70 via-rose-900/45 to-rose-900/20',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&h=700&fit=crop&q=80',
  },
  {
    id: 'default-free-delivery',
    title: 'Free Delivery Week',
    subtitle: 'Free shipping on all orders over ৳1,000',
    cta: 'Shop All',
    href: '/products',
    overlay: 'from-orange-900/70 via-orange-900/45 to-orange-900/20',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&h=700&fit=crop&q=80',
  },
];

/**
 * Normalise the Banner model rows coming from GET /banners?position=HERO
 * into the HeroSlide shape the carousel renders. Skips rows without an
 * image. Falls back to a sensible dark overlay since the Banner model
 * doesn't currently carry an overlay gradient.
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
      overlay: 'from-black/70 via-black/45 to-black/20',
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
  const { addItem } = useCart();
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
      addItem({ productId: product.id, quantity: 1 });
    },
    [addItem],
  );

  // Get top-level categories with product counts
  const topCategories = categories.slice(0, 8);

  // ── Render helpers ──

  function renderProductCard(product: Product) {
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ─── Hero bento: carousel + promo tiles ──────────────────────── */}
      <section className="site-container px-4 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {/* Carousel tile */}
          <div className="relative h-[380px] overflow-hidden rounded-[2rem] bg-ink shadow-bento sm:h-[440px] sm:rounded-[2.5rem] lg:col-span-8 lg:h-[520px]">
            {/* Slide images — all stacked, opacity controls visibility */}
            {heroSlides.map((slide, i) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  i === heroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                aria-hidden={i !== heroIndex}
              >
                {/* Background image with zoom on active */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                    i === heroIndex ? 'scale-110' : 'scale-100'
                  }`}
                />

                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${slide.overlay}`} />

                {/* Content */}
                <div className="relative flex h-full items-end px-6 pb-16 sm:items-center sm:px-10 sm:pb-0 lg:px-14">
                  <div className="max-w-xl">
                    <span
                      className={`mb-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-all duration-700 delay-200 ${
                        i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" strokeWidth={2.5} /> Limited Time Offer
                    </span>
                    <h1
                      className={`mb-3 text-3xl font-black leading-[1.05] tracking-tighter text-white sm:mb-4 sm:text-5xl lg:text-6xl transition-all duration-700 delay-300 ${
                        i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                      }`}
                    >
                      {slide.title}
                    </h1>
                    <p
                      className={`mb-6 text-sm font-bold text-white/80 sm:mb-8 sm:text-lg transition-all duration-700 delay-[400ms] ${
                        i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                      }`}
                    >
                      {slide.subtitle}
                    </p>
                    <Link
                      href={slide.href}
                      tabIndex={i === heroIndex ? undefined : -1}
                      className={`inline-flex items-center gap-2 rounded-2xl bg-card px-6 py-3 text-sm font-black text-gray-900 shadow-xl shadow-black/10 transition-all duration-700 delay-500 hover:scale-[1.03] active:scale-95 sm:px-7 sm:py-3.5 ${
                        i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                      }`}
                    >
                      {slide.cta}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Carousel controls */}
            <div className="absolute bottom-5 right-5 z-20 flex gap-2 sm:bottom-8 sm:right-8">
              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
                aria-label="Previous slide"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
                aria-label="Next slide"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-gray-900 shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-9 left-6 z-20 flex gap-1.5 sm:bottom-12 sm:left-10 lg:left-14">
              {heroSlides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === heroIndex}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i === heroIndex ? 'w-8 bg-card' : 'w-2 bg-white/40 hover:bg-card/60'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Promo tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-2">
            <Link
              href="/categories/electronics"
              className="bento-primary group flex min-h-[220px] flex-col justify-between p-7 transition-transform duration-300 hover:scale-[1.01] sm:p-8"
            >
              <BentoGlow />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <Zap className="h-6 w-6" strokeWidth={2.25} />
                </div>
                <span className="rounded-xl bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                  Up to 50% off
                </span>
              </div>
              <div className="relative z-10">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                  Limited time
                </p>
                <h3 className="mb-2 text-2xl font-black leading-tight tracking-tight">
                  Flash Sale
                </h3>
                <p className="mb-5 text-sm font-bold text-white/80">
                  Up to 50% off on electronics — limited time!
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-card px-5 py-2 text-xs font-black text-primary transition-transform group-hover:scale-105">
                  View Deals <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </div>
            </Link>

            <Link
              href="/categories/fashion"
              className="bento-dark group flex min-h-[220px] flex-col justify-between rounded-[2rem] p-7 transition-transform duration-300 hover:scale-[1.01] sm:p-8"
            >
              <BentoGlow variant="dark" />
              <div className="relative z-10 flex items-center gap-3 text-white/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                  <Sparkles className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Collection</span>
              </div>
              <div className="relative z-10">
                <h3 className="mb-2 text-2xl font-black leading-none tracking-tighter sm:text-3xl">
                  Traditional Wear
                </h3>
                <p className="mb-5 text-sm font-bold text-white/60">
                  Authentic Bangladeshi clothing for every occasion
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-black text-white shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                  Shop Now <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* ─── Trust tiles ────────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="bento-card bento-card-hover group flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            >
              <IconTile
                icon={item.icon}
                tone={item.tone}
                size="sm"
                className="group-hover:scale-110"
              />
              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight text-gray-900">{item.title}</p>
                <p className="text-[11px] font-bold text-gray-500">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Sidebar promo banners (SIDEBAR position) ────────────────── */}
      {sidebarBanners.length > 0 && (
        <section className="site-container px-4 pt-4 sm:pt-6">
          <div
            className={`grid gap-4 sm:gap-6 ${
              sidebarBanners.length === 1
                ? 'grid-cols-1'
                : sidebarBanners.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {sidebarBanners.slice(0, 6).map((b) => {
              const card = (
                <div className="group relative overflow-hidden rounded-[2rem] border border-foreground/[0.04] shadow-bento transition-all duration-300 hover:shadow-bento-hover">
                  <img
                    src={b.image}
                    alt={b.title}
                    className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-52"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-5 left-6 right-6 text-white">
                    <h3 className="text-xl font-black tracking-tight drop-shadow">{b.title}</h3>
                    {b.subtitle && (
                      <p className="mt-0.5 text-sm font-bold text-white/80 drop-shadow">
                        {b.subtitle}
                      </p>
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
      <section className="site-container px-4 pt-4 sm:pt-6">
        <div className="bento-card p-6 sm:p-8">
          <SectionHeader
            as="h2"
            title="Shop by Categories"
            caption="Browse our wide range of product categories"
            action={
              <Link href="/categories" className="btn btn-soft btn-sm">
                View All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-8">
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
                  className="group flex flex-col items-center rounded-[1.5rem] border border-foreground/[0.03] bg-gray-50 px-3 py-5 text-center transition-all duration-300 hover:bg-card hover:shadow-bento-hover"
                >
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm transition-transform duration-500 group-hover:scale-110">
                    {CATEGORY_ICONS[cat.slug] || '📦'}
                  </span>
                  <h3 className="w-full truncate text-sm font-black tracking-tight text-gray-900 transition-colors group-hover:text-primary">
                    {cat.name}
                  </h3>
                  {productCount > 0 && (
                    <span className="eyebrow mt-1">{productCount} products</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Featured Products ───────────────────────────────────────── */}
      <section className="site-container px-4 pt-4 sm:pt-6">
        <div className="rounded-[2rem] border border-foreground/[0.04] bg-card p-5 shadow-bento sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            as="h2"
            icon={Zap}
            title="Featured Products"
            caption="Hand-picked top products just for you"
            action={
              <Link
                href="/products?isFeatured=true"
                className="btn btn-soft btn-sm hidden sm:inline-flex"
              >
                View All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            }
          />

          <ProductGrid>
            {loading ? renderProductSkeleton() : featuredProducts.map(renderProductCard)}
          </ProductGrid>

          {!loading && featuredProducts.length === 0 && (
            <EmptyState bare icon={Zap} title="No featured products available." />
          )}

          <Link
            href="/products?isFeatured=true"
            className="btn btn-soft btn-sm mt-6 w-full sm:hidden"
          >
            View All Featured <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      {/* ─── New Arrivals ────────────────────────────────────────────── */}
      <section className="site-container px-4 pt-4 sm:pt-6">
        <div className="rounded-[2rem] border border-foreground/[0.04] bg-card p-5 shadow-bento sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            as="h2"
            icon={TrendingUp}
            title="New Arrivals"
            caption="The latest additions to our store"
            action={
              <Link
                href="/products?sortBy=createdAt&sortOrder=desc"
                className="btn btn-soft btn-sm hidden sm:inline-flex"
              >
                View All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            }
          />

          <ProductGrid>
            {loading ? renderProductSkeleton() : newArrivals.map(renderProductCard)}
          </ProductGrid>
        </div>
      </section>
    </div>
  );
}

const TRUST_ITEMS: { title: string; caption: string; icon: LucideIcon; tone: BentoTone }[] = [
  { title: 'Free Delivery', caption: 'On orders over ৳2,000', icon: Truck, tone: 'brand' },
  { title: 'Secure Payment', caption: 'bKash, Nagad, Cards', icon: Shield, tone: 'blue' },
  { title: 'Easy Returns', caption: '7-day return policy', icon: RotateCcw, tone: 'amber' },
  {
    title: 'Made in Bangladesh',
    caption: 'Supporting local businesses',
    icon: Sparkles,
    tone: 'emerald',
  },
];
