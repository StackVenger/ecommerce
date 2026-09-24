'use client';

import { ArrowLeft, Lock, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import type { CartItem } from '@/lib/api/cart';

import { EmptyState, LoadingState, PageHeader } from '@/components/ui/bento';
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

  return (
    <div className="inline-flex items-center rounded-2xl border border-foreground/[0.05] bg-gray-50 p-1">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-600 transition-all hover:bg-card hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity <= 1 || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <span className="min-w-[2.5rem] text-center text-sm font-black tabular-nums">{quantity}</span>

      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-600 transition-all hover:bg-card hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity >= maxStock || isUpdating}
        onClick={() => updateItemQuantity(itemId, quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
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
    <div className="group flex flex-wrap items-center gap-4 rounded-[1.5rem] px-2 py-4 transition-colors hover:bg-gray-50/70 sm:flex-nowrap sm:gap-6 sm:px-3">
      {/* Product image */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[1.25rem] border border-foreground/[0.04] bg-gray-50 sm:h-24 sm:w-24">
        <Image
          src={imageUrl}
          alt={item.product.name}
          fill
          sizes="96px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Product info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.product.slug}`}
          className="line-clamp-1 text-sm font-black text-gray-900 transition-colors hover:text-primary sm:text-base"
        >
          {item.product.name}
        </Link>

        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          SKU · {item.product.sku}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-black tabular-nums text-brand-700">
            {formatPrice(item.price)}
          </span>
          {item.product.compareAtPrice && Number(item.product.compareAtPrice) > item.price && (
            <span className="text-[11px] font-bold text-gray-400 line-through">
              {formatPrice(Number(item.product.compareAtPrice))}
            </span>
          )}
        </div>

        {item.product.stock < 10 && (
          <p className="mt-1.5 text-[11px] font-black text-orange-600">
            Only {item.product.stock} left in stock
          </p>
        )}
      </div>

      {/* Quantity + total + remove (wraps under the product on mobile) */}
      <div className="flex w-full items-center justify-between gap-4 pl-24 sm:w-auto sm:justify-end sm:gap-6 sm:pl-0">
        <div className="flex-shrink-0">
          <QuantitySelector
            itemId={item.id}
            quantity={item.quantity}
            maxStock={item.product.stock}
          />
        </div>

        {/* Line total */}
        <div className="flex-shrink-0 text-right sm:w-28">
          <p className="text-base font-black tabular-nums tracking-tighter text-gray-900">
            {formatPrice(item.lineTotal)}
          </p>
        </div>

        {/* Remove button */}
        <button
          type="button"
          className="btn-icon h-9 w-9 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-500 sm:opacity-60 sm:group-hover:opacity-100"
          disabled={isUpdating}
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.product.name}`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.25} />
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
      <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-emerald-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-emerald-700">
            Coupon &quot;{cart.couponCode}&quot; applied
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
            You save {formatPrice(cart.discount)}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm bg-card text-emerald-700 shadow-sm hover:text-rose-600"
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
            className="field-input pl-10 font-bold uppercase tracking-wider"
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
    <div className="bento-card sticky top-24 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="section-title">Order Summary</h2>
        <span className="pill pill-neutral">
          {cart.itemCount} {cart.itemCount === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {/* Line items summary */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="font-bold text-gray-500">
            Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-black tabular-nums text-gray-900">
            {formatPrice(cart.subtotal)}
          </span>
        </div>

        {cart.discount > 0 && (
          <div className="flex justify-between gap-3">
            <span className="font-bold text-emerald-600">Discount</span>
            <span className="font-black tabular-nums text-emerald-600">
              -{formatPrice(cart.discount)}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <span className="font-bold text-gray-500">Shipping</span>
          <span className="text-xs font-bold italic text-gray-400">Calculated at checkout</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="font-bold text-gray-500">Tax</span>
          <span className="text-xs font-bold italic text-gray-400">Calculated at checkout</span>
        </div>
      </div>

      {/* Coupon */}
      <div className="mt-6">
        <CouponInput />
      </div>

      {/* Total */}
      <div className="mt-6 border-t-2 border-dashed border-gray-200 pt-6">
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-primary/10 bg-primary/5 p-4">
          <span className="text-sm font-black text-brand-700">Estimated Total</span>
          <span className="text-2xl font-black tabular-nums tracking-tighter text-brand-700">
            {formatPrice(cart.total)}
          </span>
        </div>
        <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
          BDT ৳ (Bangladeshi Taka)
        </p>
      </div>

      {/* Checkout button */}
      <Link
        href="/checkout"
        aria-disabled={isUpdating || cart.items.length === 0}
        className={`btn btn-lg mt-6 w-full uppercase tracking-widest ${
          isUpdating || cart.items.length === 0
            ? 'pointer-events-none cursor-not-allowed bg-gray-200 text-gray-500'
            : 'btn-primary'
        }`}
      >
        Proceed to Checkout
      </Link>

      {/* Security badges */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400">
        <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />
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
    <EmptyState
      icon={ShoppingBag}
      title="Your cart is empty"
      description="Looks like you haven't added anything to your cart yet. Browse our products and find something you love!"
      action={
        <Link href="/" className="btn btn-primary btn-lg">
          Start Shopping
        </Link>
      }
      className="mx-auto max-w-2xl py-16 sm:py-20"
    />
  );
}

// ──────────────────────────────────────────────────────────
// Cart Page
// ──────────────────────────────────────────────────────────

export default function CartPage() {
  const { cart, isLoading, clearCart, isUpdating } = useCart();

  if (isLoading) {
    return (
      <div className="site-container px-4 py-12 sm:px-6 lg:px-8">
        <LoadingState label="Loading your cart…" className="py-20" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="site-container px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <EmptyCartPage />
      </div>
    );
  }

  return (
    <div className="site-container px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Page header */}
      <PageHeader
        title="Shopping Cart"
        description={`${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'} in your cart`}
        actions={
          <button
            type="button"
            onClick={clearCart}
            disabled={isUpdating}
            className="btn btn-sm btn-danger-soft"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            Clear Cart
          </button>
        }
      />

      {/* Main content: items + sidebar */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Cart items */}
        <div className="bento-card p-4 sm:p-6 lg:col-span-8 lg:self-start">
          {/* Table header (desktop) */}
          <div className="hidden items-center gap-6 border-b border-foreground/[0.04] px-3 pb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 lg:flex">
            <div className="flex-1 pl-[120px]">Product</div>
            <div className="w-[124px]">Quantity</div>
            <div className="w-28 text-right">Total</div>
            <div className="w-9" /> {/* Remove button column */}
          </div>

          {/* Items list */}
          <div className="divide-y divide-foreground/[0.03]">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          {/* Continue shopping */}
          <div className="mt-4 border-t border-foreground/[0.04] pt-5">
            <Link href="/" className="btn btn-soft btn-sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
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
  );
}
