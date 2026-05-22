'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import type { CartItem } from '@/lib/api/cart';

import { useCart } from '@/hooks/use-cart';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

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
// Quantity Selector (full-page variant)
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
    <div className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
      <button
        type="button"
        className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={quantity <= 1 || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity - 1)}
        aria-label="Decrease quantity"
      >
        <svg width="14" height="2" viewBox="0 0 14 2" fill="none">
          <path d="M0 1H14" stroke="currentColor" strokeWidth="2" />
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
        className="w-14 text-center text-sm font-medium focus:outline-none border-x border-gray-300 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        disabled={isUpdating}
        aria-label="Quantity"
      />

      <button
        type="button"
        className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={quantity >= maxStock || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity + 1)}
        aria-label="Increase quantity"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cart Item Row (table style)
// ──────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
}

function CartItemRow({ item }: CartItemRowProps) {
  const { removeItem, isUpdating } = useCart();
  const imageUrl = item.product.images?.[0]?.url || '/placeholder-product.png';

  return (
    <div className="flex items-center gap-6 py-6 border-b border-gray-100">
      {/* Product image */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
        <Image src={imageUrl} alt={item.product.name} fill sizes="96px" className="object-cover" />
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${item.product.slug}`}
          className="text-base font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1"
        >
          {item.product.name}
        </Link>

        <p className="mt-1 text-sm text-gray-500">SKU: {item.product.sku}</p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{formatPrice(item.price)}</span>
          {item.product.compareAtPrice && Number(item.product.compareAtPrice) > item.price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(Number(item.product.compareAtPrice))}
            </span>
          )}
        </div>

        {item.product.stock < 10 && (
          <p className="mt-1 text-xs text-orange-600">Only {item.product.stock} left in stock</p>
        )}
      </div>

      {/* Quantity */}
      <div className="flex-shrink-0">
        <QuantitySelector itemId={item.id} quantity={item.quantity} maxStock={item.product.stock} />
      </div>

      {/* Line total */}
      <div className="w-28 flex-shrink-0 text-right">
        <p className="text-base font-semibold text-gray-900">{formatPrice(item.lineTotal)}</p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
        disabled={isUpdating}
        onClick={() => removeItem(item.id)}
        aria-label={`Remove ${item.product.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Coupon Input
// ──────────────────────────────────────────────────────────

function CouponInput() {
  const { cart, applyCoupon, removeCoupon, isUpdating } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      return;
    }
    setError(null);

    try {
      await applyCoupon(code.trim());
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to apply coupon');
    }
  };

  if (cart?.couponCode) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-green-800">
            Coupon &quot;{cart.couponCode}&quot; applied
          </p>
          <p className="text-xs text-green-600 mt-0.5">You save {formatPrice(cart.discount)}</p>
        </div>

        <button
          type="button"
          className="text-sm text-green-700 hover:text-red-600 font-medium transition-colors disabled:opacity-40"
          disabled={isUpdating}
          onClick={removeCoupon}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Enter coupon code"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={!code.trim() || isUpdating}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Apply
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Order Summary Sidebar
// ──────────────────────────────────────────────────────────

function OrderSummary() {
  const { cart, isUpdating } = useCart();

  if (!cart) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-gray-50 p-6 lg:p-8 sticky top-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

      {/* Line items summary */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>
            Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-medium text-gray-900">{formatPrice(cart.subtotal)}</span>
        </div>

        {cart.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">-{formatPrice(cart.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className="text-gray-400 italic">Calculated at checkout</span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Tax</span>
          <span className="text-gray-400 italic">Calculated at checkout</span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-6 border-t border-gray-200" />

      {/* Total */}
      <div className="flex justify-between items-baseline">
        <span className="text-base font-semibold text-gray-900">Estimated Total</span>
        <span className="text-2xl font-bold text-gray-900">{formatPrice(cart.total)}</span>
      </div>

      <p className="mt-1 text-xs text-gray-400 text-right">BDT ৳ (Bangladeshi Taka)</p>

      {/* Coupon */}
      <div className="mt-6">
        <CouponInput />
      </div>

      {/* Checkout button */}
      <Link
        href="/checkout"
        className={`mt-6 block w-full rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-colors ${
          isUpdating || cart.items.length === 0
            ? 'bg-gray-300 cursor-not-allowed pointer-events-none'
            : 'bg-primary hover:bg-primary/90'
        }`}
      >
        Proceed to Checkout
      </Link>

      {/* Security badges */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>Secure checkout with SSL encryption</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Empty Cart Page
// ──────────────────────────────────────────────────────────

function EmptyCartPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300 mb-6"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>

      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        Looks like you haven&apos;t added anything to your cart yet. Browse our products and find
        something you love!
      </p>

      <Link
        href="/"
        className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
      >
        Start Shopping
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cart Page
// ──────────────────────────────────────────────────────────

export default function CartPage() {
  const { cart, isLoading, clearCart, isUpdating } = useCart();

  if (isLoading) {
    return (
      <div className="site-container px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="site-container px-4 sm:px-6 lg:px-8 py-12">
        <EmptyCartPage />
      </div>
    );
  }

  return (
    <div className="site-container px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="mt-1 text-sm text-gray-500">
            {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          disabled={isUpdating}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-40"
        >
          Clear Cart
        </button>
      </div>

      {/* Main content: items + sidebar */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Cart items */}
        <div className="lg:col-span-8">
          {/* Table header (desktop) */}
          <div className="hidden lg:flex items-center gap-6 pb-4 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex-1 pl-[120px]">Product</div>
            <div className="w-32">Quantity</div>
            <div className="w-28 text-right">Total</div>
            <div className="w-10" /> {/* Remove button column */}
          </div>

          {/* Items list */}
          <div>
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          {/* Continue shopping */}
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-teal-800 transition-colors"
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
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="mt-10 lg:mt-0 lg:col-span-4">
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
