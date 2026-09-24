'use client';

import { ChevronRight, Layers } from 'lucide-react';
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
  salePrice: number | null;
  images: string[];
  averageRating: number;
  reviewCount: number;
  categoryName: string | null;
  brandName: string | null;
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  useEffect(() => {
    // Server has no Collection model — use the slug as a product tag,
    // which the products list endpoint does support.
    apiClient
      .get(`/products?tag=${encodeURIComponent(slug)}&limit=30`)
      .then(({ data }) => {
        const items: Product[] = data.data?.products ?? data.data ?? [];
        setProducts(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  return (
    <div className="site-container px-4 py-6 sm:py-8">
      <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
        <Link href="/" className="transition-colors hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">{title}</span>
      </nav>

      <div className="bento-dark mb-6 rounded-[2rem] p-8 sm:mb-8 sm:p-10">
        <BentoGlow variant="dark" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3 text-white/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Layers className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Collection</span>
            </div>
            <h1 className="text-3xl font-black leading-none tracking-tighter sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-bold text-white/60">
              Explore our curated {title.toLowerCase()} collection
            </p>
          </div>
          {!loading && products.length > 0 && (
            <div className="shrink-0 rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur-md">
              <p className="text-2xl font-black tabular-nums tracking-tighter">{products.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Products
              </p>
            </div>
          )}
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
          icon={Layers}
          title="This collection is coming soon."
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
              price={product.salePrice ?? product.price}
              originalPrice={product.salePrice ? product.price : null}
              formatPrice={formatPrice}
              badges={
                product.salePrice
                  ? [
                      {
                        label: `${Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF`,
                        tone: 'sale',
                      },
                    ]
                  : []
              }
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
