'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { EmptyState } from '@/components/ui/bento';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
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
  stock: number;
  defaultVariantId?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
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
  const stock = defaultVariant ? (defaultVariant.quantity ?? 0) : (raw.quantity ?? 0);
  const defaultVariantId = defaultVariant ? defaultVariant.id : undefined;

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
    stock,
    defaultVariantId,
  };
}

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Most Relevant' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'averageRating:desc', label: 'Highest Rated' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { cart, addItem, isUpdating } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [loading, setLoading] = useState(false);
  const { wishlist, toggleWishlist } = useWishlist();

  const fetchResults = useCallback(async () => {
    if (!q) {
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('search', q);
      params.set('page', String(page));
      params.set('limit', '24');
      const [sortField, sortOrder] = sortBy.split(':');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      const { data } = await apiClient.get(`/products?${params}`);
      const rawList = data.data?.products ?? data.data ?? [];
      setProducts(rawList.map(normalizeProduct));

      const meta = data.meta ?? data.data?.pagination ?? data.pagination;
      if (meta) {
        setPagination({
          total: meta.total ?? 0,
          page: meta.page ?? 1,
          limit: meta.limit ?? 24,
          pages: meta.totalPages ?? meta.pages ?? 1,
        });
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [q, page, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      return;
    }
    addItem(
      {
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity: 1,
      },
      { openDrawer: false },
    );
  };

  if (!q) {
    return (
      <div className="site-container px-4 py-10 sm:py-16">
        <EmptyState
          icon={Search}
          title={<span className="text-2xl">Search Products</span>}
          description="Enter a search term in the search bar above to find products."
          action={
            <Link href="/products" className="btn btn-primary">
              Browse All Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="site-container px-4 py-6 sm:py-8">
        <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900">Search</span>
        </nav>

        {/* Header */}
        <div className="bento-card mb-6 flex flex-col gap-4 p-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Search className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="eyebrow mb-1">Search results</p>
              <h1 className="truncate text-2xl font-black tracking-tighter text-gray-900 sm:text-3xl">
                &ldquo;{q}&rdquo;
              </h1>
              {pagination && (
                <p className="mt-0.5 text-sm font-bold text-gray-500">
                  {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort results"
            className="field-input w-full cursor-pointer py-2.5 pr-9 text-xs font-bold sm:w-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <ProductGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title={<>No products found for &ldquo;{q}&rdquo;</>}
            description="Try different keywords or browse our categories."
            action={
              <Link href="/products" className="btn btn-primary">
                Browse All Products
              </Link>
            }
          />
        ) : (
          <ProductGrid>
            {products.map((product) => {
              const isAlreadyInCart = cart?.items?.some((item) => item.productId === product.id);
              const hasDiscount = product.compareAtPrice !== null;
              const discountPercent = hasDiscount
                ? Math.round(
                    ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100,
                  )
                : 0;

              return (
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
                  badges={hasDiscount ? [{ label: `-${discountPercent}%`, tone: 'sale' }] : []}
                  inCart={isAlreadyInCart}
                  outOfStock={product.stock <= 0}
                  onAddToCart={(e) => handleQuickAdd(e, product)}
                  addDisabled={isUpdating}
                  wishlisted={wishlist.has(product.id)}
                  onToggleWishlist={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                />
              );
            })}
          </ProductGrid>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-soft btn-sm"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(7, pagination.pages) }).map((_, i) => {
              let pageNum: number;
              if (pagination.pages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= pagination.pages - 3) {
                pageNum = pagination.pages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
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
    </div>
  );
}
