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
      className="p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order History"
        description="Track and manage all your orders"
        className="mb-0 sm:mb-0"
      />

      {/* Status Tabs */}
      <div className="scrollbar-none flex overflow-x-auto border-b border-gray-200">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-primary'
              }`}
              aria-pressed={isActive}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} strokeWidth={1.75} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-16" />
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
              <ShoppingBag className="h-4 w-4" />
              Start Shopping
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden overflow-x-auto border border-gray-200 bg-card md:block">
            <table className="bento-table">
              <thead>
                <tr>
                  <th className="pl-5">Order</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th className="hidden xl:table-cell">Payment</th>
                  <th className="text-right">Total</th>
                  <th className="pr-5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="pl-5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="whitespace-nowrap font-medium text-gray-900 transition-colors hover:text-primary"
                        >
                          #{order.orderNumber}
                        </Link>
                        <CopyOrderNumberButton orderNumber={order.orderNumber} />
                      </div>
                      <p className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="hidden shrink-0 -space-x-2 xl:flex">
                          {order.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="h-10 w-10 overflow-hidden border border-gray-200 bg-gray-50"
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="flex h-10 w-10 items-center justify-center border border-gray-200 bg-gray-100">
                              <span className="text-[11px] font-semibold text-gray-700">
                                +{order.items.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[11rem] xl:max-w-[12rem]">
                          <p className="truncate text-gray-700">
                            {order.items.map((item) => item.productName).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <PaymentBadge status={order.status} size="sm" />
                    </td>
                    <td className="hidden xl:table-cell">
                      {order.paymentMethod && (
                        <PaymentMethodIcon method={order.paymentMethod} size="sm" />
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold tabular-nums text-gray-900">
                      {order.totalFormatted}
                    </td>
                    <td className="pr-5 text-right">
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked rows */}
          <ul className="divide-y divide-gray-200 border border-gray-200 bg-card md:hidden">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="group block px-4 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <p className="truncate font-medium text-gray-900 transition-colors group-hover:text-primary">
                        #{order.orderNumber}
                      </p>
                      <CopyOrderNumberButton orderNumber={order.orderNumber} />
                    </div>
                    <p className="shrink-0 font-bold tabular-nums text-gray-900">
                      {order.totalFormatted}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-600">
                    {order.items.map((item) => item.productName).join(', ')}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} •{' '}
                      {formatDate(order.createdAt)}
                    </p>
                    <PaymentBadge status={order.status} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing{' '}
            <span className="text-gray-900">
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="text-gray-900">{pagination.total}</span> orders
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center gap-1 border border-gray-200 px-3 text-sm text-gray-700 transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="inline-flex h-9 min-w-[2.25rem] items-center justify-center border border-primary bg-primary px-3 text-sm font-medium tabular-nums text-white">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasMore}
              className="inline-flex h-9 items-center gap-1 border border-gray-200 px-3 text-sm text-gray-700 transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
