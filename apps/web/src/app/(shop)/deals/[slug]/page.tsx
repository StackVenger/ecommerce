'use client';

import { ChevronRight, Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { BentoGlow, EmptyState } from '@/components/ui/bento';
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
    <div className="site-container px-4 py-6 sm:py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-400">
        <Link href="/" className="transition-colors hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/deals" className="transition-colors hover:text-gray-900">
          Deals
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">{title}</span>
      </nav>

      <div className="bento-dark mb-6 rounded-[2rem] p-8 sm:mb-8 sm:p-10">
        <BentoGlow variant="dark" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3 text-white/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <Tag className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Category deals</span>
          </div>
          <h1 className="text-3xl font-black leading-none tracking-tighter sm:text-4xl">
            {title} Deals
          </h1>
          <p className="mt-3 text-sm font-bold text-white/60">
            Special offers on {title.toLowerCase()} — grab them before they&apos;re gone!
          </p>
        </div>
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
  );
}
