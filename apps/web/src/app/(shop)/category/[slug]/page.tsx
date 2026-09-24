'use client';

import { ChevronRight, PackageSearch, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { EmptyState } from '@/components/ui/bento';
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
    <div className="site-container px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
        <Link href="/" className="transition-colors hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">{category?.name ?? slug}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">{category?.name ?? 'Category'}</h1>
        {category?.description && (
          <RichText
            html={category.description}
            className="mt-1 text-sm font-medium text-gray-500"
          />
        )}
        {pagination && <p className="page-subtitle mt-1">{pagination.total} products</p>}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Filters */}
        <aside
          className={`bento-card w-full shrink-0 space-y-7 self-start p-6 lg:w-64 ${
            showFilters ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Brands */}
          {facets && facets.brands.length > 0 && (
            <div>
              <h3 className="eyebrow mb-3">Brand</h3>
              <div className="space-y-2">
                {facets.brands.map((brand) => (
                  <label key={brand.value} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.value)}
                      onChange={() => toggleBrand(brand.value)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-bold text-gray-700">{brand.label}</span>
                    <span className="ml-auto text-[11px] font-bold tabular-nums text-gray-400">
                      {brand.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <h3 className="eyebrow mb-3">Price (৳)</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Min"
                aria-label="Minimum price"
                className="field-input px-3 py-2.5"
              />
              <span className="font-bold text-gray-300">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Max"
                aria-label="Maximum price"
                className="field-input px-3 py-2.5"
              />
            </div>
            {facets && (
              <p className="field-hint">
                Range: {formatPrice(facets.priceRange.min)} - {formatPrice(facets.priceRange.max)}
              </p>
            )}
          </div>

          {/* Rating */}
          {facets && facets.ratings.length > 0 && (
            <div>
              <h3 className="eyebrow mb-3">Rating</h3>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === r}
                      onChange={() => {
                        setMinRating(r);
                        setPage(1);
                      }}
                      className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="flex text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < r ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">& Up</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => {
                  setInStock(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-bold text-gray-700">In Stock Only</span>
              {facets && (
                <span className="ml-auto text-[11px] font-bold tabular-nums text-gray-400">
                  {facets.availability.inStock}
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
            className="btn btn-soft btn-sm w-full"
          >
            Clear All Filters
          </button>
        </aside>

        {/* Product Grid */}
        <div className="min-w-0 flex-1">
          {/* Sort Bar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-sm lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              aria-label="Sort products"
              className="field-input ml-auto w-auto cursor-pointer py-2.5 pr-9 text-xs font-bold"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <ProductGrid columns={3}>
              {Array.from({ length: 9 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </ProductGrid>
          ) : products.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No products match your filters." />
          ) : (
            <ProductGrid columns={3}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  href={`/product/${product.slug}`}
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

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
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
      </div>
    </div>
  );
}
