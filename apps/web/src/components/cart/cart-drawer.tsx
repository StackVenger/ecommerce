'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';

import type { CartItem } from '@/lib/api/cart';

import { useCart } from '@/hooks/use-cart';

/**
 * Format price in BDT (Bangladeshi Taka).
 */
function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ──────────────────────────────────────────────────────────
// Quantity Selector
// ──────────────────────────────────────────────────────────

interface QuantitySelectorProps {
  itemId: string;
  quantity: number;
  maxStock: number;
}

function QuantitySelector({ itemId, quantity, maxStock }: QuantitySelectorProps) {
  const { updateItemQuantity, isUpdating } = useCart();

  return (
    <div className="flex items-center rounded-xl bg-gray-100 p-1">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-card hover:text-gray-900 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity <= 1 || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity - 1)}
        aria-label="Decrease quantity"
      >
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
          <path d="M0 1H12" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      <span className="min-w-[2rem] text-center text-sm font-black tabular-nums">{quantity}</span>

      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-card hover:text-gray-900 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity >= maxStock || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity + 1)}
        aria-label="Increase quantity"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 0V12M0 6H12" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cart Item Row
// ──────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
}

function CartItemRow({ item }: CartItemRowProps) {
  const { removeItem, isUpdating } = useCart();
  const imageUrl = item.product.images?.[0]?.url || '/placeholder-product.png';

  return (
    <div className="group flex gap-4 border-b border-dashed border-foreground/[0.06] py-5 last:border-0">
      {/* Product image */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50">
        <Image
          src={imageUrl}
          alt={item.product.name}
          fill
          sizes="80px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Product details */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link
            href={`/products/${item.product.slug}`}
            className="line-clamp-2 text-sm font-bold text-gray-900 transition-colors hover:text-primary"
          >
            {item.product.name}
          </Link>

          {item.variant && Object.keys(item.variant.options).length > 0 && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {Object.entries(item.variant.options)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}

          <p className="mt-1 text-xs font-black text-primary">{formatPrice(item.price)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <QuantitySelector
            itemId={item.id}
            quantity={item.quantity}
            maxStock={item.variant ? item.variant.quantity : item.product.stock}
          />

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
            disabled={isUpdating}
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.product.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="flex-shrink-0 text-sm font-black tabular-nums tracking-tight text-gray-900">
        {formatPrice(item.lineTotal)}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Empty Cart State
// ──────────────────────────────────────────────────────────

function EmptyCartState() {
  const { closeCart } = useCart();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-6 text-brand-500"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>

      <h3 className="mb-1 text-lg font-black tracking-tight text-gray-900">Your cart is empty</h3>
      <p className="mb-6 text-sm font-medium text-gray-500">
        Looks like you haven&apos;t added anything to your cart yet.
      </p>

      <button type="button" onClick={closeCart} className="btn btn-primary">
        Continue Shopping
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cart Drawer (slide-over from right)
// ──────────────────────────────────────────────────────────

/**
 * Cart drawer component that slides in from the right side.
 *
 * Displays all cart items with quantity selectors, subtotal,
 * and a checkout button. Supports optimistic updates for
 * a snappy user experience.
 */
export function CartDrawer() {
  const { cart, isOpen, closeCart, isLoading, itemCount } = useCart();

  return (
    <Fragment>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-2xl transition-[transform,visibility] sm:inset-y-3 sm:right-3 sm:rounded-[2rem] duration-300 ease-in-out ${
          isOpen ? 'visible translate-x-0' : 'invisible translate-x-[calc(100%+1.5rem)]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-gray-900">
            Shopping Cart
            {itemCount > 0 && (
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>

          <button
            type="button"
            className="btn-icon h-10 w-10 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-100 border-t-primary" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <EmptyCartState />
        ) : (
          <Fragment>
            {/* Items list (scrollable) */}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-6">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>

            {/* Footer with subtotal and checkout */}
            <div className="space-y-4 border-t-2 border-dashed border-foreground/[0.06] px-6 pb-6 pt-5">
              {/* Coupon badge */}
              {cart.couponCode && (
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm">
                  <span className="font-medium text-emerald-700">
                    Coupon <strong>{cart.couponCode}</strong> applied
                  </span>
                  <span className="font-black text-emerald-700">-{formatPrice(cart.discount)}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-black tabular-nums text-gray-900">
                    {formatPrice(cart.subtotal)}
                  </span>
                </div>

                {cart.discount > 0 && (
                  <div className="flex items-center justify-between text-sm font-bold text-emerald-600">
                    <span>Discount</span>
                    <span>-{formatPrice(cart.discount)}</span>
                  </div>
                )}

                <div className="!mt-4 flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 p-4">
                  <span className="text-sm font-bold text-brand-700">Total</span>
                  <span className="text-2xl font-black tabular-nums tracking-tighter text-brand-700">
                    {formatPrice(cart.total)}
                  </span>
                </div>
              </div>

              {/* Shipping notice */}
              <p className="text-center text-xs font-medium text-gray-400">
                Shipping and taxes calculated at checkout
              </p>

              {/* Checkout button */}
              <Link
                href="/checkout"
                onClick={closeCart}
                className="btn btn-primary btn-lg w-full uppercase tracking-widest"
              >
                Proceed to Checkout
              </Link>

              {/* Continue shopping link */}
              <button
                type="button"
                onClick={closeCart}
                className="block w-full text-center text-sm font-bold text-gray-500 transition-colors hover:text-gray-900"
              >
                or Continue Shopping
              </button>
            </div>
          </Fragment>
        )}
      </div>
    </Fragment>
  );
}
