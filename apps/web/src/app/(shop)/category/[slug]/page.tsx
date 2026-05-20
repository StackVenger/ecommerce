'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { RichText } from '@/components/ui/rich-text';
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

interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

interface Facets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  priceRange: { min: number; max: number };
  priceRanges: FacetBucket[];
  ratings: FacetBucket[];
  availability: { inStock: number; outOfStock: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch category info
  useEffect(() => {
    apiClient
      .get(`/categories/slug/${slug}`)
      .then(({ data }: { data: { data: Category } }) => setCategory(data.data))
      .catch(() => {
        /* ignore */
      });
  }, [slug]);

  // Fetch facets
  useEffect(() => {
    if (!category) {
      return;
    }
    apiClient
      .get(`/products/facets?categoryId=${category.id}`)
      .then(({ data }: { data: { data: Facets } }) => setFacets(data.data))
      .catch(() => {
        /* ignore */
      });
  }, [category]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!category) {
      return;
    }
    setLoading(true);

    const params = new URLSearchParams();
    params.set('q', '');
    params.set('categoryId', category.id);
    params.set('page', String(page));
    params.set('limit', '20');
    params.set('sortBy', sortBy);
    if (selectedBrands.length === 1 && selectedBrands[0]) {
      params.set('brandId', selectedBrands[0]);
    }
    if (minPrice) {
      params.set('minPrice', minPrice);
    }
    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    }
    if (inStock) {
      params.set('inStock', 'true');
    }

    try {
      const { data } = await apiClient.get(`/search?${params.toString()}`);
      setProducts(
        (data as { data: { products: Product[]; pagination: Pagination } }).data.products,
      );
      setPagination(
        (data as { data: { products: Product[]; pagination: Pagination } }).data.pagination,
      );
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [category, page, sortBy, selectedBrands, minPrice, maxPrice, inStock]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId],
    );
    setPage(1);
  };

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  return (
    <div className="site-container px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category?.name ?? slug}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{category?.name ?? 'Category'}</h1>
        {category?.description && (
          <RichText html={category.description} className="mt-1 text-sm text-gray-500" />
        )}
        {pagination && <p className="mt-1 text-sm text-gray-400">{pagination.total} products</p>}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`w-64 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          {/* Brands */}
          {facets && facets.brands.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Brand</h3>
              <div className="space-y-1">
                {facets.brands.map((brand) => (
                  <label key={brand.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.value)}
                      onChange={() => toggleBrand(brand.value)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{brand.label}</span>
                    <span className="ml-auto text-xs text-gray-400">({brand.count})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Price (৳)</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Min"
                className="w-full rounded-md border-gray-300 text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Max"
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            {facets && (
              <p className="mt-1 text-xs text-gray-400">
                Range: {formatPrice(facets.priceRange.min)} - {formatPrice(facets.priceRange.max)}
              </p>
            )}
          </div>

          {/* Rating */}
          {facets && facets.ratings.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Rating</h3>
              <div className="space-y-1">
                {[4, 3, 2, 1].map((r) => (
                  <label key={r} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === r}
                      onChange={() => {
                        setMinRating(r);
                        setPage(1);
                      }}
                      className="border-gray-300 text-blue-600"
                    />
                    <span className="flex text-sm text-yellow-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < r ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="text-xs text-gray-500">& Up</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => {
                  setInStock(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">In Stock Only</span>
              {facets && (
                <span className="ml-auto text-xs text-gray-400">
                  ({facets.availability.inStock})
                </span>
              )}
            </label>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSelectedBrands([]);
              setMinPrice('');
              setMaxPrice('');
              setMinRating(0);
              setInStock(false);
              setPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All Filters
          </button>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-md border px-3 py-1.5 text-sm lg:hidden"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-md border-gray-300 text-sm shadow-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">No products match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
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
                    {product.salePrice && (
                      <span className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
                        {Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                        OFF
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    {product.brandName && (
                      <p className="text-xs text-gray-500">{product.brandName}</p>
                    )}
                    <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-900">
                      {product.name}
                    </h3>

                    {product.reviewCount > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <div className="flex text-xs">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={
                                s <= Math.round(product.averageRating)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                      </div>
                    )}

                    <div className="mt-2">
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-600">
                            {formatPrice(product.salePrice)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        </div>
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

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      pageNum === page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
