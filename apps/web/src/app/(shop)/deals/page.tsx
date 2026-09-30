'use client';

import { Flame, Percent, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { Breadcrumbs, EmptyState } from '@/components/ui/bento';
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
  const cap = defaultVariant
    ? defaultVariant.compareAtPrice
      ? Number(defaultVariant.compareAtPrice)
      : null
    : raw.compareAtPrice
      ? Number(raw.compareAtPrice)
      : null;

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price,
    compareAtPrice: cap && cap > price ? cap : null,
    images: defaultVariantImage ? [defaultVariantImage, ...rawImages] : rawImages,
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw.totalReviews ?? raw._count?.reviews ?? 0,
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
    <div className="min-h-screen bg-background">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Deals' }]} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Promo banner + deal stats */}
        <div className="mb-8 flex flex-col gap-8 bg-gray-50 p-8 sm:mb-10 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Flame className="h-4 w-4" strokeWidth={2} />
              Limited time only
            </p>
            <h1 className="font-heading text-3xl font-semibold text-gray-900 sm:text-[2.5rem] sm:leading-tight">
              Hot Deals & Offers
            </h1>
            <p className="mt-3 max-w-lg text-sm text-gray-600 sm:text-base">
              Grab the best discounts on top products — limited time only!
            </p>
          </div>
          <dl className="flex shrink-0 gap-8">
            <div className="border-l-2 border-primary pl-4">
              <dd className="font-heading text-2xl font-semibold tabular-nums text-gray-900">
                {loading ? '—' : products.length}
              </dd>
              <dt className="flex items-center gap-1.5 text-sm text-gray-500">
                <Tag className="h-3.5 w-3.5" strokeWidth={2} />
                Live deals
              </dt>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <dd className="font-heading text-2xl font-semibold tabular-nums text-gray-900">
                {loading ? '—' : `${biggestDiscount}%`}
              </dd>
              <dt className="flex items-center gap-1.5 text-sm text-gray-500">
                <Percent className="h-3.5 w-3.5" strokeWidth={2} />
                Max savings
              </dt>
            </div>
          </dl>
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
    </div>
  );
}
