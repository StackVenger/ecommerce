'use client';

import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { PaymentBadge } from '@/components/payment/payment-badge';
import { PaymentMethodIcon } from '@/components/payment/payment-method-icon';
import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/bento';
import { getOrderHistory, type Order, type OrderPagination } from '@/lib/api/orders';
import { copyTextToClipboard } from '@/lib/clipboard';

const statusTabs = [
  { key: '', label: 'All', icon: Package },
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Settings },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
  { key: 'CANCELLED', label: 'Cancelled', icon: XCircle },
];

// Lives inside the order-card <Link>, so the click handler must stop
// navigation while still copying the order number to the clipboard.
function CopyOrderNumberButton({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyTextToClipboard(orderNumber);
    if (!ok) {
      toast.error('Could not copy order ID');
      return;
    }
    setCopied(true);
    toast.success(`Copied ${orderNumber}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
      title="Copy order ID"
      aria-label={`Copy order ID ${orderNumber}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<OrderPagination | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getOrderHistory({
        page: currentPage,
        limit: 10,
        status: activeTab || undefined,
      });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Order History"
        description="Track and manage all your orders"
        className="mb-0 sm:mb-0"
      />

      {/* Status Tabs */}
      <div className="rounded-[1.5rem] border border-foreground/[0.04] bg-card p-2 shadow-bento">
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`chip ${isActive ? 'chip-active' : ''}`}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonBlock key={i} className="h-40 rounded-[2rem] bg-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description={
            activeTab
              ? `You don't have any ${activeTab.toLowerCase()} orders.`
              : "You haven't placed any orders yet."
          }
          action={
            <Link href="/" className="btn btn-primary">
              <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
              Start Shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="bento-card bento-card-hover group block p-5 sm:p-6"
            >
              {/* Order Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow mb-1">Order</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-black tracking-tight text-gray-900 transition-colors group-hover:text-primary">
                      #{order.orderNumber}
                    </p>
                    <CopyOrderNumberButton orderNumber={order.orderNumber} />
                    <PaymentBadge status={order.status} size="sm" />
                  </div>
                </div>
                <p className="text-xl font-black tabular-nums tracking-tighter text-gray-900">
                  {order.totalFormatted}
                </p>
              </div>

              {/* Order Items Preview */}
              <div className="mt-4 flex items-center gap-4 rounded-[1.5rem] bg-gray-50 p-3">
                {/* Product Thumbnails */}
                <div className="flex shrink-0 -space-x-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="h-12 w-12 overflow-hidden rounded-[1rem] border-2 border-card bg-card shadow-sm"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border-2 border-card bg-brand-50 shadow-sm">
                      <span className="text-[10px] font-black text-brand-700">
                        +{order.items.length - 3}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-700">
                    {order.items.map((item) => item.productName).join(', ')}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-gray-500">
                    {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} •{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-BD', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {order.paymentMethod && (
                  <div className="hidden sm:block">
                    <PaymentMethodIcon method={order.paymentMethod} size="sm" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bento-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] font-bold text-gray-500">
            Showing{' '}
            <span className="text-gray-900">
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="text-gray-900">{pagination.total}</span> orders
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-soft btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              Prev
            </button>

            <span className="px-2 text-xs font-black tabular-nums text-gray-700">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasMore}
              className="btn btn-dark btn-sm"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
