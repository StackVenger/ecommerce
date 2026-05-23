'use client';

import { ChevronRight, Heart, ShoppingCart, SlidersHorizontal, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: Number(raw.price),
    compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : undefined,
    salePrice: raw.compareAtPrice ? Number(raw.price) : null,
    images: Array.isArray(raw.images)
      ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url))
      : [],
    averageRating: Number(raw.averageRating ?? 0),
    reviewCount: raw._count?.reviews ?? raw.totalReviews ?? 0,
    categoryName: raw.category?.name ?? raw.categoryName ?? null,
    brandName: raw.brand?.name ?? raw.brandName ?? null,
    isFeatured: raw.isFeatured ?? false,
    shortDescription: raw.shortDescription ?? null,
    stock: raw.quantity ?? 0,
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
    addItem({ productId: product.id, quantity: 1 }, { openDrawer: false });
  };

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category hero */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600">
        <div className="site-container px-4 py-10">
          <nav className="mb-4 flex items-center gap-2 text-sm text-teal-100">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/categories" className="hover:text-white transition-colors">
              Categories
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">{category?.name ?? slug}</span>
          </nav>

          <h1 className="text-3xl font-bold text-white">
            {categoryLoading ? (
              <span className="inline-block h-9 w-48 animate-pulse rounded bg-white/20" />
            ) : (
              (category?.name ?? slug)
            )}
          </h1>

          {category?.nameBn && <p className="mt-1 text-teal-100">{category.nameBn}</p>}
          {category?.description && (
            <RichText
              html={category.description}
              className="mt-2 max-w-2xl text-teal-100 prose-headings:text-white prose-strong:text-white prose-a:text-white"
            />
          )}

          {/* Subcategory chips */}
          {category?.children && category.children.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {category.children.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/categories/${sub.slug}`}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}

          {pagination && (
            <p className="mt-3 text-sm text-teal-200">
              {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* Sticky mobile filter bar */}
      <div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm lg:hidden">
        <div className="site-container flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {[minPrice, maxPrice, selectedBrand].filter(Boolean).length}
              </span>
            )}
          </button>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border-gray-300 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterSidebar()}
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <div className="site-container px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 flex-shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-5">
              {filterSidebar()}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Desktop sort bar */}
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <p className="text-sm text-gray-500">
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

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-80 animate-pulse rounded-xl bg-gray-200" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-xl font-medium text-gray-500">No products found</p>
                <p className="mt-2 text-gray-400">
                  Try adjusting your filters or browse other categories.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {products.map((product) => {
                  const isAlreadyInCart = cart?.items?.some((item) => item.productId === product.id);
                  const effectivePrice = product.salePrice ?? product.price;
                  const hasDiscount = product.salePrice && product.salePrice < product.price;
                  const discountPercent = hasDiscount
                    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
                    : 0;
                  const rating = product.averageRating;
                  const reviews = product.reviewCount;

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

                        {reviews > 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3 w-3 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">({reviews})</span>
                          </div>
                        )}

                        <div className="mt-auto pt-2">
                          {hasDiscount ? (
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-primary">
                                {formatPrice(effectivePrice)}
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-bold text-primary">
                              {formatPrice(effectivePrice)}
                            </span>
                          )}
                        </div>

                        {/* Add to Cart */}
                        {product.stock > 0 ? (
                          <button
                            onClick={(e) => handleQuickAdd(e, product)}
                            disabled={isUpdating || isAlreadyInCart}
                            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-all ${
                              isAlreadyInCart
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary/90 disabled:opacity-50'
                            }`}
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            {isAlreadyInCart ? 'Added to Cart' : 'Add to Cart'}
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
      </div>
    </div>
  );

  function filterSidebar() {
    return (
      <div className="space-y-6">
        {/* Price range */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Price Range
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Brand filter */}
        {brands.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Brand
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    setSelectedBrand('');
                    setPage(1);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    !selectedBrand
                      ? 'bg-teal-50 font-medium text-primary'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
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
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedBrand === brand.slug
                        ? 'bg-teal-50 font-medium text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {brand.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Clear All Filters
          </button>
        )}
      </div>
    );
  }
}
