'use client';

import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
  RotateCcw,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ReviewForm } from '@/components/reviews/review-form';
import { ReviewList } from '@/components/reviews/review-list';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { apiClient } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  isPrimary?: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  images: ProductImage[];
  attributeValues: {
    value: string;
    attribute: { id: string; name: string; type: string };
  }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  status: string;
  isFeatured: boolean;
  tags: string[];
  weight?: number;
  weightUnit?: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  brand?: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: { id: string; name: string; type: string; values: string[] }[];
  reviewSummary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  };
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatBDT(amount: number): string {
  return `৳${Number(amount).toLocaleString('en-IN')}`;
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, isUpdating } = useCart();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>(
    'description',
  );
  // Bumped to force ReviewList to re-fetch after a successful submission.
  const [reviewsRefresh, setReviewsRefresh] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/products/${slug}`);
        const raw = data.data ?? data;
        const normalised: Product = {
          ...raw,
          price: Number(raw.price),
          compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : null,
          quantity: raw.quantity ?? 0,
          variants: Array.isArray(raw.variants)
            ? raw.variants.map((v: ProductVariant) => ({
                ...v,
                price: Number(v.price),
                quantity: v.quantity ?? 0,
              }))
            : [],
        };
        setProduct(normalised);

        // Pre-select the first in-stock variant, or the first variant if none
        // are in stock, so the PDP opens in a working state.
        if (normalised.variants.length > 0) {
          const initial = normalised.variants.find((v) => v.quantity > 0) ?? normalised.variants[0];
          if (initial) {
            const opts: Record<string, string> = {};
            for (const av of initial.attributeValues) {
              opts[av.attribute.name] = av.value;
            }
            setSelectedOptions(opts);
          }
        }
      } catch {
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  // ─── Variant lookup ───────────────────────────────────────────────

  const hasVariants = (product?.variants?.length ?? 0) > 0;

  /** Flatten a variant's attributeValues into { attrName: value }. */
  const variantOptions = (v: ProductVariant): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const av of v.attributeValues) {
      out[av.attribute.name] = av.value;
    }
    return out;
  };

  const allOptionsSelected = useMemo(() => {
    if (!product) {
      return false;
    }
    if (!hasVariants) {
      return true;
    }
    return product.attributes.every((a) => Boolean(selectedOptions[a.name]));
  }, [product, hasVariants, selectedOptions]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!product || !hasVariants || !allOptionsSelected) {
      return null;
    }
    return (
      product.variants.find((v) => {
        const opts = variantOptions(v);
        return product.attributes.every((a) => selectedOptions[a.name] === opts[a.name]);
      }) ?? null
    );
  }, [product, hasVariants, allOptionsSelected, selectedOptions]);

  /**
   * Is `value` for `attrName` reachable — i.e. does at least one variant
   * match the current selection if we replace that attribute's pick with
   * this value? Used to dim impossible combinations.
   */
  const isValueReachable = (attrName: string, value: string): boolean => {
    if (!product) {
      return false;
    }
    const hypothetical = { ...selectedOptions, [attrName]: value };
    return product.variants.some((v) => {
      const opts = variantOptions(v);
      return Object.entries(hypothetical).every(([k, val]) => opts[k] === val);
    });
  };

  const isValueInStock = (attrName: string, value: string): boolean => {
    if (!product) {
      return false;
    }
    const hypothetical = { ...selectedOptions, [attrName]: value };
    return product.variants.some((v) => {
      const opts = variantOptions(v);
      return Object.entries(hypothetical).every(([k, val]) => opts[k] === val) && v.quantity > 0;
    });
  };

  const handleSelectOption = (attrName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [attrName]: value }));
    setQuantity(1);
    setSelectedImage(0);
  };

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }
    if (hasVariants) {
      if (!selectedVariant) {
        setCartError('Please select all options before adding to cart.');
        return;
      }
      if (selectedVariant.quantity <= 0) {
        setCartError('The selected combination is out of stock.');
        return;
      }
    } else if (product.quantity <= 0) {
      return;
    }
    setAddingToCart(true);
    setCartError(null);
    try {
      await addItem({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add to cart';
      setCartError(msg);
    } finally {
      setAddingToCart(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="site-container px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square animate-pulse rounded-xl bg-gray-200" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !product) {
    return (
      <div className="site-container px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product Not Found</h1>
        <p className="mt-2 text-gray-500">The product you are looking for does not exist.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // Display fields come from the selected variant when present, otherwise
  // from the base product. `compareAtPrice` stays product-level since the
  // admin form doesn't capture a per-variant compare price.
  const displayPrice = selectedVariant ? Number(selectedVariant.price) : product.price;
  const displayStock = selectedVariant ? selectedVariant.quantity : product.quantity;
  const displaySku = selectedVariant?.sku ?? product.sku;

  const discount =
    product.compareAtPrice && product.compareAtPrice > displayPrice
      ? Math.round((1 - displayPrice / Number(product.compareAtPrice)) * 100)
      : 0;

  const inStock = hasVariants
    ? selectedVariant
      ? selectedVariant.quantity > 0
      : false
    : product.quantity > 0;
  const lowStock = inStock && displayStock <= 10;

  // Gallery: when the selected variant has its own image, show it first.
  // Prepend to product images (deduped by URL) so the admin's chosen image
  // becomes the hero while existing gallery thumbnails remain accessible.
  const galleryImages: ProductImage[] = (() => {
    const variantImgs = selectedVariant?.images ?? [];
    if (variantImgs.length === 0) {
      return product.images;
    }
    const seen = new Set<string>();
    const combined: ProductImage[] = [];
    for (const img of [...variantImgs, ...product.images]) {
      if (seen.has(img.url)) {
        continue;
      }
      seen.add(img.url);
      combined.push(img);
    }
    return combined;
  })();

  const primaryImage = galleryImages[selectedImage]?.url || galleryImages[0]?.url;
  const rating = product.reviewSummary?.averageRating ?? 0;
  const totalReviews = product.reviewSummary?.totalReviews ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="site-container px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/products" className="hover:text-primary transition-colors">
            Products
          </Link>
          {product.category?.parent && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/categories/${product.category.parent.slug}`}
                className="hover:text-primary transition-colors"
              >
                {product.category.parent.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/categories/${product.category.slug}`}
            className="hover:text-primary transition-colors"
          >
            {product.category.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Image Gallery ── */}
          <div>
            <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-gray-100">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={galleryImages[selectedImage]?.alt || product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <ShoppingCart className="h-20 w-20" />
                </div>
              )}

              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-lg bg-red-500 px-2.5 py-1 text-sm font-bold text-white shadow">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 bg-gray-100 transition-colors ${
                      i === selectedImage
                        ? 'border-primary'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.alt || `${product.name} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div>
            {/* Brand & SKU */}
            <div className="mb-2 flex items-center gap-2">
              {product.brand && (
                <>
                  <Link
                    href={`/brands/${product.brand.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {product.brand.name}
                  </Link>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <span className="text-sm text-gray-500">SKU: {displaySku}</span>
            </div>

            {/* Title */}
            <h1 className="mb-3 text-2xl font-bold text-gray-900 lg:text-3xl">{product.name}</h1>

            {/* Rating */}
            {totalReviews > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {Number(rating).toFixed(1)} ({totalReviews}{' '}
                  {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatBDT(displayPrice)}</span>
              {product.compareAtPrice && Number(product.compareAtPrice) > displayPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatBDT(Number(product.compareAtPrice))}
                  </span>
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-sm font-semibold text-red-600">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <p className="mb-6 text-gray-600">{product.shortDescription}</p>
            )}

            {/* Variant attribute picker */}
            {hasVariants && product.attributes.length > 0 && (
              <div className="mb-6 space-y-4">
                {product.attributes.map((attr) => {
                  const current = selectedOptions[attr.name];
                  const values = Array.isArray(attr.values) ? attr.values : [];
                  return (
                    <div key={attr.id}>
                      <h3 className="mb-2 text-sm font-medium text-gray-700">
                        {attr.name}
                        {current && (
                          <span className="ml-2 font-normal text-gray-500">: {current}</span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val: string) => {
                          const selected = current === val;
                          const reachable = isValueReachable(attr.name, val);
                          const inStockCombo = isValueInStock(attr.name, val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelectOption(attr.name, val)}
                              disabled={!reachable}
                              title={
                                !reachable
                                  ? 'Not available with the current selection'
                                  : !inStockCombo
                                    ? 'Out of stock'
                                    : undefined
                              }
                              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                                selected
                                  ? 'border-primary bg-primary text-white'
                                  : reachable
                                    ? 'border-gray-200 bg-white text-gray-700 hover:border-primary'
                                    : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                              } ${reachable && !inStockCombo ? 'opacity-60' : ''}`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {allOptionsSelected && !selectedVariant && (
                  <p className="text-sm text-red-600">
                    This combination is not available. Try a different selection.
                  </p>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="mb-4 flex gap-3">
              {/* Quantity selector */}
              <div className="flex items-center rounded-lg border border-gray-300">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !inStock}
                  className="px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-lg"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(displayStock, q + 1))}
                  disabled={quantity >= displayStock || !inStock}
                  className="px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-lg"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart || isUpdating}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-colors ${
                  inStock
                    ? 'bg-primary hover:bg-primary/90 disabled:opacity-60'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {!inStock ? 'Out of Stock' : addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>

              {/* Wishlist */}
              <button className="rounded-lg border border-gray-300 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors">
                <Heart className="h-5 w-5" />
              </button>
            </div>

            {/* Cart error */}
            {cartError && <p className="mb-4 text-sm text-red-600">{cartError}</p>}

            {/* Stock info */}
            <div className="mb-6">
              {inStock ? (
                lowStock ? (
                  <p className="text-sm font-medium text-orange-600">
                    Only {displayStock} left in stock - order soon!
                  </p>
                ) : (
                  <p className="text-sm font-medium text-green-600">In Stock</p>
                )
              ) : (
                <p className="text-sm font-medium text-red-600">Out of Stock</p>
              )}
            </div>

            {/* Delivery info */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Free Delivery</p>
                  <p className="text-gray-500">On orders above ৳1,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RotateCcw className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-gray-500">7-day return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Secure Checkout</p>
                  <p className="text-gray-500">SSL encrypted payment</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs: Description / Specifications / Reviews ── */}
        <div className="mt-12">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'description' as const, label: 'Description' },
              { key: 'specifications' as const, label: 'Details' },
              { key: 'reviews' as const, label: `Reviews (${totalReviews})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none text-gray-700">
                <p className="whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="max-w-2xl">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 pr-4 text-sm font-medium text-gray-500 w-40">SKU</td>
                      <td className="py-3 text-sm text-gray-900">{displaySku}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 pr-4 text-sm font-medium text-gray-500">Category</td>
                      <td className="py-3 text-sm text-gray-900">{product.category.name}</td>
                    </tr>
                    {product.brand && (
                      <tr className="border-b">
                        <td className="py-3 pr-4 text-sm font-medium text-gray-500">Brand</td>
                        <td className="py-3 text-sm text-gray-900">{product.brand.name}</td>
                      </tr>
                    )}
                    {product.weight && (
                      <tr className="border-b">
                        <td className="py-3 pr-4 text-sm font-medium text-gray-500">Weight</td>
                        <td className="py-3 text-sm text-gray-900">
                          {Number(product.weight)} {product.weightUnit || 'kg'}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b">
                      <td className="py-3 pr-4 text-sm font-medium text-gray-500">Status</td>
                      <td className="py-3 text-sm text-gray-900">
                        {inStock ? (
                          <span className="text-green-600">
                            In Stock ({displayStock} available)
                          </span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </td>
                    </tr>
                    {product.attributes.map((attr) => (
                      <tr key={attr.id} className="border-b">
                        <td className="py-3 pr-4 text-sm font-medium text-gray-500">{attr.name}</td>
                        <td className="py-3 text-sm text-gray-900">
                          {Array.isArray(attr.values)
                            ? attr.values.join(', ')
                            : String(attr.values)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {totalReviews > 0 ? (
                  <div className="space-y-4">
                    {/* Rating summary */}
                    <div className="flex items-center gap-6 rounded-xl bg-gray-50 p-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900">
                          {Number(rating).toFixed(1)}
                        </p>
                        <div className="mt-1 flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${
                                s <= Math.round(rating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-gray-200 text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{totalReviews} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = product.reviewSummary?.ratingDistribution?.[star] ?? 0;
                          const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-sm">
                              <span className="w-3 text-gray-500">{star}</span>
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-400">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Write-a-review section: form for logged-in users, sign-in
                    prompt for guests. Always visible regardless of whether
                    other reviews exist. */}
                <div className="mt-6">
                  {isAuthenticated ? (
                    <ReviewForm
                      productId={product.id}
                      onSubmitted={() => setReviewsRefresh((n) => n + 1)}
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-600">
                        <Link
                          href={`/login?redirect=/products/${product.slug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Sign in
                        </Link>{' '}
                        to write a review for this product.
                      </p>
                    </div>
                  )}
                </div>

                {/* Approved review list. Re-mounts when reviewsRefresh changes
                    so a freshly-submitted review (once approved) shows up. */}
                <div className="mt-6">
                  <ReviewList key={reviewsRefresh} productId={product.id} />
                </div>

                {totalReviews === 0 && (
                  <div className="mt-6 py-6 text-center">
                    <Star className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      No reviews yet — be the first to review this product!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
