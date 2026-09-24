'use client';

import { Heart, Package, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Bento product card
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
  /** Omit `onToggleWishlist` to hide the heart. */
  wishlisted?: boolean;
  onToggleWishlist?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  layout?: 'grid' | 'list';
  /** Compact sizing for dense rails (chat widget, sidebars). */
  size?: 'default' | 'compact';
  className?: string;
}

const BADGE_TONES: Record<NonNullable<ProductCardBadge['tone']>, string> = {
  sale: 'bg-rose-500',
  new: 'bg-emerald-500',
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

  const media = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-gray-50',
        isList
          ? 'h-32 w-32 rounded-[1.25rem] sm:h-40 sm:w-40'
          : compact
            ? 'h-28 w-full'
            : 'aspect-square w-full',
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
          <Package className={compact ? 'h-8 w-8' : 'h-12 w-12'} strokeWidth={1.75} />
        </div>
      )}

      {badges.length > 0 && (
        <div
          className={cn(
            'pointer-events-none absolute z-10 flex flex-col items-start gap-1.5',
            compact ? 'left-2 top-2' : 'left-3 top-3 sm:left-4 sm:top-4',
          )}
        >
          {badges.map((b) => (
            <span
              key={b.label}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm',
                BADGE_TONES[b.tone ?? 'sale'],
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      {outOfStock && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-xl bg-ink/85 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
          Sold out
        </div>
      )}
    </div>
  );

  const priceBlock = (
    <div className="flex min-w-0 flex-col">
      <span
        className={cn(
          'font-black tabular-nums tracking-tighter text-gray-900',
          compact ? 'text-sm' : 'text-lg',
        )}
      >
        {formatPrice(price)}
      </span>
      {showOriginal && (
        <span className="text-[10px] font-bold tabular-nums text-gray-400 line-through sm:text-[11px]">
          {formatPrice(originalPrice)}
        </span>
      )}
    </div>
  );

  const cartControl = onAddToCart ? (
    outOfStock ? (
      <span className="pill pill-danger relative z-10 shrink-0">Out of stock</span>
    ) : (
      <button
        type="button"
        onClick={onAddToCart}
        disabled={addDisabled}
        aria-label={`Add ${name} to cart`}
        title="Add to cart"
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-95 disabled:opacity-50',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          isList && 'w-auto gap-2 px-4 text-xs font-black',
        )}
      >
        <ShoppingCart className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.5} />
        {isList && <span>Add to cart</span>}
      </button>
    )
  ) : null;

  return (
    <div
      className={cn(
        'product-card group relative flex',
        isList ? 'flex-row gap-4 p-3 sm:gap-6 sm:p-4' : 'flex-col',
        compact && 'rounded-[1.25rem]',
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
            'absolute z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/[0.04] bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-card',
            isList ? 'left-5 top-5 sm:left-6 sm:top-6' : 'right-3 top-3 sm:right-4 sm:top-4',
            wishlisted
              ? 'opacity-100'
              : 'opacity-100 [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:translate-y-0 [@media(hover:hover)]:focus-visible:opacity-100',
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              wishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-500 hover:text-rose-500',
            )}
            strokeWidth={2.25}
          />
        </button>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          isList ? 'justify-between py-1' : compact ? 'p-3' : 'p-4 sm:p-5',
        )}
      >
        <div className="min-w-0">
          {brand && !compact && (
            <p className="mb-1 truncate text-[10px] font-black uppercase tracking-widest text-brand-600">
              {brand}
            </p>
          )}
          <Link
            href={href}
            className={cn(
              'line-clamp-2 font-bold leading-snug text-gray-900 transition-colors after:absolute after:inset-0 after:z-0 group-hover:text-primary focus-visible:outline-none focus-visible:after:rounded-[1.75rem] focus-visible:after:ring-4 focus-visible:after:ring-brand-500/25',
              compact ? 'text-xs' : isList ? 'text-base' : 'text-sm',
            )}
          >
            {name}
          </Link>
          {isList && description && (
            <p className="mt-1.5 line-clamp-2 text-sm font-medium text-gray-500">{description}</p>
          )}
          {rating !== null && rating !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-gray-500">
                {rating.toFixed(1)}
                {reviewCount !== undefined && (
                  <span className="text-gray-400"> ({reviewCount})</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'mt-auto flex flex-wrap items-end justify-between gap-2',
            compact ? 'pt-2' : 'pt-3',
            isList && 'pt-4',
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
      <div className="flex animate-pulse gap-4 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-4">
        <div className="h-32 w-32 shrink-0 rounded-[1.25rem] bg-gray-100 sm:h-40 sm:w-40" />
        <div className="flex flex-1 flex-col gap-3 py-2">
          <div className="h-3 w-16 rounded-full bg-gray-100" />
          <div className="h-4 w-3/4 rounded-full bg-gray-100" />
          <div className="h-3 w-1/2 rounded-full bg-gray-100" />
          <div className="mt-auto h-6 w-24 rounded-full bg-gray-100" />
        </div>
      </div>
    );
  }
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.75rem] border border-foreground/[0.04] bg-card">
      <div className="aspect-square bg-gray-100" />
      <div className="space-y-2.5 p-4 sm:p-5">
        <div className="h-2.5 w-14 rounded-full bg-gray-100" />
        <div className="h-3.5 w-full rounded-full bg-gray-100" />
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="flex items-end justify-between pt-2">
          <div className="h-5 w-16 rounded-full bg-gray-100" />
          <div className="h-10 w-10 rounded-xl bg-gray-100" />
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
        'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3',
        columns === 4 ? 'lg:grid-cols-4' : 'xl:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
