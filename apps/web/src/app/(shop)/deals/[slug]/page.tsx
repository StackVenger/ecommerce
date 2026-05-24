'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    ? (defaultVariant.compareAtPrice ? Number(defaultVariant.compareAtPrice) : null)
    : (raw.compareAtPrice ? Number(raw.compareAtPrice) : null);

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

  return (
    <div className="site-container px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/deals" className="hover:text-gray-700">
          Deals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{title}</span>
      </nav>

      <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-900 p-8 text-white">
        <h1 className="text-3xl font-bold">{title} Deals</h1>
        <p className="mt-2 text-blue-100">
          Special offers on {title.toLowerCase()} — grab them before they&apos;re gone!
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">No deals in {title} right now.</p>
          <Link href="/deals" className="mt-4 inline-block text-sm text-primary hover:underline">
            View all deals
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                {product.compareAtPrice && (
                  <span className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {Math.round(
                      ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
                    )}
                    % OFF
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
                <div className="mt-2 flex items-center gap-2">
                  {product.compareAtPrice ? (
                    <>
                      <span className="text-sm font-bold text-red-600">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
