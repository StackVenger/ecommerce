'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Grid3X3,
  List,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ProductCard,
  ProductCardSkeleton,
  type ProductCardBadge,
} from '@/components/products/product-card';
import { BentoGlow, EmptyState, PageHeader } from '@/components/ui/bento';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { apiClient } from '@/lib/api/client';

// Normalized shape used by the UI
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  salePrice: number | null;
  images: string[];
  averageRating: number;
  reviewCount: number;
  categoryName: string | null;
  brandName: string | null;
  isFeatured?: boolean;
  shortDescription?: string;
  stock: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): Product {
  // When the product has a default variant with images, surface that
  // image as the cover so listing cards mirror the storefront PDP's
  // "default variant wins" rule. The API already filters `variants` to
  // just the default + active one when serving lists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultVariantImage: string | null = (() => {
    const v = Array.isArray(raw.variants) ? raw.variants[0] : null;
    const img = v?.images?.[0];
    if (!img) {
      return null;
    }
    return typeof img === 'string' ? img : (img.url ?? null);
  })();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
    : [];

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: Number(raw.price),
    compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : undefined,
    salePrice: raw.compareAtPrice ? Number(raw.price) : null,
    images: defaultVariantImage ? [defaultVariantImage, ...rawImages] : rawImages,
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw._count?.reviews ?? raw.totalReviews ?? 0,
    categoryName: raw.category?.name ?? raw.categoryName ?? null,
    brandName: raw.brand?.name ?? raw.brandName ?? null,
    isFeatured: raw.isFeatured ?? false,
    shortDescription: raw.shortDescription ?? null,
    stock: raw.quantity ?? 0,
  };
}

function normalizePagination(meta: any): Pagination | null {
  if (!meta) {
    return null;
  }
  return {
    total: meta.total ?? 0,
    page: meta.page ?? 1,
    limit: meta.limit ?? 20,
    pages: meta.totalPages ?? meta.pages ?? 1,
  };
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  _count?: { products: number };
  children?: CategoryOption[];
}

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'averageRating:desc', label: 'Top Rated' },
  { value: 'viewCount:desc', label: 'Most Popular' },
];

