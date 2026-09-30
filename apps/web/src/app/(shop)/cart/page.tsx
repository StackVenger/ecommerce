'use client';

import { ArrowLeft, Lock, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import type { CartItem } from '@/lib/api/cart';

import { Breadcrumbs, LoadingState, PageHeader } from '@/components/ui/bento';
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
  const { updateItemQuantity, isUpdating, setTempQuantity } = useCart();
  const [inputValue, setInputValue] = useState<string>(quantity.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [initialQuantity, setInitialQuantity] = useState<number>(quantity);

  // Sync local input value with external quantity changes ONLY if the user is not actively typing
  useEffect(() => {
    if (!isFocused) {
      setInputValue(quantity.toString());
    }
  }, [quantity, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const clamped = Math.min(parsed, maxStock);
      setTempQuantity(itemId, clamped);
    } else {
      setTempQuantity(itemId, 0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Final validation and clamp on blur
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      if (initialQuantity !== 1) {
        updateItemQuantity(itemId, 1);
      }
      setInputValue('1');
    } else if (parsed > maxStock) {
      if (initialQuantity !== maxStock) {
        updateItemQuantity(itemId, maxStock);
      }
      setInputValue(maxStock.toString());
    } else {
      if (initialQuantity !== parsed) {
        updateItemQuantity(itemId, parsed);
      }
      setInputValue(parsed.toString());
    }
    setTempQuantity(itemId, null);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInitialQuantity(quantity);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="inline-flex h-10 items-center border border-gray-300 bg-card">
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center text-gray-600 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity <= 1 || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <input
        type="number"
        min={1}
        max={maxStock}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-full w-11 border-x border-gray-300 bg-transparent text-center text-sm font-medium tabular-nums text-gray-900 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />

      <button
        type="button"
        className="flex h-full w-9 items-center justify-center text-gray-600 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity >= maxStock || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
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
    <div className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap sm:gap-6 sm:px-4">
      {/* Product image */}
      <Link
        href={`/products/${item.product.slug}`}
        className="relative h-20 w-20 flex-shrink-0 overflow-hidden bg-gray-50 sm:h-24 sm:w-24"
      >
        <Image src={imageUrl} alt={item.product.name} fill sizes="96px" className="object-cover" />
      </Link>

      {/* Product info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.product.slug}`}
          className="line-clamp-2 text-[15px] text-gray-900 transition-colors hover:text-primary"
        >
          {item.product.name}
        </Link>

        <p className="mt-1 text-[13px] text-gray-500">SKU: {item.product.sku}</p>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="price-current">{formatPrice(item.price)}</span>
          {item.product.compareAtPrice && Number(item.product.compareAtPrice) > item.price && (
            <span className="price-original">
              {formatPrice(Number(item.product.compareAtPrice))}
            </span>
          )}
        </div>

        {item.product.stock < 10 && (
          <p className="mt-1.5 text-[13px] font-medium text-orange-600">
            Only {item.product.stock} left in stock
          </p>
        )}
      </div>

      {/* Quantity + total + remove (wraps under the product on mobile) */}
      <div className="flex w-full items-center justify-between gap-2 pl-24 sm:w-auto sm:justify-end sm:gap-6 sm:pl-0">
        <div className="flex-shrink-0">
          <QuantitySelector
            itemId={item.id}
            quantity={item.quantity}
            maxStock={item.product.stock}
          />
        </div>

        {/* Line total */}
        <div className="flex-shrink-0 text-right sm:w-28">
          <p className="text-base font-bold tabular-nums text-gray-900">
            {formatPrice(item.lineTotal)}
          </p>
        </div>

        {/* Remove button */}
        <button
          type="button"
          className="btn-icon h-9 w-9 border border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
          disabled={isUpdating}
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.product.name}`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
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
      <div className="flex items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-emerald-700">
            Coupon &quot;{cart.couponCode}&quot; applied
          </p>
          <p className="mt-0.5 text-[13px] text-emerald-600">
            You save {formatPrice(cart.discount)}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
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
        <div className="relative min-w-0 flex-1">
          <Tag
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            strokeWidth={2.25}
          />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="field-input pl-10 uppercase"
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={!code.trim() || isUpdating}
          className="btn btn-dark"
        >
          Apply
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Order Summary Sidebar ("Order Basket" bento tile)
// ──────────────────────────────────────────────────────────

function OrderSummary() {
  const { cart, isUpdating } = useCart();

  if (!cart) {
    return null;
  }

  return (
    <div className="sticky top-24 border border-gray-200 bg-gray-50 p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <h2 className="font-heading text-lg font-semibold text-gray-900">Order Summary</h2>
        <span className="text-sm text-gray-500">
          {cart.itemCount} {cart.itemCount === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {/* Line items summary */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-gray-600">
            Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatPrice(cart.subtotal)}
          </span>
        </div>

        {cart.discount > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-emerald-600">Discount</span>
            <span className="font-semibold tabular-nums text-emerald-600">
              -{formatPrice(cart.discount)}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Shipping</span>
          <span className="text-[13px] text-gray-500">Calculated at checkout</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Tax</span>
          <span className="text-[13px] text-gray-500">Calculated at checkout</span>
        </div>
      </div>

      {/* Coupon */}
      <div className="mt-6">
        <CouponInput />
      </div>

      {/* Total */}
      <div className="mt-6 border-t border-gray-200 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-heading text-base font-semibold text-gray-900">
            Estimated Total
          </span>
          <span className="text-xl font-bold tabular-nums text-primary">
            {formatPrice(cart.total)}
          </span>
        </div>
        <p className="mt-1 text-right text-xs text-gray-500">BDT ৳ (Bangladeshi Taka)</p>
      </div>

      {/* Checkout button */}
      <Link
        href="/checkout"
        aria-disabled={isUpdating || cart.items.length === 0}
        className={`btn btn-lg mt-6 w-full ${
          isUpdating || cart.items.length === 0
            ? 'pointer-events-none cursor-not-allowed bg-gray-200 text-gray-500'
            : 'btn-primary'
        }`}
      >
        Proceed to Checkout
      </Link>

      {/* Security badges */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
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
    <div className="mx-auto max-w-2xl py-10 text-center sm:py-16">
      <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" strokeWidth={1.25} />
      <h2 className="mt-5 font-heading text-2xl font-semibold text-gray-900 sm:text-[1.75rem]">
        Your cart is empty
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
        Looks like you haven&apos;t added anything to your cart yet. Browse our products and find
        something you love!
      </p>
      <Link href="/" className="btn btn-primary btn-lg mt-8">
        Start Shopping
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cart Page
// ──────────────────────────────────────────────────────────

const CART_CRUMBS = [{ label: 'Home', href: '/' }, { label: 'Shopping Cart' }];

export default function CartPage() {
  const { cart, isLoading, clearCart, isUpdating } = useCart();

  if (isLoading) {
    return (
      <>
        <Breadcrumbs items={CART_CRUMBS} />
        <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <LoadingState label="Loading your cart…" className="py-20" />
        </div>
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Breadcrumbs items={CART_CRUMBS} />
        <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <EmptyCartPage />
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={CART_CRUMBS} />
      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Page header */}
        <PageHeader
          title="Shopping Cart"
          description={`${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'} in your cart`}
          actions={
            <button
              type="button"
              onClick={clearCart}
              disabled={isUpdating}
              className="btn btn-sm btn-secondary"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Clear Cart
            </button>
          }
        />

        {/* Main content: items + sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Cart items */}
          <div className="lg:col-span-8 lg:self-start">
            <div className="border border-gray-200 px-4 sm:px-0">
              {/* Table header (desktop) */}
              <div className="hidden items-center gap-6 border-b border-gray-200 bg-gray-50 px-4 py-3 font-heading text-sm font-semibold text-gray-700 lg:flex">
                <div className="flex-1 pl-[120px]">Product</div>
                <div className="w-[118px]">Quantity</div>
                <div className="w-28 text-right">Total</div>
                <div className="w-9" /> {/* Remove button column */}
              </div>

              {/* Items list */}
              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Continue shopping */}
            <div className="mt-5">
              <Link href="/" className="btn btn-outline btn-sm">
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-4">
            <OrderSummary />
          </div>
        </div>
      </div>
    </>
  );
}
