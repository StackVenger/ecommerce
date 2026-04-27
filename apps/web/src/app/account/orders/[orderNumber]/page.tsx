'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api/errors';
import { getOrderByNumber, cancelOrder, type OrderDetail } from '@/lib/api/orders';

// ──────────────────────────────────────────────────────────
// Order Status Timeline
// ──────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const CANCELLED_STATUS = { key: 'CANCELLED', label: 'Cancelled' };

function getReachedStatuses(currentStatus: string): string[] {
  if (currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED') {
    return ['CANCELLED'];
  }

  const reached: string[] = [];
  for (const step of STATUS_STEPS) {
    reached.push(step.key);
    if (step.key === currentStatus) {
      break;
    }
  }
  return reached;
}

interface StatusTimelineProps {
  currentStatus: string;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

function StatusTimeline({
  currentStatus,
  createdAt,
  deliveredAt,
  cancelledAt,
}: StatusTimelineProps) {
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED';
  const reached = getReachedStatuses(currentStatus);
  const steps = isCancelled ? [...STATUS_STEPS.slice(0, 1), CANCELLED_STATUS] : STATUS_STEPS;

  const getTimestamp = (key: string): string | null => {
    switch (key) {
      case 'PENDING':
        return createdAt;
      case 'DELIVERED':
        return deliveredAt;
      case 'CANCELLED':
        return cancelledAt;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative">
      {steps.map((step, index) => {
        const isReached = reached.includes(step.key);
        const isCurrent = step.key === currentStatus;
        const isCancelledStep = step.key === 'CANCELLED';
        const timestamp = getTimestamp(step.key);

        return (
          <div key={step.key} className="flex gap-4 pb-8 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  isCancelledStep
                    ? 'bg-red-100 text-red-600 ring-4 ring-red-50'
                    : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : isReached
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isReached && !isCurrent && !isCancelledStep ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isCancelledStep ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 flex-1 mt-2 ${
                    isReached && !isCurrent ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            <div className="pt-2">
              <p
                className={`font-medium ${
                  isCancelledStep
                    ? 'text-red-600'
                    : isCurrent
                      ? 'text-primary'
                      : isReached
                        ? 'text-gray-900'
                        : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
              {timestamp && <p className="text-xs text-gray-500 mt-0.5">{formatDate(timestamp)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `৳${Number(amount).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-teal-100 text-teal-800';
    case 'PROCESSING':
      return 'bg-indigo-100 text-indigo-800';
    case 'SHIPPED':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CARD':
      return 'Credit/Debit Card';
    case 'COD':
      return 'Cash on Delivery';
    case 'BKASH':
      return 'bKash';
    default:
      return method;
  }
}

// ──────────────────────────────────────────────────────────
// Cancel Order Dialog
// ──────────────────────────────────────────────────────────

interface CancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}

function CancelDialog({ isOpen, onClose, onConfirm, isSubmitting }: CancelDialogProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Order</h3>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>

        <div className="mb-4">
          <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for cancellation <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="cancelReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
            placeholder="Tell us why you want to cancel..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Cancelling...' : 'Cancel Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Order Detail Page
// ──────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getOrderByNumber(orderNumber);
        setOrder(data);
      } catch (err: any) {
        setError(err.response?.status === 404 ? 'Order not found' : 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber]);

  const canCancel = order && (order.status === 'PENDING' || order.status === 'CONFIRMED');

  const handleCancelOrder = async (reason: string) => {
    if (!order) {
      return;
    }

    setIsCancelling(true);
    try {
      const updated = await cancelOrder(order.id, reason);
      setOrder(updated);
      setShowCancelDialog(false);
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to cancel order'));
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
      </div>
    );
  }

  // Error / Not found state
  if (error || !order) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {error === 'Order not found' ? 'Order Not Found' : 'Something went wrong'}
        </h1>
        <p className="text-gray-500 mb-6">
          {error === 'Order not found'
            ? `We couldn't find order ${orderNumber}. Please check the order number and try again.`
            : 'Failed to load order details. Please try again later.'}
        </p>
        <Link href="/account/orders" className="text-primary hover:underline text-sm font-medium">
          View All Orders
        </Link>
      </div>
    );
  }

  const paymentMethod = order.payments?.[0]?.method;
  const paymentStatus = order.payments?.[0]?.status;
  const addr = order.shippingAddress;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/account/orders"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              My Orders
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900 font-medium font-mono">{order.orderNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-500 mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-BD', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(order.status)}`}
          >
            {order.status}
          </span>

          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: Timeline + Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status Timeline */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
            <StatusTimeline
              currentStatus={order.status}
              createdAt={order.createdAt}
              deliveredAt={order.deliveredAt}
              cancelledAt={order.cancelledAt}
            />
            {order.cancellationReason && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <span className="font-medium">Cancellation reason:</span> {order.cancellationReason}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Items ({order.items.length})
            </h2>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={item.productImage || '/placeholder-product.png'}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      SKU: {item.sku} &middot; Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(Number(item.totalPrice))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Details */}
        <div className="space-y-6">
          {/* Shipping Address */}
          {addr && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Shipping Address
              </h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{addr.fullName}</p>
                <p className="mt-1">{addr.phone}</p>
                <p className="mt-1">
                  {addr.addressLine1}
                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                </p>
                <p>
                  {addr.area && `${addr.area}, `}
                  {addr.district}
                </p>
                <p>
                  {addr.division} {addr.postalCode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Payment
            </h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {paymentMethod ? getPaymentMethodLabel(paymentMethod) : 'Not specified'}
              </p>
              {paymentStatus && (
                <p className="mt-1">
                  Status: <span className="font-medium">{paymentStatus}</span>
                </p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {Number(order.shippingCost) === 0
                    ? 'Free'
                    : formatPrice(Number(order.shippingCost))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>
                  {Number(order.taxAmount) > 0 ? formatPrice(Number(order.taxAmount)) : 'Included'}
                </span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-lg">{formatPrice(Number(order.totalAmount))}</span>
              </div>
              <p className="text-xs text-gray-400 text-right">BDT ৳</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <CancelDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        isSubmitting={isCancelling}
      />
    </div>
  );
}
