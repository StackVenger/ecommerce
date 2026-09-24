'use client';

import { ChevronRight, Flame, Percent, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { BentoGlow, EmptyState, StatCard } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  averageRating: number;
  reviewCount: number;
  categoryName: string | null;
  brandName: string | null;
}

function normalizeProduct(raw: any): Product {
  const price = Number(raw.price);
  const cap = raw.compareAtPrice ? Number(raw.compareAtPrice) : null;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price,
    compareAtPrice: cap && cap > price ? cap : null,
    images: Array.isArray(raw.images)
      ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
      : [],
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw._count?.reviews ?? raw.totalReviews ?? 0,
    categoryName: raw.category?.name ?? null,
    brandName: raw.brand?.name ?? null,
  };
}

export default function DealsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/products?limit=60&sortBy=price&sortOrder=asc')
      .then(({ data }) => {
        const rawList = data.data?.products ?? data.data ?? [];
        const normalized = rawList.map(normalizeProduct);
        setProducts(normalized.filter((p) => p.compareAtPrice !== null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  const dealPercent = (product: Product) =>
    product.compareAtPrice
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
  const biggestDiscount = products.reduce((max, p) => Math.max(max, dealPercent(p)), 0);

  return (
    <div className="site-container px-4 py-6 sm:py-8">
      <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
        <Link href="/" className="transition-colors hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">Deals</span>
      </nav>

      {/* Bento hero: coral banner + deal stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-12">
        <div className="bento-primary col-span-2 flex flex-col justify-between p-8 sm:p-10 lg:col-span-8">
          <BentoGlow />
          <div className="relative z-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Flame className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
              Limited time only
            </p>
            <h1 className="text-3xl font-black leading-none tracking-tighter sm:text-5xl">
              Hot Deals & Offers
            </h1>
            <p className="mt-3 max-w-lg text-sm font-bold text-white/80 sm:text-base">
              Grab the best discounts on top products — limited time only!
            </p>
          </div>
        </div>
        <StatCard
          className="lg:col-span-2"
          icon={Tag}
          tone="rose"
          label="Live deals"
          value={loading ? '—' : products.length}
          loading={loading}
        />
        <StatCard
          className="lg:col-span-2"
          icon={Percent}
          tone="emerald"
          label="Max savings"
          value={loading ? '—' : `${biggestDiscount}%`}
          loading={loading}
        />
      </div>

      {loading ? (
        <ProductGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No deals available right now."
          description="Check back soon for exciting offers!"
          action={
            <Link href="/shop" className="btn btn-primary">
              Browse all products
            </Link>
          }
        />
      ) : (
        <ProductGrid>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              href={`/products/${product.slug}`}
              name={product.name}
              image={product.images?.[0]}
              brand={product.brandName}
              rating={product.reviewCount > 0 ? product.averageRating : null}
              reviewCount={product.reviewCount}
              price={product.price}
              originalPrice={product.compareAtPrice}
              formatPrice={formatPrice}
              badges={
                product.compareAtPrice
                  ? [{ label: `${dealPercent(product)}% OFF`, tone: 'sale' }]
                  : []
              }
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
