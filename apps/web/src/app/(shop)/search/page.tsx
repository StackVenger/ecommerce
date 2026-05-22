'use client';

import { Heart, Search, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
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
    stock: raw.quantity ?? 0,
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
  const { addItem, isUpdating } = useCart();

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
    addItem({ productId: product.id, quantity: 1 }, { openDrawer: false });
  };

  if (!q) {
    return (
      <div className="site-container px-4 py-20 text-center">
        <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Search Products</h1>
        <p className="mt-2 text-gray-500">
          Enter a search term in the search bar above to find products.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="site-container px-4 py-6">
          <nav className="mb-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900">Search</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Results for &ldquo;{q}&rdquo;</h1>
              {pagination && (
                <p className="mt-1 text-sm text-gray-500">
                  {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border-gray-300 text-sm shadow-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="site-container px-4 py-8">
        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-xl font-medium text-gray-500">
              No products found for &ldquo;{q}&rdquo;
            </p>
            <p className="mt-2 text-gray-400">Try different keywords or browse our categories.</p>
            <Link
              href="/products"
              className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const hasDiscount = product.compareAtPrice !== null;
              const discountPercent = hasDiscount
                ? Math.round(
                    ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100,
                  )
                : 0;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group relative flex flex-col rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
                >
                  <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}

                    {hasDiscount && (
                      <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                        -{discountPercent}%
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(product.id);
                      }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 opacity-0 backdrop-blur-sm shadow-sm transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:scale-110"
                    >
                      <Heart
                        className={`h-4 w-4 ${wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                      />
                    </button>

                    {product.stock <= 0 && (
                      <div className="absolute inset-x-0 bottom-0 bg-gray-900/80 py-2.5 text-center text-sm font-medium text-white backdrop-blur-sm">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    {product.brandName && (
                      <p className="text-xs font-medium text-primary">{product.brandName}</p>
                    )}
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary">
                      {product.name}
                    </h3>

                    {product.reviewCount > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${s <= Math.round(product.averageRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                      </div>
                    )}

                    <div className="mt-auto pt-2">
                      {hasDiscount ? (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-primary">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.compareAtPrice!)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart */}
                    {product.stock > 0 ? (
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        disabled={isUpdating}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to Cart
                      </button>
                    ) : (
                      <p className="mt-2 text-center text-xs font-medium text-red-500">
                        Out of Stock
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
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
                  className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-primary text-white'
                      : 'border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
