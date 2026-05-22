'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';

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
  const [inputValue, setInputValue] = useState<string>(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= maxStock) {
      updateItemQuantity(itemId, parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      updateItemQuantity(itemId, 1);
      setInputValue('1');
    } else if (parsed > maxStock) {
      updateItemQuantity(itemId, maxStock);
      setInputValue(maxStock.toString());
    } else {
      setInputValue(parsed.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
      <button
        type="button"
        className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={quantity <= 1 || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity - 1)}
        aria-label="Decrease quantity"
      >
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
          <path d="M0 1H12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <input
        type="number"
        min={1}
        max={maxStock}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-12 text-center text-sm font-medium focus:outline-none border-x border-gray-100 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        disabled={isUpdating}
        aria-label="Quantity"
      />

      <button
        type="button"
        className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={quantity >= maxStock || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity + 1)}
        aria-label="Increase quantity"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 0V12M0 6H12" stroke="currentColor" strokeWidth="1.5" />
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
    <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
      {/* Product image */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <Image src={imageUrl} alt={item.product.name} fill sizes="80px" className="object-cover" />
      </div>

      {/* Product details */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link
            href={`/products/${item.product.slug}`}
            className="text-sm font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2"
          >
            {item.product.name}
          </Link>

          {item.variant && Object.keys(item.variant.options).length > 0 && (
            <p className="mt-0.5 text-xs text-gray-500">
              {Object.entries(item.variant.options)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}

          <p className="mt-0.5 text-sm text-gray-500">{formatPrice(item.price)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <QuantitySelector
            itemId={item.id}
            quantity={item.quantity}
            maxStock={item.variant ? item.variant.quantity : item.product.stock}
          />

          <button
            type="button"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
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
      <div className="flex-shrink-0 text-sm font-semibold text-gray-900">
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
        className="text-gray-300 mb-4"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>

      <h3 className="text-lg font-medium text-gray-900 mb-1">Your cart is empty</h3>
      <p className="text-sm text-gray-500 mb-6">
        Looks like you haven&apos;t added anything to your cart yet.
      </p>

      <button
        type="button"
        onClick={closeCart}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
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
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Shopping Cart
            {itemCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <EmptyCartState />
        ) : (
          <Fragment>
            {/* Items list (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>

            {/* Footer with subtotal and checkout */}
            <div className="border-t border-gray-200 px-6 py-4 space-y-4">
              {/* Coupon badge */}
              {cart.couponCode && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                  <span className="text-green-700">
                    Coupon <strong>{cart.couponCode}</strong> applied
                  </span>
                  <span className="font-medium text-green-700">-{formatPrice(cart.discount)}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>

                {cart.discount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(cart.discount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>

              {/* Shipping notice */}
              <p className="text-xs text-gray-400 text-center">
                Shipping and taxes calculated at checkout
              </p>

              {/* Checkout button */}
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Proceed to Checkout
              </Link>

              {/* Continue shopping link */}
              <button
                type="button"
                onClick={closeCart}
                className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
