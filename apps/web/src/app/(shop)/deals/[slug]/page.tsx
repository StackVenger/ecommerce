'use client';

import { Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

export default function DealsCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  useEffect(() => {
    apiClient
      .get(`/products?limit=30&categorySlug=${slug}`)
      .then(({ data }) => {
        const rawList = data.data?.products ?? data.data ?? [];
        const normalized = rawList.map(normalizeProduct);
        setProducts(normalized.filter((p) => p.compareAtPrice !== null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  const dealPercent = (product: Product) =>
    product.compareAtPrice
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Deals', href: '/deals' }, { label: title }]}
      />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 bg-gray-50 p-8 sm:mb-10 sm:p-10">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Tag className="h-4 w-4" strokeWidth={2} />
            Category deals
          </p>
          <h1 className="font-heading text-3xl font-semibold text-gray-900 sm:text-4xl">
            {title} Deals
          </h1>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            Special offers on {title.toLowerCase()} — grab them before they&apos;re gone!
          </p>
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
            title={`No deals in ${title} right now.`}
            action={
              <Link href="/deals" className="btn btn-primary">
                View all deals
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
