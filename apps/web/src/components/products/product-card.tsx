'use client';

import { Check, Heart, Package, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Product card (watch theme)
//
// Presentational only — every page keeps its own data mapping, price /
// discount maths and cart / wishlist handlers and passes the results in.
// The title link is "stretched" over the whole card (after:inset-0) so
// the card stays fully clickable while the wishlist and add-to-cart
// buttons sit above it as real sibling buttons (no <button> inside <a>).
// ──────────────────────────────────────────────────────────

export interface ProductCardBadge {
  label: string;
  tone?: 'sale' | 'new' | 'featured';
}

interface ProductCardProps {
  href: string;
  name: string;
  image?: string | null;
  brand?: string | null;
  /** Short copy shown only in the list layout. */
  description?: string | null;
  /** Average rating; omit to hide the rating row. */
  rating?: number | null;
  reviewCount?: number;
  /** Price the customer pays. */
  price: number;
  /** Struck-through reference price (shown only when greater than `price`). */
  originalPrice?: number | null;
  formatPrice?: (value: number) => string;
  badges?: ProductCardBadge[];
  /** Shows a "Sold out" veil over the image and swaps the cart button for a pill. */
  outOfStock?: boolean;
  /** Omit to render a browse-only card with no cart button. */
  onAddToCart?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  addDisabled?: boolean;
  /** The product is already in the cart: button disables and shows a check ("Added to cart"). */
  inCart?: boolean;
  /** Omit `onToggleWishlist` to hide the heart. */
  wishlisted?: boolean;
  onToggleWishlist?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  layout?: 'grid' | 'list';
  /** Compact sizing for dense rails (chat widget, sidebars). */
  size?: 'default' | 'compact';
  className?: string;
}

const BADGE_TONES: Record<NonNullable<ProductCardBadge['tone']>, string> = {
  sale: 'bg-primary',
  new: 'bg-ink',
  featured: 'bg-amber-500',
};

const defaultFormat = (value: number) => `৳${value.toLocaleString('en-BD')}`;

export function ProductCard({
  href,
  name,
  image,
  brand,
  description,
  rating,
  reviewCount,
  price,
  originalPrice,
  formatPrice = defaultFormat,
  badges = [],
  outOfStock = false,
  onAddToCart,
  addDisabled = false,
  inCart = false,
  wishlisted = false,
  onToggleWishlist,
  layout = 'grid',
  size = 'default',
  className,
}: ProductCardProps) {
  const isList = layout === 'list';
  const compact = size === 'compact';
  const showOriginal =
    originalPrice !== null && originalPrice !== undefined && originalPrice > price;
  // Dead image URLs fall back to the placeholder instead of alt text.
  const [imageFailed, setImageFailed] = useState(false);

  // Watch-theme card: #f7f7f7 image well, square coral sale tag, white
  // info strip with a hairline border, coral price, cart glyph on the right.
  const media = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-gray-50',
        isList ? 'aspect-square w-32 sm:w-52' : compact ? 'h-28 w-full' : 'aspect-square w-full',
      )}
    >
      {image && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="product-card-image h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-300">
          <Package className={compact ? 'h-8 w-8' : 'h-12 w-12'} strokeWidth={1.25} />
        </div>
      )}

      {badges.length > 0 && (
        <div
          className={cn(
            'pointer-events-none absolute z-10 flex flex-col items-start gap-1',
            compact ? 'left-2 top-2' : 'left-2.5 top-2.5 sm:left-3 sm:top-3',
          )}
        >
          {badges.map((b) => (
            <span
              key={b.label}
              className={cn(
                'px-2.5 py-1 font-semibold text-white',
                compact ? 'text-[10px]' : 'text-xs',
                BADGE_TONES[b.tone ?? 'sale'],
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      {outOfStock && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-ink/80 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-white">
          Sold out
        </div>
      )}
    </div>
  );

  const priceBlock = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
      <span
        className={cn(
          'font-bold tabular-nums text-primary',
          compact ? 'text-sm' : isList ? 'text-lg' : 'text-base',
        )}
      >
        {formatPrice(price)}
      </span>
      {showOriginal && (
        <span className="text-[13px] font-light tabular-nums text-gray-500 line-through">
          {formatPrice(originalPrice)}
        </span>
      )}
    </div>
  );

  const cartControl = onAddToCart ? (
    outOfStock ? (
      <span className="relative z-10 shrink-0 text-xs font-medium text-gray-500">Sold out</span>
    ) : isList ? (
      <button
        type="button"
        onClick={onAddToCart}
        disabled={addDisabled || inCart}
        aria-label={inCart ? `${name} is in your cart` : `Add ${name} to cart`}
        title={inCart ? 'Added to cart' : 'Add to cart'}
        className={cn('btn btn-sm relative z-10', inCart ? 'btn-secondary' : 'btn-outline')}
      >
        {inCart ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
        )}
        {inCart ? 'Added to cart' : 'Add to cart'}
      </button>
    ) : (
      <button
        type="button"
        onClick={onAddToCart}
        disabled={addDisabled || inCart}
        aria-label={inCart ? `${name} is in your cart` : `Add ${name} to cart`}
        title={inCart ? 'Added to cart' : 'Add to cart'}
        className={cn(
          'relative z-10 -mr-1.5 flex shrink-0 items-center justify-center transition-colors',
          compact ? 'h-7 w-7' : 'h-9 w-9',
          inCart
            ? 'cursor-not-allowed text-emerald-600'
            : 'text-gray-900 hover:text-primary disabled:opacity-50',
        )}
      >
        {inCart ? (
          <Check className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={2.5} />
        ) : (
          <ShoppingCart className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.75} />
        )}
      </button>
    )
  ) : null;

  return (
    <div
      className={cn(
        'product-card group relative flex',
        isList ? 'flex-row gap-4 p-3 sm:gap-7 sm:p-4' : 'flex-col border-0 bg-transparent',
        className,
      )}
    >
      {media}

      {onToggleWishlist && (
        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={wishlisted ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          aria-pressed={wishlisted}
          className={cn(
            'absolute z-20 flex h-9 w-9 items-center justify-center bg-card shadow-sm transition-all duration-300 hover:text-primary',
            isList ? 'left-5 top-5 sm:left-6 sm:top-6' : 'right-2.5 top-2.5 sm:right-3 sm:top-3',
            wishlisted
              ? 'opacity-100'
              : 'opacity-100 [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:translate-y-0 [@media(hover:hover)]:focus-visible:opacity-100',
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              wishlisted ? 'fill-primary text-primary' : 'text-gray-700',
            )}
            strokeWidth={1.75}
          />
        </button>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          isList
            ? 'justify-between py-1'
            : cn(
                'border border-t-0 border-gray-200 bg-card',
                compact ? 'px-3 py-2.5' : 'px-3.5 py-3.5 sm:px-4',
              ),
        )}
      >
        <div className="min-w-0">
          {brand && !compact && (
            <p className="mb-1 truncate text-[11px] uppercase tracking-wide text-gray-500">
              {brand}
            </p>
          )}
          <Link
            href={href}
            className={cn(
              'line-clamp-2 font-heading leading-snug text-gray-900 transition-colors after:absolute after:inset-0 after:z-0 hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/40',
              compact ? 'text-xs' : isList ? 'text-lg font-medium' : 'text-sm sm:text-[15px]',
            )}
          >
            {name}
          </Link>
          {isList && description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">{description}</p>
          )}
          {rating !== null && rating !== undefined && rating > 0 && (
            <div
              className="mt-1.5 flex items-center gap-1"
              aria-label={`Rated ${rating.toFixed(1)} out of 5`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3 w-3',
                    i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
                  )}
                />
              ))}
              {reviewCount !== undefined && (
                <span className="ml-0.5 text-[11px] text-gray-500">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            'mt-auto flex items-center justify-between gap-2',
            compact ? 'pt-1.5' : 'pt-2',
            isList && 'flex-wrap pt-4',
          )}
        >
          {priceBlock}
          {cartControl}
        </div>
      </div>
    </div>
  );
}

/** Matching skeleton for loading grids. */
export function ProductCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  if (layout === 'list') {
    return (
      <div className="flex animate-pulse gap-4 border border-gray-200 bg-card p-4">
        <div className="aspect-square w-32 shrink-0 bg-gray-100 sm:w-52" />
        <div className="flex flex-1 flex-col gap-3 py-2">
          <div className="h-3 w-16 bg-gray-100" />
          <div className="h-4 w-3/4 bg-gray-100" />
          <div className="h-3 w-1/2 bg-gray-100" />
          <div className="mt-auto h-6 w-24 bg-gray-100" />
        </div>
      </div>
    );
  }
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="space-y-2.5 border border-t-0 border-gray-200 p-4">
        <div className="h-3.5 w-3/4 bg-gray-100" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-gray-100" />
          <div className="h-5 w-5 bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

/** Responsive product grid wrapper shared by listing pages. */
export function ProductGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  /** Max columns at the widest breakpoint. */
  columns?: 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 md:grid-cols-3',
        columns === 4 ? 'lg:grid-cols-4' : 'xl:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
