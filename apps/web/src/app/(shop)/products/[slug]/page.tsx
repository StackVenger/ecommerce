'use client';

import {
  Check,
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
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ProductQuestions } from '@/components/products/product-questions';
import { ReviewForm } from '@/components/reviews/review-form';
import { ReviewList } from '@/components/reviews/review-list';
import { Breadcrumbs, EmptyState, StatusPill } from '@/components/ui/bento';
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
  compareAtPrice: number | null;
  quantity: number;
  lowStockThreshold: number;
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
  inventory?: { lowStockThreshold: number } | null;
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
  const { cart, addItem, isUpdating } = useCart();
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

  const router = useRouter();

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
                compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                quantity: v.quantity ?? 0,
                lowStockThreshold: v.lowStockThreshold ?? 10,
              }))
            : [],
          inventory: raw.inventory
            ? { lowStockThreshold: raw.inventory.lowStockThreshold ?? 10 }
            : null,
        };
        setProduct(normalised);

        // Pre-select the default variant options on load
        if (normalised.variants.length > 0) {
          const defaultVar =
            normalised.variants.find((v) => v.isDefault === true) ?? normalised.variants[0] ?? null;
          if (defaultVar) {
            const initialOpts: Record<string, string> = {};
            for (const av of defaultVar.attributeValues) {
              initialOpts[av.attribute.name] = av.value;
            }
            setSelectedOptions(initialOpts);
          }
        }
      } catch {
        // Slug 404: try resolving it as a historical slug alias and
        // 301-style redirect to the canonical slug before giving up.
        try {
          const { data: aliasData } = await apiClient.get(`/products/slug-alias/${slug}`);
          const alias = aliasData.data ?? aliasData;
          if (alias?.slug && alias.slug !== slug) {
            router.replace(`/products/${alias.slug}`);
            return;
          }
        } catch {
          // No alias either — fall through to the standard not-found state.
        }
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      fetchProduct();
    }
  }, [slug, router]);

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

  const isAlreadyInCart = useMemo(() => {
    if (!cart || !product) {
      return false;
    }
    if (variantsActive) {
      if (!selectedVariant) {
        return cart.items.some((item) => item.productId === product.id && !item.variantId);
      }
      return cart.items.some(
        (item) =>
          item.productId === product.id &&
          (item.variantId === selectedVariant.id || !item.variantId),
      );
    }
    return cart.items.some((item) => item.productId === product.id && !item.variantId);
  }, [cart, product, variantsActive, selectedVariant]);

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
        toast.error('Please select all options before adding to cart.');
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
      await addItem(
        {
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity,
        },
        { openDrawer: false },
      );
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
      <div className="min-h-screen">
        <div className="breadcrumb-bar">
          <div className="site-container px-4 py-3 sm:px-6 lg:px-8">
            <div className="h-4 w-48 animate-pulse bg-gray-100" />
          </div>
        </div>
        <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="aspect-square animate-pulse bg-gray-100" />
              <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="aspect-square animate-pulse bg-gray-100" />
                ))}
              </div>
            </div>
            <div className="space-y-4 border border-gray-200 p-5 sm:p-6 lg:col-span-6">
              <div className="h-7 w-3/4 animate-pulse bg-gray-100" />
              <div className="h-8 w-32 animate-pulse bg-gray-100" />
              <div className="h-16 w-48 animate-pulse bg-gray-100" />
              <div className="h-20 w-full animate-pulse bg-gray-100" />
              <div className="h-[3.125rem] w-full animate-pulse bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !product) {
    return (
      <div className="site-container px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
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
  // base product otherwise.
  const displayPrice = effectiveVariant ? Number(effectiveVariant.price) : product.price;
  const displayCompareAtPrice = effectiveVariant
    ? effectiveVariant.compareAtPrice !== undefined && effectiveVariant.compareAtPrice !== null
      ? Number(effectiveVariant.compareAtPrice)
      : null
    : product.compareAtPrice;
  const displayStock = selectedVariant ? selectedVariant.quantity : product.quantity;
  const displaySku = effectiveVariant?.sku ?? product.sku;

  const discount =
    displayCompareAtPrice && displayCompareAtPrice > displayPrice
      ? Math.round((1 - displayPrice / Number(displayCompareAtPrice)) * 100)
      : 0;

  const inStock = variantsActive
    ? selectedVariant
      ? selectedVariant.quantity > 0
      : product.variants.some((v) => v.quantity > 0)
    : product.quantity > 0;
  // Use per-variant threshold when a variant is selected; per-product
  // Inventory.lowStockThreshold (default 10) for non-variant products.
  // When variants exist but none is selected, "low" means any single
  // variant is at/below its own threshold.
  const lowStock =
    inStock &&
    (variantsActive
      ? selectedVariant
        ? selectedVariant.quantity <= selectedVariant.lowStockThreshold
        : product.variants.some((v) => v.quantity > 0 && v.quantity <= v.lowStockThreshold)
      : product.quantity <= (product.inventory?.lowStockThreshold ?? 10));

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

  const inWishlist = wishlist.has(product.id);

  return (
    <div className="min-h-screen">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          ...(product.category?.parent
            ? [
                {
                  label: product.category.parent.name,
                  href: `/categories/${product.category.parent.slug}`,
                },
              ]
            : []),
          { label: product.category.name, href: `/categories/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ── Image Gallery ── */}
          <div className="min-w-0 self-start lg:sticky lg:top-24 lg:col-span-6">
            <div className="relative aspect-square overflow-hidden bg-gray-50">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={galleryImages[selectedImage]?.alt || product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <ShoppingCart className="h-20 w-20" strokeWidth={1.25} />
                </div>
              )}

              {discount > 0 && <span className="sale-tag absolute left-3 top-3">-{discount}%</span>}
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
                {galleryImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === selectedImage}
                    className={`aspect-square overflow-hidden border bg-gray-50 transition-colors ${
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

          {/* ── Product Info panel ── */}
          <div className="min-w-0 self-start border border-gray-200 bg-card p-5 sm:p-6 lg:col-span-6">
            {/* Title */}
            <h1 className="font-sans text-2xl font-normal leading-snug text-gray-900">
              {product.name}
            </h1>

            {/* Rating */}
            {totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
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
                <span className="text-[13px] text-gray-500">
                  {Number(rating).toFixed(1)}{' '}
                  <span className="text-gray-400">
                    ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </span>
              </div>
            )}

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[1.75rem] font-bold leading-none tabular-nums text-primary">
                {formatBDT(displayPrice)}
              </span>
              {displayCompareAtPrice && Number(displayCompareAtPrice) > displayPrice && (
                <>
                  <span className="text-lg font-light tabular-nums text-gray-500 line-through">
                    {formatBDT(Number(displayCompareAtPrice))}
                  </span>
                  <span className="sale-tag">{discount}% Off</span>
                </>
              )}
            </div>

            {/* Meta lines */}
            <dl className="mt-5 space-y-1.5 text-[13px]">
              {product.brand && (
                <div className="flex flex-wrap gap-1">
                  <dt className="text-gray-500">Brand:</dt>
                  <dd>
                    <Link
                      href={`/brands/${product.brand.slug}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {product.brand.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <dt className="text-gray-500">SKU:</dt>
                <dd className="break-all text-primary">{displaySku}</dd>
              </div>
              <div className="flex flex-wrap gap-1">
                <dt className="text-gray-500">Category:</dt>
                <dd>
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="text-primary hover:underline"
                  >
                    {product.category.name}
                  </Link>
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <dt className="text-gray-500">Availability:</dt>
                <dd>
                  {inStock ? (
                    lowStock ? (
                      <span className="font-medium text-orange-600">
                        Only {displayStock} left in stock - order soon!
                      </span>
                    ) : (
                      <span className="text-primary">In Stock</span>
                    )
                  ) : (
                    <span className="font-medium text-rose-600">Out of Stock</span>
                  )}
                </dd>
              </div>
            </dl>

            {/* Short description */}
            {product.shortDescription && (
              <p className="mt-5 border-t border-gray-200 pt-5 text-sm leading-relaxed text-gray-600">
                {product.shortDescription}
              </p>
            )}

            {/* Variant attribute picker */}
            {variantsActive && product.attributes.length > 0 && (
              <div className="mt-5 space-y-4 border-t border-gray-200 pt-5">
                {product.attributes.map((attr) => {
                  const current = selectedOptions[attr.name];
                  const values = Array.isArray(attr.values) ? attr.values : [];
                  const isColor = isColorAttribute(attr);
                  const heading = isColor ? 'Color Family' : attr.name;

                  return (
                    <div key={attr.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-500">{heading}:</span>
                        {current && <span className="font-medium text-gray-900">{current}</span>}
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
                                className={`relative h-14 w-14 overflow-hidden border-2 bg-gray-50 transition-colors ${
                                  selected
                                    ? 'border-primary'
                                    : reachable
                                      ? 'border-gray-200 hover:border-gray-400'
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
                                  <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-gray-600">
                                    {val}
                                  </span>
                                )}
                                {!inStockCombo && reachable && (
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/60 text-[10px] font-medium uppercase text-gray-700">
                                    out
                                  </span>
                                )}
                              </button>
                            );
                          }

                          // Other attributes (Size, Material, etc.) — square option boxes.
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelectOption(attr.name, val)}
                              disabled={!reachable}
                              title={title}
                              aria-pressed={selected}
                              className={`h-10 min-w-[2.75rem] border px-3 text-sm transition-colors ${
                                selected
                                  ? 'border-primary font-medium text-primary'
                                  : reachable
                                    ? 'border-gray-200 bg-card text-gray-700 hover:border-gray-400 hover:text-gray-900'
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
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 sm:flex-nowrap">
              <div className="flex h-[3.125rem] shrink-0 items-stretch border border-gray-300">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !inStock}
                  aria-label="Decrease quantity"
                  className="flex w-10 items-center justify-center text-gray-600 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex w-12 items-center justify-center border-x border-gray-200 text-base tabular-nums text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(displayStock, q + 1))}
                  disabled={quantity >= displayStock || !inStock}
                  aria-label="Increase quantity"
                  className="flex w-10 items-center justify-center text-gray-600 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart || isUpdating || isAlreadyInCart}
                className={`btn btn-lg min-w-0 flex-1 ${
                  !inStock
                    ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                    : isAlreadyInCart
                      ? 'btn-outline cursor-not-allowed disabled:opacity-100'
                      : 'btn-primary disabled:opacity-60'
                }`}
              >
                {isAlreadyInCart ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                {!inStock
                  ? 'Out of Stock'
                  : isAlreadyInCart
                    ? 'Added to Cart'
                    : addingToCart
                      ? 'Adding...'
                      : 'Add to Cart'}
              </button>
            </div>

            {/* Cart error */}
            {cartError && <p className="field-error mt-3">{cartError}</p>}

            {/* Wishlist */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gray-600">
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={inWishlist}
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${
                  inWishlist ? 'text-primary' : ''
                }`}
              >
                <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
                <span>{inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</span>
              </button>
            </div>

            {/* Delivery / trust row */}
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-200 pt-5 xs:grid-cols-3">
              {[
                { icon: Truck, title: 'Free Delivery', text: 'On orders above ৳1,000' },
                { icon: RotateCcw, title: 'Easy Returns', text: '7-day return policy' },
                { icon: Shield, title: 'Secure Checkout', text: 'SSL encrypted payment' },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <item.icon className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.25} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-200 pt-5 text-[13px] text-gray-500">
                {product.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs: Description / Specifications / Reviews ── */}
        <div className="mt-12 sm:mt-16">
          <div
            role="tablist"
            aria-label="Product information"
            className="scrollbar-none flex justify-start gap-6 overflow-x-auto border-b border-gray-200 sm:justify-center sm:gap-10"
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
                className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 font-heading text-base font-semibold transition-colors sm:text-lg ${
                  activeTab === tab.key
                    ? 'border-primary text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <RichText html={product.description} className="text-gray-600" />
            )}

            {activeTab === 'specifications' && (
              <dl className="mx-auto max-w-3xl divide-y divide-gray-200 border border-gray-200 text-sm">
                {specRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[12rem_1fr]"
                  >
                    <dt className="bg-gray-50 px-4 py-3 text-gray-600">{row.label}</dt>
                    <dd className="min-w-0 break-words px-4 py-3 text-gray-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === 'reviews' && (
              <div className="mx-auto max-w-4xl">
                <div>
                  {isAuthenticated ? (
                    <ReviewForm
                      productId={product.id}
                      onSubmitted={() => setReviewsRefresh((n) => n + 1)}
                    />
                  ) : (
                    <div className="border border-dashed border-gray-300 p-6 text-center">
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
        <div className="mt-4">
          <ProductQuestions productId={product.id} productSlug={product.slug} />
        </div>
      </div>
    </div>
  );
}
