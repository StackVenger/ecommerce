'use client';

import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  FileText,
  ImageIcon,
  MapPin,
  Printer,
  Receipt,
  StickyNote,
  Truck,
  User,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { OrderStatusPill, PaymentStatusPill } from '@/components/admin/orders/order-status';
import StatusUpdateDialog from '@/components/admin/orders/status-update-dialog';
import { EmptyState, LoadingState, PageHeader, SectionHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productNameBn: string;
  sku: string;
  image: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  transactionId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
  };
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area: string;
    postalCode: string;
  };
  billingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area: string;
    postalCode: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  couponCode: string | null;
  totalAmount: number;
  shippingMethod: string;
  trackingNumber: string | null;
  notes: string | null;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  status: string;
  message: string;
  createdBy: string;
  createdAt: string;
}

function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AddressBlock({ address }: { address: OrderDetail['shippingAddress'] }) {
  return (
    <div>
      <p className="text-sm font-black text-gray-900">{address.name}</p>
      <p className="text-xs font-bold text-gray-500">{address.phone}</p>
      <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
        {address.address}
        <br />
        {address.area}, {address.city}
        <br />
        {address.postalCode}
      </p>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const { data } = await apiClient.get(`/admin/orders/${orderId}`);
        const raw = data.data ?? data;
        // Ensure required nested fields have safe defaults
        setOrder({
          ...raw,
          items: raw.items ?? [],
          timeline: raw.timeline ?? [],
          customer: raw.customer ?? {
            id: '',
            name: 'Unknown',
            email: '',
            phone: '',
            totalOrders: 0,
          },
          shippingAddress: raw.shippingAddress ?? {
            name: '',
            phone: '',
            address: '',
            city: '',
            area: '',
            postalCode: '',
          },
          billingAddress: raw.billingAddress ??
            raw.shippingAddress ?? {
              name: '',
              phone: '',
              address: '',
              city: '',
              area: '',
              postalCode: '',
            },
          tax: raw.tax ?? 0,
          discount: raw.discount ?? 0,
        });
      } catch (err: any) {
        console.error('Error fetching order:', err);
        const status = err?.response?.status;
        if (status === 404) {
          setError(
            'This order could not be found. The admin order detail endpoint may not be available yet.',
          );
        } else {
          setError('Failed to load order details. Please try again later.');
        }
        toast.error(getApiErrorMessage(err, 'Failed to load order details'));
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdated = (newStatus: string) => {
    const upperStatus = newStatus.toUpperCase() as OrderStatus;
    setOrder((prev) => (prev ? { ...prev, status: upperStatus } : prev));
    setShowStatusDialog(false);
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handlePrintInvoice = () => {
    window.open(`/admin/orders/${orderId}/invoice`, '_blank');
  };

  const handleDownloadInvoice = async () => {
    try {
      const { data } = await apiClient.get(`/admin/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order?.orderNumber || orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Invoice download error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to download invoice'));
    }
  };

  if (loading) {
    return <LoadingState label="Loading order" className="min-h-[400px]" />;
  }

  if (error || !order) {
    return (
      <EmptyState
        icon={FileText}
        title={error ? 'Unable to load order' : 'Order not found'}
        description={error ?? 'The order you are looking for does not exist.'}
        action={
          <a href="/admin/orders" className="btn btn-soft">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            Back to Orders
          </a>
        }
      />
    );
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <PageHeader
        eyebrow={
          <a
            href="/admin/orders"
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            Orders
          </a>
        }
        title={`Order #${order.orderNumber}`}
        description={`Placed on ${new Date(order.createdAt).toLocaleDateString('en-BD', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowStatusDialog(true)}
              className="btn btn-primary"
            >
              Update Status
            </button>
            <button type="button" onClick={handlePrintInvoice} className="btn btn-secondary">
              <Printer className="h-4 w-4" strokeWidth={2.5} />
              Print Invoice
            </button>
            <button type="button" onClick={handleDownloadInvoice} className="btn btn-secondary">
              <Download className="h-4 w-4" strokeWidth={2.5} />
              Download PDF
            </button>
          </>
        }
      />

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="bento-primary col-span-2 flex flex-col justify-between gap-4 p-6 lg:col-span-1">
          <div className="bento-glow -right-10 -top-10 h-32 w-32 bg-white/10" aria-hidden />
          <p className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white/70">
            Order total
          </p>
          <p className="relative z-10 text-3xl font-black tabular-nums tracking-tighter">
            {formatBDT(order.totalAmount)}
          </p>
        </div>
        <div className="bento-card flex flex-col justify-between gap-4 p-6">
          <p className="eyebrow">Fulfilment</p>
          <OrderStatusPill status={order.status} className="w-fit" />
        </div>
        <div className="bento-card flex flex-col justify-between gap-4 p-6">
          <p className="eyebrow">Payment</p>
          <PaymentStatusPill status={order.paymentStatus} className="w-fit" />
        </div>
        <div className="bento-card col-span-2 flex flex-col justify-between gap-2 p-6 lg:col-span-1">
          <p className="eyebrow">Tracking</p>
          {order.trackingNumber ? (
            <p className="truncate font-mono text-sm font-bold text-gray-900">
              {order.trackingNumber}
            </p>
          ) : (
            <p className="text-sm font-bold text-gray-400">Not assigned yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-8">
          {/* Order Items */}
          <div className="bento-card p-6 sm:p-8">
            <SectionHeader
              title="Order Items"
              caption={`${itemCount} unit${itemCount !== 1 ? 's' : ''} · ${order.items.length} line${order.items.length !== 1 ? 's' : ''}`}
              icon={Receipt}
            />
            <div className="divide-y divide-foreground/[0.04]">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-foreground/[0.04] bg-gray-50 transition-transform group-hover:scale-105">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-gray-900">
                        {item.productName}
                      </h3>
                      {item.productNameBn && (
                        <p className="font-bengali text-xs font-medium text-gray-500">
                          {item.productNameBn}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        SKU {item.sku} {item.variant && `· ${item.variant}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-20 sm:block sm:pl-0 sm:text-right">
                    <p className="text-xs font-bold tabular-nums text-gray-500">
                      {formatBDT(item.unitPrice)} × {item.quantity}
                    </p>
                    <p className="text-sm font-black tabular-nums tracking-tight text-gray-900 sm:mt-1">
                      {formatBDT(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-4 space-y-2.5 rounded-[1.5rem] bg-gray-50 p-5">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-500">Subtotal</span>
                <span className="font-black tabular-nums text-gray-900">
                  {formatBDT(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-gray-500">Shipping ({order.shippingMethod})</span>
                <span className="font-black tabular-nums text-gray-900">
                  {formatBDT(order.shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-500">Tax</span>
                <span className="font-black tabular-nums text-gray-900">
                  {formatBDT(order.tax)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-500">
                    Discount{' '}
                    {order.couponCode && (
                      <span className="pill pill-success ml-1">{order.couponCode}</span>
                    )}
                  </span>
                  <span className="font-black tabular-nums text-emerald-600">
                    -{formatBDT(order.discount)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                <span className="text-sm font-black text-brand-700">Total</span>
                <span className="text-xl font-black tabular-nums tracking-tighter text-brand-700">
                  {formatBDT(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bento-card p-6 sm:p-8">
            <SectionHeader title="Order Timeline" caption="Status history" icon={Truck} />
            {order.timeline.length === 0 ? (
              <p className="rounded-[1.5rem] bg-gray-50 py-8 text-center text-sm font-bold text-gray-400">
                No timeline events yet.
              </p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {order.timeline.map((event, index) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {index !== order.timeline.length - 1 && (
                          <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-100" />
                        )}
                        <div className="relative flex gap-4">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 ring-card ${
                              index === 0 ? 'bg-primary text-white' : 'bg-brand-50 text-brand-600'
                            }`}
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="text-sm font-black text-gray-900">{event.status}</div>
                            <p className="text-sm font-medium text-gray-500">{event.message}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                              {new Date(event.createdAt).toLocaleString('en-BD')} by{' '}
                              {event.createdBy}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          {/* Customer Info */}
          <div className="bento-dark p-6 sm:p-8">
            <div className="bento-glow -right-10 -top-10 h-40 w-40 bg-primary/20" aria-hidden />
            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-3 text-white/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                  <User className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Customer</span>
              </div>
              <p className="text-xl font-black tracking-tight text-white">{order.customer.name}</p>
              <p className="mt-1 break-all text-sm font-bold text-white/60">
                {order.customer.email}
              </p>
              <p className="text-sm font-bold text-white/60">{order.customer.phone}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="rounded-xl bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
                  {order.customer.totalOrders} total orders
                </span>
                {order.customer.id && (
                  <a
                    href={`/admin/customers/${order.customer.id}`}
                    className="text-xs font-black text-primary transition-colors hover:text-brand-300"
                  >
                    View profile &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bento-card p-6 sm:p-8">
            <SectionHeader title="Shipping Address" icon={MapPin} className="mb-4" />
            <AddressBlock address={order.shippingAddress} />
          </div>

          {/* Billing Address */}
          <div className="bento-card p-6 sm:p-8">
            <SectionHeader title="Billing Address" icon={FileText} className="mb-4" />
            <AddressBlock address={order.billingAddress} />
          </div>

          {/* Payment Info */}
          <div className="bento-card p-6 sm:p-8">
            <SectionHeader title="Payment" icon={CreditCard} className="mb-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-500">Method</span>
                <span className="font-black capitalize text-gray-900">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-500">Status</span>
                <PaymentStatusPill status={order.paymentStatus} />
              </div>
              {order.transactionId && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="shrink-0 font-bold text-gray-500">Transaction ID</span>
                  <span className="truncate font-mono text-xs font-bold text-gray-900">
                    {order.transactionId}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-foreground/[0.04] pt-3 text-sm">
                <span className="font-black text-gray-900">Total Paid</span>
                <span className="font-black tabular-nums text-gray-900">
                  {formatBDT(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bento-card p-6 sm:p-8">
              <SectionHeader title="Order Notes" icon={StickyNote} className="mb-4" />
              <p className="rounded-[1.25rem] bg-amber-50 p-4 text-sm font-medium text-gray-700">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        orderId={orderId}
        orderNumber={order.orderNumber}
        currentStatus={
          order.status.toLowerCase() as
            | 'pending'
            | 'confirmed'
            | 'processing'
            | 'shipped'
            | 'delivered'
            | 'cancelled'
            | 'returned'
        }
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
