'use client';

import { ShoppingCart, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { Breadcrumbs, EmptyState } from '@/components/ui/bento';
import { RichText } from '@/components/ui/rich-text';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { apiClient } from '@/lib/api/client';

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

interface Category {
  id: string;
  name: string;
  nameBn?: string;
  slug: string;
  description: string | null;
  children?: Category[];
  productCount?: number;
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

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'averageRating:desc', label: 'Top Rated' },
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { cart, addItem, isUpdating } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brands, setBrands] = useState<{ name: string; slug: string }[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { wishlist, toggleWishlist } = useWishlist();

  // Fetch category info
  useEffect(() => {
    setCategoryLoading(true);
    apiClient
      .get(`/categories/${slug}`)
      .then(({ data }) => {
        const cat = data.data ?? data;
        setCategory(cat);
      })
      .catch(() => {})
      .finally(() => setCategoryLoading(false));
  }, [slug]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('categorySlug', slug);
      params.set('page', String(page));
      params.set('limit', '24');
      const [sortField = 'createdAt', sortOrder = 'desc'] = sortBy.split(':');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);
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

      const meta = data.meta ?? data.data?.pagination ?? data.pagination;
      if (meta) {
        setPagination({
          total: meta.total ?? 0,
          page: meta.page ?? 1,
          limit: meta.limit ?? 24,
          pages: meta.totalPages ?? meta.pages ?? 1,
        });
      }

      // Extract brands
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
  }, [slug, page, sortBy, minPrice, maxPrice, selectedBrand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const hasActiveFilters = minPrice || maxPrice || selectedBrand;

  const clearFilters = () => {
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
    'flex h-9 min-w-[36px] items-center justify-center border border-gray-200 bg-card px-2.5 text-sm tabular-nums text-gray-700 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-700';

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Categories', href: '/categories' },
          { label: category?.name ?? slug },
        ]}
      />

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-gray-200 bg-card p-5">
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
            <div className="bg-gray-50 p-5">{filterSidebar()}</div>
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
            <div className="bg-gray-50 p-5">{filterSidebar()}</div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Category header */}
            <div className="mb-6">
              <h1 className="shop-heading">
                {categoryLoading ? (
                  <span className="inline-block h-7 w-48 animate-pulse bg-gray-100 align-middle" />
                ) : (
                  (category?.name ?? slug)
                )}
              </h1>
              {category?.nameBn && <p className="mt-3 text-sm text-gray-500">{category.nameBn}</p>}
              {category?.description && (
                <RichText
                  html={category.description}
                  className="mt-3 max-w-3xl text-sm text-gray-600"
                />
              )}

              {/* Subcategory chips */}
              {category?.children && category.children.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {category.children.map((sub) => (
                    <Link key={sub.slug} href={`/categories/${sub.slug}`} className="chip">
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="mb-7 flex items-center justify-between gap-3 border border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="btn btn-secondary btn-sm h-9 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                  Filters
                  {hasActiveFilters && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center bg-primary px-1 text-[11px] font-semibold text-white">
                      {[minPrice, maxPrice, selectedBrand].filter(Boolean).length}
                    </span>
                  )}
                </button>
                <p className="hidden truncate text-[13px] text-gray-500 sm:block">
                  {pagination ? (
                    <>
                      Showing{' '}
                      {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total}
                    </>
                  ) : (
                    'Loading...'
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-[13px] text-gray-700 sm:inline">Sort by:</span>
                {sortSelect}
              </div>
            </div>

            {pagination && (
              <p className="-mt-4 mb-5 text-[13px] text-gray-500 sm:hidden">
                {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
              </p>
            )}

            {/* Product grid */}
            {loading ? (
              <ProductGrid columns={3}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </ProductGrid>
            ) : products.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No products found"
                description="Try adjusting your filters or browse other categories."
                action={
                  hasActiveFilters ? (
                    <button onClick={clearFilters} className="btn btn-primary">
                      Clear All Filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <ProductGrid columns={3}>
                {products.map((product) => {
                  const isAlreadyInCart = cart?.items?.some(
                    (item) => item.productId === product.id,
                  );
                  const effectivePrice = product.salePrice ?? product.price;
                  const hasDiscount = product.salePrice && product.salePrice < product.price;
                  const discountPercent = hasDiscount
                    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
                    : 0;
                  const rating = product.averageRating;
                  const reviews = product.reviewCount;

                  return (
                    <ProductCard
                      key={product.id}
                      href={`/products/${product.slug}`}
                      name={product.name}
                      image={product.images?.[0]}
                      brand={product.brandName}
                      rating={reviews > 0 ? rating : null}
                      reviewCount={reviews}
                      price={effectivePrice}
                      originalPrice={hasDiscount ? product.price : null}
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
              <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5 border border-gray-200 px-3 py-3 sm:justify-start sm:px-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={pageButtonClass}
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
                      className={`${pageButtonClass} ${
                        pageNum === page
                          ? 'border-primary bg-primary text-white hover:text-white'
                          : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className={pageButtonClass}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function filterSidebar() {
    const optionClass = (active: boolean) =>
      `flex w-full items-center py-1.5 text-left text-sm transition-colors ${
        active ? 'font-medium text-primary' : 'text-gray-700 hover:text-primary'
      }`;
    const widgetTitleClass = 'mb-4 font-heading text-base font-semibold text-gray-900';

    return (
      <div>
        {/* Price range */}
        <div>
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
                  className={optionClass(!selectedBrand)}
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
                    className={optionClass(selectedBrand === brand.slug)}
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
  }
}
