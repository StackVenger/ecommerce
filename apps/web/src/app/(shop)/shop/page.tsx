'use client';

import { PackageSearch } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { Breadcrumbs, EmptyState, ShopSectionHeading } from '@/components/ui/bento';
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

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '24');
      params.set('sortBy', sortBy);
      const { data } = await apiClient.get(`/products?${params}`);
      setProducts(data.data?.products ?? data.data ?? []);
      setPagination(data.data?.pagination ?? data.pagination ?? null);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'All Products' }]} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ShopSectionHeading as="h1" title="All Products" className="mb-6" />

        {/* Toolbar */}
        <div className="mb-7 flex items-center justify-between gap-3 border border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="truncate text-[13px] text-gray-500">
            {pagination
              ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
              : null}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[13px] text-gray-700 sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              aria-label="Sort products"
              className="h-9 cursor-pointer border-0 bg-gray-100 px-3 pr-8 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <ProductGrid>
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products available yet."
            description="Check back soon for new arrivals!"
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

        {pagination && pagination.pages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5 border border-gray-200 px-3 py-3 sm:justify-start sm:px-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 min-w-[36px] items-center justify-center border border-gray-200 bg-card px-2.5 text-sm tabular-nums text-gray-700 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-700"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  aria-current={pageNum === page ? 'page' : undefined}
                  className={`flex h-9 min-w-[36px] items-center justify-center border border-gray-200 bg-card px-2.5 text-sm tabular-nums text-gray-700 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-700 ${
                    pageNum === page ? 'border-primary bg-primary text-white hover:text-white' : ''
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="flex h-9 min-w-[36px] items-center justify-center border border-gray-200 bg-card px-2.5 text-sm tabular-nums text-gray-700 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