export default function ProductsPage() {
  const { addItem, isUpdating } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brands, setBrands] = useState<{ name: string; slug: string }[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { wishlist, toggleWishlist } = useWishlist();

  // Fetch categories and brands for filters
  useEffect(() => {
    apiClient
      .get('/categories?tree=true')
      .then(({ data }) => {
        setCategories(data.data ?? data ?? []);
      })
      .catch(() => {});

    // Fetch a large set to extract all unique brands
    apiClient
      .get('/products?limit=100&sortBy=name&sortOrder=asc')
      .then(({ data }) => {
        const rawList = data.data?.products ?? data.data ?? [];
        const brandMap = new Map<string, { name: string; slug: string }>();
        rawList.forEach((p: any) => {
          if (p.brand?.slug && p.brand?.name) {
            brandMap.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug });
          }
        });
        if (brandMap.size > 0) {
          setBrands(Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch featured products (only on first load)
  useEffect(() => {
    apiClient
      .get('/products?limit=4&sortBy=viewCount&sortOrder=desc&isFeatured=true')
      .then(({ data }) => {
        const raw = data.data?.products ?? data.data ?? [];
        setFeaturedProducts(raw.map(normalizeProduct));
      })
      .catch(() => {});
  }, []);

  const hasActiveFilters = selectedCategory || minPrice || maxPrice || selectedBrand;
  const activeFilterCount = [selectedCategory, minPrice, maxPrice, selectedBrand].filter(
    Boolean,
  ).length;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '24');
      const [sortField, sortOrder] = sortBy.split(':');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);
      if (selectedCategory) {
        params.set('categorySlug', selectedCategory);
      }
      if (minPrice) {
        params.set('priceMin', minPrice);
      }
      if (maxPrice) {
        params.set('priceMax', maxPrice);
      }
      if (selectedBrand) {
        params.set('brandSlug', selectedBrand);
      }
      const { data } = await apiClient.get(`/products?${params}`);
      const rawList = data.data?.products ?? data.data ?? [];
      const productList = rawList.map(normalizeProduct);
      setProducts(productList);
      setPagination(normalizePagination(data.meta ?? data.data?.pagination ?? data.pagination));

      // Extract unique brands from raw data (which has brand.slug)
      if (brands.length === 0) {
        const brandMap = new Map<string, { name: string; slug: string }>();
        rawList.forEach((p: any) => {
          if (p.brand?.slug && p.brand?.name) {
            brandMap.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug });
          }
        });
        if (brandMap.size > 0) {
          setBrands(Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, selectedCategory, minPrice, maxPrice, selectedBrand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedBrand('');
    setPage(1);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      return;
    }
    addItem({ productId: product.id, quantity: 1 });
  };

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  const showFeatured = page === 1 && !hasActiveFilters && featuredProducts.length > 0;

  // Pagination helpers
  const paginationRange = useMemo(() => {
    if (!pagination) {
      return [];
    }
    const { pages: totalPages } = pagination;
    const range: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      range.push(1);
      if (page > 3) {
        range.push('ellipsis');
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      if (page < totalPages - 2) {
        range.push('ellipsis');
      }
      range.push(totalPages);
    }

    return range;
  }, [pagination, page]);

  // Filter sidebar content (shared between desktop and mobile)
  const filterOptionClass = (active: boolean, sub = false) =>
    `flex w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-all ${
      sub ? 'py-1.5' : 'py-2'
    } ${
      active
        ? 'bg-brand-50 font-black text-brand-700'
        : sub
          ? 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          : 'font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const filterContent = (
    <div className="space-y-7">
      {/* Category filter */}
      <div>
        <h3 className="eyebrow mb-3">Category</h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => {
                setSelectedCategory('');
                setPage(1);
              }}
              className={filterOptionClass(!selectedCategory)}
            >
              All Categories
            </button>
          </li>
          {categories.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const catCount = cat.productCount ?? cat._count?.products ?? 0;
            const totalCount = hasChildren
              ? (cat.children ?? []).reduce(
                  (sum, ch) => sum + (ch.productCount ?? ch._count?.products ?? 0),
                  catCount,
                )
              : catCount;

            // Skip categories with no products at all
            if (totalCount === 0 && !hasChildren) {
              return null;
            }

            return (
              <li key={cat.id}>
                {/* Parent category */}
                <button
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    setPage(1);
                  }}
                  className={filterOptionClass(selectedCategory === cat.slug)}
                >
                  <span className="truncate">{cat.name}</span>
                  {totalCount > 0 && (
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-400">
                      {totalCount}
                    </span>
                  )}
                </button>

                {/* Subcategories */}
                {hasChildren && (
                  <ul className="my-1 ml-4 space-y-0.5 border-l border-foreground/[0.06] pl-2">
                    {cat.children!.map((sub) => {
                      const subCount = sub.productCount ?? sub._count?.products ?? 0;
                      if (subCount === 0) {
                        return null;
                      }
                      return (
                        <li key={sub.id}>
                          <button
                            onClick={() => {
                              setSelectedCategory(sub.slug);
                              setPage(1);
                            }}
                            className={filterOptionClass(selectedCategory === sub.slug, true)}
                          >
                            <span className="truncate">{sub.name}</span>
                            <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-400">
                              {subCount}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="eyebrow mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="field-input px-3 py-2.5"
          />
          <span className="font-bold text-gray-300">—</span>
          <input
            type="number"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="field-input px-3 py-2.5"
          />
        </div>
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div>
          <h3 className="eyebrow mb-3">Brand</h3>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => {
                  setSelectedBrand('');
                  setPage(1);
                }}
                className={filterOptionClass(!selectedBrand)}
              >
                All Brands
              </button>
            </li>
            {brands.map((brand) => (
              <li key={brand.slug}>
                <button
                  onClick={() => {
                    setSelectedBrand(brand.slug);
                    setPage(1);
                  }}
                  className={filterOptionClass(selectedBrand === brand.slug)}
                >
                  <span className="truncate">{brand.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <button onClick={clearFilters} className="btn btn-soft w-full">
          <X className="h-4 w-4" strokeWidth={2.5} />
          Clear All Filters
        </button>
      )}
    </div>
  );

  const renderProductCard = (product: Product, isFeaturedCard = false) => {
    const effectivePrice = product.salePrice ?? product.price;
    const hasDiscount = product.salePrice && product.salePrice < product.price;
    const discountPercent = hasDiscount
      ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
      : 0;
    const rating = product.averageRating;
    const reviews = product.reviewCount ?? 0;

    const badges: ProductCardBadge[] = [];
    if (hasDiscount) {
      badges.push({ label: `-${discountPercent}%`, tone: 'sale' });
    }
    if (product.isFeatured && !(viewMode === 'list' && !isFeaturedCard)) {
      badges.push({ label: 'NEW', tone: 'featured' });
    }

    return (
      <ProductCard
        key={product.id}
        layout={viewMode === 'list' && !isFeaturedCard ? 'list' : 'grid'}
        href={`/products/${product.slug}`}
        name={product.name}
        image={product.images?.[0]}
        brand={product.brandName}
        description={product.shortDescription}
        rating={reviews > 0 ? rating : null}
        reviewCount={reviews}
        price={effectivePrice}
        originalPrice={hasDiscount ? product.price : null}
        formatPrice={formatPrice}
        badges={badges}
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
  };

  const sortSelect = (
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
  );

  const pageButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/[0.05] bg-card text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky mobile filter bar */}
      <div className="sticky top-20 z-20 border-b border-foreground/[0.04] bg-gray-50/90 backdrop-blur-lg lg:hidden">
        <div className="site-container flex items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="btn btn-secondary btn-sm relative"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">{sortSelect}</div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">Filters</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="btn-icon h-10 w-10 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            {filterContent}
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="btn btn-primary btn-lg mt-6 w-full"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <div className="site-container px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900">Products</span>
        </nav>

        {/* Header */}
        <PageHeader
          title="All Products"
          description={
            pagination ? (
              <>
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} products
              </>
            ) : undefined
          }
          actions={
            <div className="hidden items-center gap-3 lg:flex">
              {sortSelect}

              {/* View toggle */}
              <div className="flex rounded-2xl border border-foreground/[0.04] bg-card p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          }
        />

        <div className="flex gap-6 lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="bento-card sticky top-24 p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Filter className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <h2 className="text-lg font-black tracking-tight text-gray-900">Filters</h2>
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Featured products */}
            {showFeatured && (
              <div className="bento-primary mb-6 p-5 sm:mb-8 sm:p-8">
                <BentoGlow />
                <div className="relative z-10">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                      <Star className="h-5 w-5 fill-white text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Featured Products</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        Most viewed picks
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-gray-900 sm:gap-4 md:grid-cols-4">
                    {featuredProducts
                      .slice(0, 4)
                      .map((product) => renderProductCard(product, true))}
                  </div>
                </div>
              </div>
            )}

            {/* Product grid/list */}
            {loading ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} layout={viewMode} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No products found"
                description="Try adjusting your filters or search criteria."
                action={
                  hasActiveFilters ? (
                    <button onClick={clearFilters} className="btn btn-primary">
                      Clear All Filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {products.map((product) => renderProductCard(product))}
              </div>
            )}

            {/* Smart Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bento-card mt-8 flex flex-col items-center gap-4 p-4 sm:flex-row sm:justify-between sm:px-6">
                <p className="text-[11px] font-bold text-gray-500">
                  Showing{' '}
                  <span className="text-gray-900">
                    {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="text-gray-900">{pagination.total}</span> products
                </p>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {/* First */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`${pageButtonClass} hidden sm:flex`}
                    title="First page"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  {/* Previous */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={pageButtonClass}
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                  </button>

                  {paginationRange.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 font-black text-gray-300">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        aria-current={item === page ? 'page' : undefined}
                        className={`h-10 min-w-[40px] rounded-xl px-3 text-xs font-black tabular-nums transition-all ${
                          item === page
                            ? 'bg-ink text-white shadow-lg shadow-black/10'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                  {/* Next */}
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className={pageButtonClass}
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  {/* Last */}
                  <button
                    onClick={() => setPage(pagination.pages)}
                    disabled={page === pagination.pages}
                    className={`${pageButtonClass} hidden sm:flex`}
                    title="Last page"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
