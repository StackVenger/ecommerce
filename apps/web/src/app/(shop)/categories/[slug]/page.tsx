'use client';

import {
  ChevronRight,
  LayoutGrid,
  Package,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/components/products/product-card';
import { BentoGlow, EmptyState, StatCard } from '@/components/ui/bento';
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
      className="field-input w-auto cursor-pointer py-2.5 pr-9 text-xs font-bold"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category hero */}
      <div className="site-container px-4 pt-6 sm:pt-8">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-400">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/categories" className="transition-colors hover:text-gray-900">
            Categories
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900">{category?.name ?? slug}</span>
        </nav>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="bento-dark rounded-[2rem] p-8 sm:p-10 lg:col-span-9">
            <BentoGlow variant="dark" />
            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-3 text-white/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                  <LayoutGrid className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Category</span>
              </div>

              <h1 className="text-3xl font-black leading-none tracking-tighter text-white sm:text-4xl">
                {categoryLoading ? (
                  <span className="inline-block h-9 w-48 animate-pulse rounded-xl bg-white/10" />
                ) : (
                  (category?.name ?? slug)
                )}
              </h1>

              {category?.nameBn && (
                <p className="mt-2 text-sm font-bold text-white/60">{category.nameBn}</p>
              )}
              {pagination && (
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/50 lg:hidden">
                  {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
                </p>
              )}
              {category?.description && (
                <RichText
                  html={category.description}
                  className="mt-3 max-w-2xl text-sm font-medium text-white/60 prose-headings:text-white prose-strong:text-white prose-a:text-white"
                />
              )}

              {/* Subcategory chips */}
              {category?.children && category.children.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {category.children.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/categories/${sub.slug}`}
                      className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-primary"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <StatCard
            className="hidden lg:col-span-3 lg:flex"
            icon={Package}
            tone="brand"
            label="Products found"
            value={pagination ? pagination.total : '—'}
            loading={!pagination && loading}
          />
        </div>
      </div>

      {/* Sticky mobile filter bar */}
      <div className="sticky top-20 z-20 mt-4 border-y border-foreground/[0.04] bg-gray-50/90 backdrop-blur-lg lg:hidden">
        <div className="site-container flex items-center justify-between gap-3 px-4 py-3">
          <button onClick={() => setMobileFilterOpen(true)} className="btn btn-secondary btn-sm">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-white">
                {[minPrice, maxPrice, selectedBrand].filter(Boolean).length}
              </span>
            )}
          </button>
          {sortSelect}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-2xl">
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
            {filterSidebar()}
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
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 flex-shrink-0 lg:block">
            <div className="bento-card sticky top-24 p-6">{filterSidebar()}</div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Desktop sort bar */}
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <p className="text-[11px] font-bold text-gray-500">
                {pagination ? (
                  <>
                    Showing{' '}
                    <span className="text-gray-900">
                      {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="text-gray-900">{pagination.total}</span>
                  </>
                ) : (
                  'Loading...'
                )}
              </p>
              {sortSelect}
            </div>

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
      </div>
    </div>
  );

  function filterSidebar() {
    const optionClass = (active: boolean) =>
      `flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-all ${
        active
          ? 'bg-brand-50 font-black text-brand-700'
          : 'font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`;

    return (
      <div className="space-y-7">
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
          <button onClick={clearFilters} className="btn btn-soft w-full">
            <X className="h-4 w-4" strokeWidth={2.5} />
            Clear All Filters
          </button>
        )}
      </div>
    );
  }
}
