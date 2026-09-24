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
  PackageSearch,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ProductQuestions } from '@/components/products/product-questions';
import { ReviewForm } from '@/components/reviews/review-form';
import { ReviewList } from '@/components/reviews/review-list';
import { EmptyState, IconTile, StatusPill } from '@/components/ui/bento';
import { RichText } from '@/components/ui/rich-text';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
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
  isDefault?: boolean;
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

/**
 * Format a weight stored in grams (the unit the admin form collects, see
 * components/admin/products/pricing-form.tsx) into a human-readable string.
 * Sub-kilogram values stay in grams; ≥1 kg renders in kg with up to two
 * decimal places. Ignores the (legacy) `weightUnit` field on the product
 * row, which defaulted to "kg" in the schema and produced "100 kg" for
 * 100-gram items.
 */
function formatWeight(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) {
    return '—';
  }
  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  const kg = grams / 1000;
  return `${kg.toFixed(kg % 1 === 0 ? 0 : 2)} kg`;
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, isUpdating } = useCart();
  const { isAuthenticated } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();

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

  // Once variants exist on a product, they own the UI — even when every
  // variant currently has zero stock. The previous version also gated on
  // "at least one variant has quantity > 0", which silently hid the
  // colour/size picker for any product whose admin defined variants but
  // hadn't yet set per-variant stock; customers saw a plain "In Stock"
  // page driven by the stale parent quantity. Always render the picker
  // when variants exist and let the per-value `inStockCombo` flag and the
  // overall `inStock` calculation surface the out-of-stock state cleanly.
  const variantsActive = hasVariants;

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
    if (!variantsActive) {
      return true;
    }
    return product.attributes.every((a) => Boolean(selectedOptions[a.name]));
  }, [product, variantsActive, selectedOptions]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!product || !variantsActive || !allOptionsSelected) {
      return null;
    }
    return (
      product.variants.find((v) => {
        const opts = variantOptions(v);
        return product.attributes.every((a) => selectedOptions[a.name] === opts[a.name]);
      }) ?? null
    );
  }, [product, variantsActive, allOptionsSelected, selectedOptions]);

  // The "default variant" is the one the admin flagged as default (or the
  // first active variant as fallback). On first paint — before the buyer
  // picks anything — the PDP shows this variant's images and price so
  // there's a visible cover without forcing an auto-selection that would
  // hide product-level edits behind a variant override.
  const defaultVariant = useMemo<ProductVariant | null>(() => {
    if (!product || !variantsActive) {
      return null;
    }
    return product.variants.find((v) => v.isDefault === true) ?? product.variants[0] ?? null;
  }, [product, variantsActive]);

  /** Variant whose data drives the hero/price right now: the explicit
   *  selection if any, otherwise the default — never falls through to
   *  product-level when variants exist. */
  const effectiveVariant = selectedVariant ?? defaultVariant;

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

  /**
   * Treat an attribute as "colour-like" when the DB type is COLOR or its
   * name matches color/colour case-insensitively (handles attributes
   * created before the API started inferring types from the name).
   */
  const isColorAttribute = (attr: { name: string; type: string }): boolean =>
    attr.type === 'COLOR' || /^(color|colour)$/i.test(attr.name.trim());

  /**
   * Find the variant image to use as the swatch for a given colour value
   * (Daraz-style "Color Family" tile). Picks the first variant that
   * carries this value and returns its first image; falls back to the
   * product's primary image when no variant-scoped image is set.
   */
  const swatchImageForValue = (attrName: string, value: string): string | null => {
    if (!product) {
      return null;
    }
    const match = product.variants.find((v) =>
      v.attributeValues.some((av) => av.attribute.name === attrName && av.value === value),
    );
    return match?.images?.[0]?.url ?? product.images?.[0]?.url ?? null;
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
    if (variantsActive) {
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
      <div className="site-container px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="bento-card p-3 sm:p-4 lg:col-span-7">
            <div className="aspect-square animate-pulse rounded-[1.5rem] bg-gray-100" />
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-[1rem] bg-gray-100" />
              ))}
            </div>
          </div>
          <div className="bento-card space-y-4 p-6 sm:p-8 lg:col-span-5">
            <div className="h-3 w-32 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-9 w-3/4 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-4 w-24 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 w-full animate-pulse rounded-[1.5rem] bg-gray-100" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !product) {
    return (
      <div className="site-container px-4 py-12 sm:py-20">
        <EmptyState
          icon={PackageSearch}
          title="Product Not Found"
          description="The product you are looking for does not exist."
          action={
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
          }
          className="mx-auto max-w-xl"
        />
      </div>
    );
  }

  // Display fields come from the effective variant (selected if any,
  // otherwise the admin-marked default) when variants exist; from the
  // base product otherwise. `compareAtPrice` stays product-level since
  // the admin form doesn't capture a per-variant compare price.
  const displayPrice = effectiveVariant ? Number(effectiveVariant.price) : product.price;
  const displayStock = selectedVariant ? selectedVariant.quantity : product.quantity;
  const displaySku = effectiveVariant?.sku ?? product.sku;

  const discount =
    product.compareAtPrice && product.compareAtPrice > displayPrice
      ? Math.round((1 - displayPrice / Number(product.compareAtPrice)) * 100)
      : 0;

  const inStock = variantsActive
    ? selectedVariant
      ? selectedVariant.quantity > 0
      : product.variants.some((v) => v.quantity > 0)
    : product.quantity > 0;
  const lowStock = inStock && displayStock <= 10;

  // Gallery: when an effective variant has its own images, those drive
  // the hero (and the rest of the strip). Product-level images are
  // appended only as a fallback so the gallery never goes empty.
  const galleryImages: ProductImage[] = (() => {
    const variantImgs = effectiveVariant?.images ?? [];
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

  const specRows: { label: string; value: React.ReactNode }[] = [
    { label: 'SKU', value: displaySku },
    { label: 'Category', value: product.category.name },
    ...(product.brand ? [{ label: 'Brand', value: product.brand.name }] : []),
    ...(product.weight ? [{ label: 'Weight', value: formatWeight(Number(product.weight)) }] : []),
    {
      label: 'Status',
      value: inStock ? (
        <StatusPill tone="success">In Stock ({displayStock} available)</StatusPill>
      ) : (
        <StatusPill tone="danger">Out of Stock</StatusPill>
      ),
    },
    ...product.attributes.map((attr) => ({
      label: attr.name,
      value: Array.isArray(attr.values) ? attr.values.join(', ') : String(attr.values),
    })),
  ];

  return (
    <div className="min-h-screen">
      <div className="site-container px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-gray-500"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <Link href="/products" className="transition-colors hover:text-primary">
            Products
          </Link>
          {product.category?.parent && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              <Link
                href={`/categories/${product.category.parent.slug}`}
                className="transition-colors hover:text-primary"
              >
                {product.category.parent.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <Link
            href={`/categories/${product.category.slug}`}
            className="transition-colors hover:text-primary"
          >
            {product.category.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <span className="line-clamp-1 min-w-0 text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {/* ── Image Gallery tile ── */}
          <div className="bento-card self-start p-3 sm:p-4 lg:sticky lg:top-24 lg:col-span-7">
            <div className="group relative aspect-square overflow-hidden rounded-[1.5rem] bg-gray-50">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={galleryImages[selectedImage]?.alt || product.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <ShoppingCart className="h-20 w-20" />
                </div>
              )}

              {discount > 0 && (
                <span className="absolute left-4 top-4 rounded-lg bg-rose-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
                {galleryImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === selectedImage}
                    className={`aspect-square overflow-hidden rounded-[1rem] border-2 bg-gray-50 transition-all ${
                      i === selectedImage
                        ? 'border-primary shadow-brand-glow'
                        : 'border-transparent opacity-70 hover:opacity-100'
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

          {/* ── Product Info tile ── */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-5">
            <div className="bento-card p-6 sm:p-8">
              {/* Brand & SKU */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {product.brand && (
                  <Link
                    href={`/brands/${product.brand.slug}`}
                    className="pill pill-brand transition-colors hover:bg-brand-100"
                  >
                    {product.brand.name}
                  </Link>
                )}
                <span className="eyebrow">SKU · {displaySku}</span>
              </div>

              {/* Title */}
              <h1 className="mb-3 text-2xl font-black leading-tight tracking-tighter text-gray-900 sm:text-3xl">
                {product.name}
              </h1>

              {/* Rating */}
              {totalReviews > 0 && (
                <div className="mb-5 flex items-center gap-2">
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
                  <span className="text-xs font-bold text-gray-500">
                    {Number(rating).toFixed(1)}{' '}
                    <span className="text-gray-400">
                      ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="bento-tile mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
                <span className="text-3xl font-black tabular-nums tracking-tighter text-gray-900 sm:text-4xl">
                  {formatBDT(displayPrice)}
                </span>
                {product.compareAtPrice && Number(product.compareAtPrice) > displayPrice && (
                  <>
                    <span className="text-sm font-bold text-gray-400 line-through">
                      {formatBDT(Number(product.compareAtPrice))}
                    </span>
                    <span className="pill pill-danger">{discount}% Off</span>
                  </>
                )}
              </div>

              {/* Short description */}
              {product.shortDescription && (
                <p className="mb-6 text-sm font-medium leading-relaxed text-gray-600">
                  {product.shortDescription}
                </p>
              )}

              {/* Variant attribute picker */}
              {variantsActive && product.attributes.length > 0 && (
                <div className="mb-6 space-y-5">
                  {product.attributes.map((attr) => {
                    const current = selectedOptions[attr.name];
                    const values = Array.isArray(attr.values) ? attr.values : [];
                    const isColor = isColorAttribute(attr);
                    const heading = isColor ? 'Color Family' : attr.name;

                    return (
                      <div key={attr.id} className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="eyebrow">{heading}</span>
                          {current && (
                            <span className="text-xs font-black text-gray-900">{current}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {values.map((val: string) => {
                            const selected = current === val;
                            const reachable = isValueReachable(attr.name, val);
                            const inStockCombo = isValueInStock(attr.name, val);
                            const swatchUrl = isColor ? swatchImageForValue(attr.name, val) : null;
                            const title = !reachable
                              ? 'Not available with the current selection'
                              : !inStockCombo
                                ? 'Out of stock'
                                : val;

                            // Daraz-style colour swatch: image-only tile with a
                            // coloured border on the selected one.
                            if (isColor) {
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleSelectOption(attr.name, val)}
                                  disabled={!reachable}
                                  title={title}
                                  aria-label={val}
                                  aria-pressed={selected}
                                  className={`relative h-14 w-14 overflow-hidden rounded-[1rem] border-2 transition-all ${
                                    selected
                                      ? 'border-primary shadow-brand-glow'
                                      : reachable
                                        ? 'border-foreground/[0.05] hover:border-primary/60'
                                        : 'cursor-not-allowed border-gray-100'
                                  } ${!reachable || !inStockCombo ? 'opacity-50' : ''}`}
                                >
                                  {swatchUrl ? (
                                    <img
                                      src={swatchUrl}
                                      alt={val}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center bg-gray-50 px-1 text-center text-[9px] font-black uppercase text-gray-600">
                                      {val}
                                    </span>
                                  )}
                                  {!inStockCombo && reachable && (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/60 text-[9px] font-black uppercase text-gray-700">
                                      out
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            // Other attributes (Size, Material, etc.) — pill chips.
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSelectOption(attr.name, val)}
                                disabled={!reachable}
                                title={title}
                                aria-pressed={selected}
                                className={`min-w-[3rem] rounded-xl border px-4 py-2 text-xs font-black transition-all ${
                                  selected
                                    ? 'border-primary bg-primary text-white shadow-brand-glow'
                                    : reachable
                                      ? 'border-foreground/[0.06] bg-card text-gray-700 hover:border-primary/50 hover:text-gray-900'
                                      : 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
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
                    <p className="field-error mt-0">
                      This combination is not available. Try a different selection.
                    </p>
                  )}
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="mb-4 flex flex-wrap gap-3 sm:flex-nowrap">
                {/* Quantity selector */}
                <div className="flex items-center rounded-2xl border border-foreground/[0.06] bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || !inStock}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-all hover:bg-card hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <span className="w-10 text-center text-sm font-black tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(displayStock, q + 1))}
                    disabled={quantity >= displayStock || !inStock}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-all hover:bg-card hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Wishlist */}
                {(() => {
                  const inWishlist = product ? wishlist.has(product.id) : false;
                  return (
                    <button
                      type="button"
                      onClick={() => product && toggleWishlist(product.id)}
                      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      aria-pressed={inWishlist}
                      className={`btn-icon ml-auto h-12 w-12 border sm:order-last sm:ml-0 ${
                        inWishlist
                          ? 'border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100'
                          : 'border-foreground/[0.05] bg-card text-gray-600 shadow-sm hover:bg-gray-50'
                      }`}
                    >
                      <Heart
                        className={`h-5 w-5 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                    </button>
                  );
                })()}

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock || addingToCart || isUpdating}
                  className={`btn btn-lg w-full flex-1 basis-full sm:basis-auto ${
                    inStock
                      ? 'btn-primary disabled:opacity-60'
                      : 'cursor-not-allowed bg-gray-200 text-gray-500'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />
                  {!inStock ? 'Out of Stock' : addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>

              {/* Cart error */}
              {cartError && <p className="field-error mb-4">{cartError}</p>}

              {/* Stock info */}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    inStock ? (lowStock ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-rose-500'
                  } ${inStock && !lowStock ? 'animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}
                />
                {inStock ? (
                  lowStock ? (
                    <p className="text-xs font-black text-orange-600">
                      Only {displayStock} left in stock - order soon!
                    </p>
                  ) : (
                    <p className="text-xs font-black text-emerald-600">In Stock</p>
                  )
                ) : (
                  <p className="text-xs font-black text-rose-600">Out of Stock</p>
                )}
              </div>

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-foreground/[0.04] pt-5">
                  {product.tags.map((tag) => (
                    <span key={tag} className="pill pill-neutral normal-case tracking-normal">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery / trust tiles */}
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-3 sm:gap-4">
              {[
                {
                  icon: Truck,
                  tone: 'brand' as const,
                  title: 'Free Delivery',
                  text: 'On orders above ৳1,000',
                },
                {
                  icon: RotateCcw,
                  tone: 'emerald' as const,
                  title: 'Easy Returns',
                  text: '7-day return policy',
                },
                {
                  icon: Shield,
                  tone: 'blue' as const,
                  title: 'Secure Checkout',
                  text: 'SSL encrypted payment',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bento-card bento-card-hover group flex items-center gap-3 p-4 xs:flex-col xs:items-center xs:text-center"
                >
                  <IconTile
                    icon={item.icon}
                    tone={item.tone}
                    size="sm"
                    className="group-hover:scale-110"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900">{item.title}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-gray-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs: Description / Specifications / Reviews ── */}
        <div className="bento-card mt-4 p-4 sm:mt-6 sm:p-8">
          <div
            role="tablist"
            aria-label="Product information"
            className="scrollbar-none -mx-1 mb-6 flex gap-1 overflow-x-auto px-1"
          >
            {[
              { key: 'description' as const, label: 'Description' },
              { key: 'specifications' as const, label: 'Details' },
              { key: 'reviews' as const, label: `Reviews (${totalReviews})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`chip ${activeTab === tab.key ? 'chip-active' : 'bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-1 sm:px-2">
            {activeTab === 'description' && (
              <RichText html={product.description} className="text-gray-700" />
            )}

            {activeTab === 'specifications' && (
              <dl className="grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {specRows.map((row) => (
                  <div key={row.label} className="bento-tile flex flex-col gap-1 px-5 py-4">
                    <dt className="eyebrow">{row.label}</dt>
                    <dd className="text-sm font-bold text-gray-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === 'reviews' && (
              <div>
                <div>
                  {isAuthenticated ? (
                    <ReviewForm
                      productId={product.id}
                      onSubmitted={() => setReviewsRefresh((n) => n + 1)}
                    />
                  ) : (
                    <div className="bento-tile border-2 border-dashed border-gray-200 p-6 text-center">
                      <p className="text-sm font-bold text-gray-600">
                        <Link
                          href={`/login?redirect=/products/${product.slug}`}
                          className="font-black text-brand-700 hover:underline"
                        >
                          Sign in
                        </Link>{' '}
                        to write a review for this product.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <ReviewList key={reviewsRefresh} productId={product.id} />
                </div>

                {totalReviews === 0 && (
                  <EmptyState
                    bare
                    icon={Star}
                    title="No reviews yet"
                    description="Be the first to review this product!"
                    className="py-8"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Q&A — always rendered alongside the tabs so customers can ask
            or browse questions without switching into a tab. */}
        <div className="mt-4 sm:mt-6">
          <ProductQuestions productId={product.id} productSlug={product.slug} />
        </div>
      </div>
    </div>
  );
}
