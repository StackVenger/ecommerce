'use client';

import { Layers } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 bg-gray-50 p-8 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:p-10">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Layers className="h-4 w-4" strokeWidth={2} />
              Collection
            </p>
            <h1 className="font-heading text-3xl font-semibold text-gray-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              Explore our curated {title.toLowerCase()} collection
            </p>
          </div>
          {!loading && products.length > 0 && (
            <div className="shrink-0 border-l-2 border-primary pl-4">
              <p className="font-heading text-2xl font-semibold tabular-nums text-gray-900">
                {products.length}
              </p>
              <p className="text-sm text-gray-500">Products</p>
            </div>
          )}
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
    </div>
  );
}
