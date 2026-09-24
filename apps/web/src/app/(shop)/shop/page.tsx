'use client';

import { ChevronRight, PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { EmptyState, PageHeader } from '@/components/ui/bento';
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
    <div className="site-container px-4 py-6 sm:py-8">
      <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
        <Link href="/" className="transition-colors hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">All Products</span>
      </nav>

      <PageHeader
        title="All Products"
        description={
          pagination
            ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
            : undefined
        }
        actions={
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort products"
            className="field-input w-auto cursor-pointer py-2.5 pr-9 text-xs font-bold"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
      />

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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-soft btn-sm"
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
                className={`h-10 min-w-[40px] rounded-xl px-3 text-xs font-black tabular-nums transition-all ${
                  pageNum === page
                    ? 'bg-ink text-white shadow-lg shadow-black/10'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="btn btn-dark btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
