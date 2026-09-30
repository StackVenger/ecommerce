'use client';

import { CheckCircle2, CreditCard, MapPin, Receipt, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { EmptyState, LoadingState } from '@/components/ui/bento';
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
    <ol className="relative flex flex-col gap-0 md:flex-row md:gap-2">
      {steps.map((step, index) => {
        const isReached = reached.includes(step.key);
        const isCurrent = step.key === currentStatus;
        const isCancelledStep = step.key === 'CANCELLED';
        const timestamp = getTimestamp(step.key);
        const isLast = index === steps.length - 1;

        return (
          <li key={step.key} className="group flex flex-1 gap-4 md:flex-col md:gap-3">
            <div className="flex flex-col items-center md:w-full md:flex-row">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                  isCancelledStep
                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                    : isCurrent
                      ? 'border-primary bg-primary text-white'
                      : isReached
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-200 bg-card text-gray-400'
                }`}
              >
                {isReached && !isCurrent && !isCancelledStep ? (
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                ) : isCancelledStep ? (
                  <XCircle className="h-5 w-5" strokeWidth={2} />
                ) : (
                  index + 1
                )}
              </div>
              {!isLast && (
                <div
                  className={`mt-2 w-0.5 flex-1 md:ml-2 md:mt-0 md:h-0.5 md:w-auto ${
                    isReached && !isCurrent ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            <div className="pb-6 pt-2 group-last:pb-0 md:pb-0 md:pt-0">
              <p
                className={`text-sm font-medium ${
                  isCancelledStep
                    ? 'text-rose-600'
                    : isCurrent
                      ? 'text-primary'
                      : isReached
                        ? 'text-gray-900'
                        : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
              {timestamp && <p className="mt-0.5 text-xs text-gray-500">{formatDate(timestamp)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
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
      return 'pill-warning';
    case 'CONFIRMED':
      return 'pill-brand';
    case 'PROCESSING':
      return 'pill-info';
    case 'SHIPPED':
      return 'pill-purple';
    case 'DELIVERED':
      return 'pill-success';
    case 'CANCELLED':
      return 'pill-danger';
    case 'REFUNDED':
      return 'pill-neutral';
    default:
      return 'pill-neutral';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
    >
      <div className="w-full max-w-md border border-gray-200 bg-card p-6 sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <XCircle className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h3 id="cancel-order-title" className="font-heading text-xl font-semibold text-gray-900">
          Cancel Order
        </h3>
        <p className="mb-5 mt-2 text-sm text-gray-500">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>

        <div className="mb-6">
          <label htmlFor="cancelReason" className="field-label">
            Reason for cancellation <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="cancelReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field-input h-auto resize-none py-3"
            placeholder="Tell us why you want to cancel..."
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
            className="btn btn-danger"
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
    return <LoadingState label="Loading order" className="py-24" />;
  }

  // Error / Not found state
  if (error || !order) {
    return (
      <EmptyState
        icon={Receipt}
        title={error === 'Order not found' ? 'Order Not Found' : 'Something went wrong'}
        description={
          error === 'Order not found'
            ? `We couldn't find order ${orderNumber}. Please check the order number and try again.`
            : 'Failed to load order details. Please try again later.'
        }
        action={
          <Link href="/account/orders" className="btn btn-primary btn-sm">
            View All Orders
          </Link>
        }
        className="py-20"
      />
    );
  }

  const paymentMethod = order.payments?.[0]?.method;
  const paymentStatus = order.payments?.[0]?.status;
  const addr = order.shippingAddress;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <nav className="mb-2 flex items-center gap-2 text-[13px]" aria-label="Breadcrumb">
            <Link
              href="/account/orders"
              className="text-gray-500 transition-colors hover:text-primary"
            >
              My Orders
            </Link>
            <span className="text-gray-300">/</span>
            <span className="truncate font-mono text-gray-900">{order.orderNumber}</span>
          </nav>
          <h1 className="page-title">Order Details</h1>
          <p className="page-subtitle mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-BD', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`pill ${getStatusBadgeColor(order.status)}`}>{order.status}</span>

          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="btn btn-danger-soft btn-sm"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <section className="bento-card p-5 sm:p-6">
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="section-title">Order Status</h2>
          <p className="text-sm text-gray-500">Live progress of your delivery</p>
        </div>
        <StatusTimeline
          currentStatus={order.status}
          createdAt={order.createdAt}
          deliveredAt={order.deliveredAt}
          cancelledAt={order.cancelledAt}
        />
        {order.cancellationReason && (
          <div className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <span className="font-semibold">Cancellation reason:</span> {order.cancellationReason}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12">
        {/* Order Items */}
        <section className="bento-card xl:col-span-8 xl:self-start">
          <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
            <h2 className="section-title">{`Items (${order.items.length})`}</h2>
            <p className="text-sm text-gray-500">What&apos;s in this order</p>
          </div>
          <div className="overflow-x-auto">
            <table className="bento-table">
              <thead>
                <tr>
                  <th className="pl-5 sm:pl-6">Product</th>
                  <th className="text-center">Qty</th>
                  <th className="pr-5 text-right sm:pr-6">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="pl-5 sm:pl-6">
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden border border-gray-200 bg-gray-50">
                          <Image
                            src={item.productImage || '/placeholder-product.png'}
                            alt={item.productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.productSlug}`}
                            className="line-clamp-2 text-sm text-gray-900 transition-colors hover:text-primary"
                          >
                            {item.productName}
                          </Link>
                          <p className="mt-0.5 text-xs text-gray-500">SKU: {item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center tabular-nums text-gray-700">
                      <span className="sr-only">Qty: </span>
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap pr-5 text-right font-bold tabular-nums text-gray-900 sm:pr-6">
                      {formatPrice(Number(item.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right column: Details */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          {/* Shipping Address */}
          {addr && (
            <section className="bento-card p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} />
                <h3 className="font-heading text-base font-semibold text-gray-900">
                  Shipping Address
                </h3>
              </div>
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
            </section>
          )}

          {/* Payment Info */}
          <section className="bento-card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
              <CreditCard className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <h3 className="font-heading text-base font-semibold text-gray-900">Payment</h3>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {paymentMethod ? getPaymentMethodLabel(paymentMethod) : 'Not specified'}
              </p>
              {paymentStatus && (
                <p className="mt-1">
                  Status: <span className="font-medium text-gray-900">{paymentStatus}</span>
                </p>
              )}
            </div>
          </section>

          {/* Order Summary */}
          <section className="border border-gray-200 bg-gray-50 p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
            <h3 className="border-b border-gray-200 pb-3 font-heading text-base font-semibold text-gray-900">
              Order Summary
            </h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums text-gray-900">
                  {formatPrice(Number(order.subtotal))}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span className="tabular-nums">-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="tabular-nums text-gray-900">
                  {Number(order.shippingCost) === 0
                    ? 'Free'
                    : formatPrice(Number(order.shippingCost))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="tabular-nums text-gray-900">
                  {Number(order.taxAmount) > 0 ? formatPrice(Number(order.taxAmount)) : 'Included'}
                </span>
              </div>
              <div className="!mt-4 flex items-end justify-between border-t border-gray-200 pt-4">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-heading text-2xl font-semibold tabular-nums text-primary">
                  {formatPrice(Number(order.totalAmount))}
                </span>
              </div>
              <p className="text-right text-xs text-gray-500">BDT ৳</p>
            </div>
          </section>
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
