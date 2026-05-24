'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  trackGuestOrder,
  getStatusLabel,
  formatOrderAmount,
  type TrackedOrderSummary,
} from '@/lib/api/orders';

// ──────────────────────────────────────────────────────────
// Status Color Map
// ──────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800';
    case 'PROCESSING':
      return 'bg-indigo-100 text-indigo-800';
    case 'SHIPPED':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ──────────────────────────────────────────────────────────
// Track Order Page
// ──────────────────────────────────────────────────────────

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  // `email` may still be present in legacy URLs from old confirmation emails;
  // we read but ignore it (the backend ignores it too).
  const prefillOrderNumber = searchParams.get('orderNumber') || '';

  const [orderNumber, setOrderNumber] = useState(prefillOrderNumber);
  const [order, setOrder] = useState<TrackedOrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search if prefilled from checkout redirect or a tracking-email link
  useEffect(() => {
    if (prefillOrderNumber) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter your order number');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const result = await trackGuestOrder(orderNumber.trim());
      setOrder(result);
    } catch {
      setOrder(null);
      toast.error('Order not found. Please check your order number.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
      <p className="text-gray-500 mb-8">
        Enter your order number to view your order status.
      </p>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="rounded-xl bg-white border border-gray-200 p-6 mb-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Order Number
            </label>
            <input
              id="orderNumber"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-20260217-XXXXX"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Searching...
              </span>
            ) : (
              'Track Order'
            )}
          </button>
        </div>
      </form>

      {/* Order Details */}
      {order && (
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          {/* Order Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="text-lg font-bold text-gray-900">{order.orderNumber}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(order.status)}`}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
              <span>
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {order.paymentMethod && (
                <span>Payment: {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Card'}</span>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatOrderAmount(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatOrderAmount(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-medium text-gray-900">
                  {order.shippingCost === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatOrderAmount(order.shippingCost)
                  )}
                </span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatOrderAmount(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not found state */}
      {hasSearched && !isLoading && !order && (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto text-gray-300 mb-4"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-sm text-gray-500">
            We couldn&apos;t find an order with that number. Please double-check it and try again.
          </p>
        </div>
      )}
    </div>
  );
}
