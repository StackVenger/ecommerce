'use client';

import { Loader2, PackageSearch, SearchX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { EmptyState, IconTile, PageHeader } from '@/components/ui/bento';
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
      return 'pill-warning';
    case 'CONFIRMED':
      return 'pill-info';
    case 'PROCESSING':
      return 'bg-indigo-50 text-indigo-600';
    case 'SHIPPED':
      return 'pill-purple';
    case 'DELIVERED':
      return 'pill-success';
    case 'CANCELLED':
      return 'pill-danger';
    default:
      return 'pill-neutral';
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        title="Track Your Order"
        description="Enter your order number to view your order status."
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Search Form */}
        <form
          onSubmit={handleSubmit}
          className={`bento-card p-6 sm:p-8 ${order ? 'lg:col-span-5 lg:self-start' : 'lg:col-span-12'}`}
        >
          <div className="mb-6 flex items-center gap-3">
            <IconTile icon={PackageSearch} tone="brand" size="sm" />
            <div>
              <h2 className="section-title">Find your order</h2>
              <p className="eyebrow mt-1">Guest order lookup</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="orderNumber" className="field-label">
                Order Number
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. ORD-20260217-XXXXX"
                className="field-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg mt-6 w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                Searching...
              </>
            ) : (
              'Track Order'
            )}
          </button>
        </form>

        {/* Order Details */}
        {order && (
          <div className="bento-card overflow-hidden lg:col-span-7">
            {/* Order Header */}
            <div className="border-b border-foreground/[0.04] px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">Order Number</p>
                  <p className="mt-1 break-all text-lg font-black tracking-tight text-gray-900">
                    {order.orderNumber}
                  </p>
                </div>
                <span className={`pill ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
                <span className="rounded-xl bg-gray-100 px-3 py-1.5">
                  Placed on{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-BD', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {order.paymentMethod && (
                  <span className="rounded-xl bg-gray-100 px-3 py-1.5">
                    Payment: {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Card'}
                  </span>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="divide-y divide-foreground/[0.03] px-2 sm:px-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-3 py-4">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[1rem] border border-foreground/[0.04] bg-gray-50 sm:h-16 sm:w-16">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-black text-gray-900">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-gray-400">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-gray-900">
                      {formatOrderAmount(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="m-4 mt-2 rounded-[1.5rem] bg-gray-50 px-5 py-4 sm:m-6 sm:mt-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-gray-500">Subtotal</span>
                  <span className="font-black tabular-nums text-gray-900">
                    {formatOrderAmount(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-gray-500">Shipping</span>
                  <span className="font-black tabular-nums text-gray-900">
                    {order.shippingCost === 0 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      formatOrderAmount(order.shippingCost)
                    )}
                  </span>
                </div>
                <div className="my-2 border-t-2 border-dashed border-gray-200" />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-black text-gray-900">Total</span>
                  <span className="text-xl font-black tabular-nums tracking-tighter text-brand-700">
                    {formatOrderAmount(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not found state */}
        {hasSearched && !isLoading && !order && (
          <EmptyState
            icon={SearchX}
            title="Order Not Found"
            description="We couldn't find an order with that number. Please double-check it and try again."
            className="lg:col-span-12"
          />
        )}
      </div>
    </div>
  );
}
