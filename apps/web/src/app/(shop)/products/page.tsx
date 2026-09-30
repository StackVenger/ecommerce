'use client';

import {
  ChevronsLeft,
  ChevronsRight,
  Grid3X3,
  List,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  type ProductCardBadge,
} from '@/components/products/product-card';
import { Breadcrumbs, EmptyState, ShopSectionHeading } from '@/components/ui/bento';
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
  defaultVariantId?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const compareAtPrice = defaultVariant
    ? defaultVariant.compareAtPrice
      ? Number(defaultVariant.compareAtPrice)
      : undefined
    : raw.compareAtPrice
      ? Number(raw.compareAtPrice)
      : undefined;
  const stock = defaultVariant ? (defaultVariant.quantity ?? 0) : (raw.quantity ?? 0);
  const defaultVariantId = defaultVariant ? defaultVariant.id : undefined;

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price,
    compareAtPrice,
    salePrice: compareAtPrice ? price : null,
    images: defaultVariantImage ? [defaultVariantImage, ...rawImages] : rawImages,
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw.totalReviews ?? raw._count?.reviews ?? 0,
    categoryName: raw.category?.name ?? raw.categoryName ?? null,
    brandName: raw.brand?.name ?? raw.brandName ?? null,
    isFeatured: raw.isFeatured ?? false,
    shortDescription: raw.shortDescription ?? null,
    stock,
    defaultVariantId,
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
  const { cart, addItem, isUpdating } = useCart();

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
    addItem(
      {
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity: 1,
      },
      { openDrawer: false },
    );
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
    `flex w-full items-center justify-between gap-2 py-1.5 text-left text-sm transition-colors ${
      active
        ? 'font-medium text-primary'
        : sub
          ? 'text-gray-500 hover:text-primary'
          : 'text-gray-700 hover:text-primary'
    }`;

  const widgetTitleClass = 'mb-4 font-heading text-base font-semibold text-gray-900';

  const filterContent = (
    <div>
      {/* Category filter */}
      <div>
        <h3 className={widgetTitleClass}>Category</h3>
        <ul>
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
                    <span className="shrink-0 text-[13px] tabular-nums text-gray-500">
                      ({totalCount})
                    </span>
                  )}
                </button>

                {/* Subcategories */}
                {hasChildren && (
                  <ul className="mb-1 ml-1 border-l border-gray-200 pl-3">
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
                            <span className="shrink-0 text-[13px] tabular-nums text-gray-500">
                              ({subCount})
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
      <div className="mt-5 border-t border-gray-200 pt-5">
        <h3 className={widgetTitleClass}>Price Range</h3>
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
            className="field-input h-10 px-3"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="field-input h-10 px-3"
          />
        </div>
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div className="mt-5 border-t border-gray-200 pt-5">
          <h3 className={widgetTitleClass}>Brand</h3>
          <ul>
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
        <div className="mt-5 border-t border-gray-200 pt-5">
          <button onClick={clearFilters} className="btn btn-secondary btn-sm w-full">
            <X className="h-4 w-4" strokeWidth={2} />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );

  const renderProductCard = (product: Product, isFeaturedCard = false) => {
    const isAlreadyInCart = cart?.items?.some((item) => item.productId === product.id);
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
  };

  const sortSelect = (
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
  );

  const pageButtonClass =
    'flex h-9 min-w-[36px] items-center justify-center border border-gray-200 bg-card px-2.5 text-sm text-gray-700 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-700';

  const viewButtonClass = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center transition-colors ${
      active ? 'text-primary' : 'text-gray-400 hover:text-gray-900'
    }`;

  const rangeText = pagination ? (
    <>
      Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
      products
    </>
  ) : null;

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-gray-200 bg-card p-5 animate-in slide-in-from-bottom">
            <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="section-title">Filters</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="btn-icon h-9 w-9 border border-gray-200 text-gray-600 hover:text-primary"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="bg-gray-50 p-5">{filterContent}</div>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="btn btn-primary btn-lg mt-5 w-full"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-[270px] flex-shrink-0 lg:block">
            <div className="bg-gray-50 p-5">{filterContent}</div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <ShopSectionHeading as="h1" title="All Products" className="mb-6" />

            {/* Toolbar */}
            <div className="mb-7 flex items-center justify-between gap-3 border border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="btn btn-secondary btn-sm relative h-9 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center bg-primary px-1 text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* View toggle */}
                <div className="hidden items-center sm:flex">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    className={viewButtonClass(viewMode === 'grid')}
                  >
                    <Grid3X3 className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    className={viewButtonClass(viewMode === 'list')}
                  >
                    <List className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </div>

                {rangeText && (
                  <p className="hidden truncate text-[13px] text-gray-500 md:block">{rangeText}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-[13px] text-gray-700 sm:inline">Sort by:</span>
                {sortSelect}
              </div>
            </div>

            {rangeText && (
              <p className="-mt-4 mb-5 text-[13px] text-gray-500 md:hidden">{rangeText}</p>
            )}

            {/* Featured products */}
            {showFeatured && (
              <section className="mb-10 border-b border-gray-200 pb-10">
                <ShopSectionHeading as="h2" title="Featured Products" caption="Most viewed picks" />
                <ProductGrid className="md:grid-cols-4 xl:grid-cols-4">
                  {featuredProducts.slice(0, 4).map((product) => renderProductCard(product, true))}
                </ProductGrid>
              </section>
            )}

            {/* Product grid/list */}
            {loading ? (
              viewMode === 'grid' ? (
                <ProductGrid columns={3}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} layout="grid" />
                  ))}
                </ProductGrid>
              ) : (
                <div className="flex flex-col gap-5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} layout="list" />
                  ))}
                </div>
              )
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
            ) : viewMode === 'grid' ? (
              <ProductGrid columns={3}>
                {products.map((product) => renderProductCard(product))}
              </ProductGrid>
            ) : (
              <div className="flex flex-col gap-5">
                {products.map((product) => renderProductCard(product))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4 border border-gray-200 px-3 py-3 sm:flex-row sm:justify-between sm:px-4">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {/* First */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`${pageButtonClass} hidden sm:flex`}
                    title="First page"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
                  </button>
                  {/* Previous */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={pageButtonClass}
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    Prev
                  </button>

                  {paginationRange.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        aria-current={item === page ? 'page' : undefined}
                        className={`${pageButtonClass} tabular-nums ${
                          item === page
                            ? 'border-primary bg-primary text-white hover:text-white'
                            : ''
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
                    Next
                  </button>
                  {/* Last */}
                  <button
                    onClick={() => setPage(pagination.pages)}
                    disabled={page === pagination.pages}
                    className={`${pageButtonClass} hidden sm:flex`}
                    title="Last page"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <p className="text-[13px] text-gray-500">{rangeText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
