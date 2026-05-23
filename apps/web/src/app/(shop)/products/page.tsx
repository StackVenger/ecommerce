'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Grid3X3,
  Heart,
  List,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
    addItem({ productId: product.id, quantity: 1 }, { openDrawer: false });
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
  const filterContent = (
    <div className="space-y-6">
      {/* Category filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Category
        </h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => {
                setSelectedCategory('');
                setPage(1);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !selectedCategory
                  ? 'bg-teal-50 font-medium text-primary'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
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
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-teal-50 text-primary'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  {totalCount > 0 && (
                    <span className="ml-1 text-xs font-normal text-gray-400">({totalCount})</span>
                  )}
                </button>

                {/* Subcategories */}
                {hasChildren && (
                  <ul className="ml-3 border-l border-gray-200 pl-2 space-y-0.5">
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
                            className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                              selectedCategory === sub.slug
                                ? 'bg-teal-50 font-medium text-primary'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <span>{sub.name}</span>
                            <span className="ml-1 text-xs text-gray-400">({subCount})</span>
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          Clear All Filters
        </button>
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
    const reviews = product.reviewCount ?? product.totalReviews ?? 0;

    if (viewMode === 'list' && !isFeaturedCard) {
      return (
        <Link
          key={product.id}
          href={`/products/${product.slug}`}
          className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-lg hover:border-primary sm:gap-6"
        >
          <div className="relative h-36 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-44 sm:w-44">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
            )}
            {hasDiscount && (
              <span className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                -{discountPercent}%
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              {product.brandName && (
                <p className="text-xs font-medium text-primary">{product.brandName}</p>
              )}
              <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-primary line-clamp-2">
                {product.name}
              </h3>
              {product.shortDescription && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {product.shortDescription}
                </p>
              )}
              {reviews > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= Math.round(rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {rating.toFixed(1)} ({reviews})
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                {hasDiscount ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(effectivePrice)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(effectivePrice)}
                  </span>
                )}
              </div>
              {product.stock > 0 ? (
                <button
                  onClick={(e) => handleQuickAdd(e, product)}
                  disabled={isUpdating || isAlreadyInCart}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                    isAlreadyInCart
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 disabled:opacity-50'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isAlreadyInCart ? 'Added to Cart' : 'Add to Cart'}
                </button>
              ) : (
                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-red-500">
                  Out of Stock
                </span>
              )}
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        key={product.id}
        href={`/products/${product.slug}`}
        className="group relative flex flex-col rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg hover:border-primary hover:-translate-y-0.5"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {product.isFeatured && (
              <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                NEW
              </span>
            )}
          </div>

          {/* Wishlist heart */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 opacity-0 backdrop-blur-sm shadow-sm transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:scale-110"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>

          {/* Out of stock overlay */}
          {product.stock <= 0 && (
            <div className="absolute inset-x-0 bottom-0 bg-gray-900/80 py-2.5 text-center text-sm font-medium text-white backdrop-blur-sm">
              Out of Stock
            </div>
          )}
        </div>

        {/* Info */}
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
                    className={`h-3 w-3 ${
                      s <= Math.round(rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
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
            <p className="mt-2 text-center text-xs font-medium text-red-500">Out of Stock</p>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky mobile filter bar */}
      <div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm lg:hidden">
        <div className="site-container flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="relative flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
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
      </div>

      {/* Mobile filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <div className="site-container px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium">Products</span>
        </nav>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-gray-900">Filters</h2>
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
                {pagination && (
                  <p className="mt-1 text-sm text-gray-500">
                    Showing{' '}
                    {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} products
                  </p>
                )}
              </div>
              <div className="hidden items-center gap-3 lg:flex">
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

                {/* View toggle */}
                <div className="flex rounded-lg border border-gray-300 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Featured products */}
            {showFeatured && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <h2 className="text-lg font-bold text-gray-900">Featured Products</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {featuredProducts.slice(0, 4).map((product) => renderProductCard(product, true))}
                </div>
                <hr className="mt-8 border-gray-200" />
              </div>
            )}

            {/* Product grid/list */}
            {loading ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`animate-pulse rounded-xl bg-gray-200 ${
                      viewMode === 'grid' ? 'h-80' : 'h-44'
                    }`}
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-xl font-medium text-gray-500">No products found</p>
                <p className="mt-2 text-gray-400">Try adjusting your filters or search criteria.</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {products.map((product) => renderProductCard(product))}
              </div>
            )}

            {/* Smart Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
                  –{Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} products
                </p>

                <div className="flex items-center gap-1">
                  {/* First */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="rounded-lg border p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  {/* Previous */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {paginationRange.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          item === page
                            ? 'bg-primary text-white shadow-sm'
                            : 'border text-gray-600 hover:bg-gray-50'
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
                    className="rounded-lg border p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {/* Last */}
                  <button
                    onClick={() => setPage(pagination.pages)}
                    disabled={page === pagination.pages}
                    className="rounded-lg border p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
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
