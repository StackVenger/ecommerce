'use client';

import Image from 'next/image';
import { useState } from 'react';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ReviewItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  lineTotal: number;
  imageUrl: string | null;
}

interface ReviewAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  division: string;
  postalCode: string;
}

interface ReviewStepProps {
  items: ReviewItem[];
  address: ReviewAddress | null;
  shippingMethodName: string;
  shippingCost: number;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  couponCode: string | null;
  onPlaceOrder: () => void;
  onBack: () => void;
  onEditStep: (step: 'address' | 'shipping' | 'payment') => void;
  isSubmitting: boolean;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CARD':
      return 'Credit / Debit Card (Stripe)';
    case 'COD':
      return 'Cash on Delivery';
    case 'BKASH':
      return 'bKash Mobile Payment';
    default:
      return method;
  }
}

// ──────────────────────────────────────────────────────────
// Section Header
// ──────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onEdit?: () => void;
}

function SectionHeader({ title, onEdit }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="eyebrow">{title}</h3>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:text-brand-800 font-medium transition-colors"
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Review Step Component
// ──────────────────────────────────────────────────────────

/**
 * Checkout Step 4: Order Review and Confirmation
 *
 * Displays a complete summary of the order including items, shipping
 * address, delivery method, payment method, and cost breakdown in BDT ৳.
 * Requires the user to accept terms before placing the order.
 */
export default function ReviewStep({
  items,
  address,
  shippingMethodName,
  shippingCost,
  paymentMethod,
  subtotal,
  discount,
  tax,
  total,
  couponCode,
  onPlaceOrder,
  onBack,
  onEditStep,
  isSubmitting,
}: ReviewStepProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const canPlaceOrder = termsAccepted && !isSubmitting;

  return (
    <div>
      <h2 className="section-title mb-1">Review Your Order</h2>
      <p className="text-sm text-gray-500 mb-6">
        Please verify everything before placing your order
      </p>

      {/* ─── Items ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionHeader title="Items" />
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-card">
              {/* Image */}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={item.imageUrl || '/placeholder-product.png'}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  SKU: {item.sku} &middot; Qty: {item.quantity}
                </p>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatPrice(item.lineTotal)}</p>
                <p className="text-xs text-gray-400">{formatPrice(item.price)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Shipping Address ──────────────────────────────────── */}
      <div className="mb-6">
        <SectionHeader title="Shipping Address" onEdit={() => onEditStep('address')} />
        {address && (
          <div className="bento-tile p-4 text-sm">
            <p className="font-medium text-gray-900">{address.name}</p>
            <p className="text-gray-600 mt-1">{address.phone}</p>
            <p className="text-gray-500 mt-1">
              {address.addressLine1}
              {address.addressLine2 && `, ${address.addressLine2}`}
            </p>
            <p className="text-gray-500">
              {address.city}, {address.district}, {address.division} {address.postalCode}
            </p>
          </div>
        )}
      </div>

      {/* ─── Shipping Method ───────────────────────────────────── */}
      <div className="mb-6">
        <SectionHeader title="Delivery Method" onEdit={() => onEditStep('shipping')} />
        <div className="bento-tile p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{shippingMethodName}</span>
            <span className="font-semibold text-gray-900">
              {shippingCost === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatPrice(shippingCost)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Payment Method ────────────────────────────────────── */}
      <div className="mb-6">
        <SectionHeader title="Payment Method" onEdit={() => onEditStep('payment')} />
        <div className="bento-tile p-4 text-sm">
          <span className="font-medium text-gray-900">{getPaymentMethodLabel(paymentMethod)}</span>
        </div>
      </div>

      {/* ─── Cost Breakdown ────────────────────────────────────── */}
      <div className="mb-6">
        <SectionHeader title="Order Total" />
        <div className="bento-tile p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>
                Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
              <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount
                  {couponCode && <span className="ml-1 text-xs">({couponCode})</span>}
                </span>
                <span className="font-medium">-{formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="font-medium text-gray-900">
                {shippingCost === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Tax (VAT 15%)</span>
              <span className="font-medium text-gray-900">
                {tax > 0 ? formatPrice(tax) : 'Included'}
              </span>
            </div>

            <div className="border-t border-gray-200 my-2" />

            <div className="flex justify-between items-baseline">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
            </div>

            <p className="text-xs text-gray-400 text-right">BDT ৳ (Bangladeshi Taka)</p>
          </div>
        </div>
      </div>

      {/* ─── Terms & Conditions ────────────────────────────────── */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600">
            I agree to the{' '}
            <a href="/terms" className="text-primary hover:underline">
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            . I understand that my order is subject to the return and refund policy.
          </span>
        </label>
      </div>

      {/* ─── Actions ───────────────────────────────────────────── */}
      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button type="button" onClick={onBack} className="btn btn-soft">
          Back to Payment
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={!canPlaceOrder}
          className={`rounded-xl px-10 py-3.5 text-sm font-semibold text-white transition-colors ${
            canPlaceOrder ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent" />
              Processing...
            </span>
          ) : (
            `Place Order — ${formatPrice(total)}`
          )}
        </button>
      </div>
    </div>
  );
}
