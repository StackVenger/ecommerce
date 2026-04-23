'use client';

import {
  ShoppingCart,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

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
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: Number(raw.price),
    compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : undefined,
    images: Array.isArray(raw.images)
      ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
      : [],
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function fetchData() {
      try {
        const [featuredRes, newRes, catRes, heroRes] = await Promise.all([
          apiClient.get('/products', {
            params: { limit: 8, sortBy: 'viewCount', sortOrder: 'desc', isFeatured: true },
          }),
          apiClient.get('/products', {
            params: { limit: 8, sortBy: 'createdAt', sortOrder: 'desc' },
          }),
          apiClient.get('/categories'),
          apiClient.get('/banners', { params: { position: 'HERO' } }).catch(() => null),
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

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3 w-3 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  }

  function renderProductCard(product: Product) {
    const discount = discountPercent(product.price, product.compareAtPrice);
    const imgUrl = product.images[0];

    return (
      <div
        key={product.id}
        className="group relative rounded-xl border bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      >
        {/* Image */}
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <ShoppingCart className="h-12 w-12" />
              </div>
            )}

            {/* Badges */}
            {discount > 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                -{discount}%
              </span>
            )}
          </div>
        </Link>

        {/* Wishlist */}
        <button
          onClick={() => toggleWishlist(product.id)}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 opacity-0 shadow backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 ${wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>

        {/* Info */}
        <div className="p-3">
          {product.brandName && (
            <p className="mb-0.5 text-xs font-medium text-primary">{product.brandName}</p>
          )}
          <Link href={`/products/${product.slug}`}>
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1 flex items-center gap-1.5">
            {renderStars(product.averageRating)}
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">{formatBDT(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatBDT(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Quick add */}
          {product.stock > 0 ? (
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-primary/90"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          ) : (
            <p className="mt-2 text-center text-xs font-medium text-red-500">Out of Stock</p>
          )}
        </div>
      </div>
    );
  }

  // ── Skeleton loaders ──
  function renderProductSkeleton() {
    return Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border bg-white">
        <div className="aspect-square rounded-t-xl bg-gray-200" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-5 w-20 rounded bg-gray-200" />
        </div>
      </div>
    ));
  }

  return (
    <div className="min-h-screen">
      {/* ─── Hero Carousel ───────────────────────────────────────────── */}
      <section className="relative h-[420px] overflow-hidden sm:h-[480px] md:h-[540px] lg:h-[600px]">
        {/* Slide images — all stacked, opacity controls visibility */}
        {heroSlides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === heroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
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
            <div className="relative flex h-full items-center">
              <div className="mx-auto w-full max-w-7xl px-4">
                <div className="max-w-xl">
                  <span
                    className={`mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all duration-700 delay-200 ${
                      i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> Limited Time Offer
                  </span>
                  <h1
                    className={`mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl transition-all duration-700 delay-300 ${
                      i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    {slide.title}
                  </h1>
                  <p
                    className={`mb-8 text-lg text-white/85 md:text-xl transition-all duration-700 delay-[400ms] ${
                      i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    {slide.subtitle}
                  </p>
                  <Link
                    href={slide.href}
                    className={`inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-semibold text-gray-900 shadow-lg transition-all duration-700 delay-500 hover:scale-105 hover:shadow-xl ${
                      i === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    {slide.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel controls */}
        <button
          onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/25 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-black/40 hover:scale-110"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/25 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-black/40 hover:scale-110"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroSlides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setHeroIndex(i)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                i === heroIndex ? 'w-10 bg-white shadow-lg' : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ─── Shop by Category ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Shop by Category</h2>
          <p className="mt-2 text-gray-500">Browse our wide range of product categories</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
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
                className="group flex items-center gap-4 rounded-xl border bg-white p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-2xl transition-colors group-hover:bg-teal-100">
                  {CATEGORY_ICONS[cat.slug] || '📦'}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 group-hover:text-primary truncate">
                    {cat.name}
                  </h3>
                  {productCount > 0 && (
                    <span className="text-xs text-gray-500">{productCount} products</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Featured Products ───────────────────────────────────────── */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Featured Products</h2>
              </div>
              <p className="mt-1 text-gray-500">Hand-picked top products just for you</p>
            </div>
            <Link
              href="/products?isFeatured=true"
              className="hidden items-center gap-1 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-teal-50 sm:inline-flex"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {loading ? renderProductSkeleton() : featuredProducts.map(renderProductCard)}
          </div>

          {!loading && featuredProducts.length === 0 && (
            <p className="py-12 text-center text-gray-400">No featured products available.</p>
          )}

          <Link
            href="/products?isFeatured=true"
            className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-primary sm:hidden"
          >
            View All Featured <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Promo Banners ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/categories/fashion"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 p-8 text-white transition-transform hover:scale-[1.02]"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative">
              <h3 className="text-2xl font-bold">Traditional Wear</h3>
              <p className="mt-2 text-teal-100">
                Authentic Bangladeshi clothing for every occasion
              </p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-5 py-2 text-sm font-medium text-primary transition-transform group-hover:scale-105">
                Shop Now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
          <Link
            href="/categories/electronics"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-8 text-white transition-transform hover:scale-[1.02]"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative">
              <h3 className="text-2xl font-bold">Flash Sale</h3>
              <p className="mt-2 text-orange-100">Up to 50% off on electronics — limited time!</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-5 py-2 text-sm font-medium text-red-600 transition-transform group-hover:scale-105">
                View Deals <Zap className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── New Arrivals ────────────────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">New Arrivals</h2>
              </div>
              <p className="mt-1 text-gray-500">The latest additions to our store</p>
            </div>
            <Link
              href="/products?sortBy=createdAt&sortOrder=desc"
              className="hidden items-center gap-1 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-teal-50 sm:inline-flex"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {loading ? renderProductSkeleton() : newArrivals.map(renderProductCard)}
          </div>
        </div>
      </section>

      {/* ─── Trust Badges ────────────────────────────────────────────── */}
      <section className="border-t bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-primary">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Free Delivery</p>
                <p className="text-xs text-gray-500">On orders over ৳2,000</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Secure Payment</p>
                <p className="text-xs text-gray-500">bKash, Nagad, Cards</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Easy Returns</p>
                <p className="text-xs text-gray-500">7-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Made in Bangladesh</p>
                <p className="text-xs text-gray-500">Supporting local businesses</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
