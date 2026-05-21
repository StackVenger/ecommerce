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
      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      title="Copy order ID"
      aria-label={`Copy order ID ${orderNumber}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
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
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Order History</h2>
        <p className="text-sm text-gray-500 mt-1">Track and manage all your orders</p>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto px-4 pt-3 gap-1 scrollbar-hide">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
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
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-20 bg-gray-200 rounded" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-36 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {activeTab
              ? `You don't have any ${activeTab.toLowerCase()} orders.`
              : "You haven't placed any orders yet."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary transition-all"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Order #{order.orderNumber}</p>
                  <CopyOrderNumberButton orderNumber={order.orderNumber} />
                  <PaymentBadge status={order.status} size="sm" />
                </div>
                <p className="text-lg font-bold text-gray-900">{order.totalFormatted}</p>
              </div>

              {/* Order Items Preview */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  {/* Product Thumbnails */}
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-white overflow-hidden"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500">
                          +{order.items.length - 3}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {order.items.map((item) => item.productName).join(', ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} •{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {order.paymentMethod && (
                    <PaymentMethodIcon method={order.paymentMethod} size="sm" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            orders
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium text-gray-700 px-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasMore}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
