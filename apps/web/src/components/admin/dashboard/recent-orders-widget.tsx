'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { useDashboardActivity } from './use-dashboard-activity';

import { OrderStatusPill } from '@/components/admin/orders/order-status';
import { EmptyState, SectionHeader } from '@/components/ui/bento';
import { formatBDT, type ActivityData } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Recent Orders Widget
// ──────────────────────────────────────────────────────────

interface RecentOrdersWidgetProps {
  /** Pre-fetched activity; omit to let the widget fetch its own. */
  data?: ActivityData | null;
  loading?: boolean;
  className?: string;
}

/**
 * Ledger of the most recent orders with status, customer, and order
 * amount in BDT (৳).
 */
export function RecentOrdersWidget({ data, loading, className }: RecentOrdersWidgetProps = {}) {
  const { activity, isLoading } = useDashboardActivity(data, loading);
  const orders = activity?.recentOrders ?? [];

  return (
    <div className={cn('bento-card flex flex-col p-6 sm:p-8', className)}>
      <SectionHeader
        title="Recent Orders"
        caption="Latest customer orders"
        action={
          <Link
            href="/admin/orders"
            className="btn-icon h-10 w-10 rounded-xl bg-ink text-white shadow-lg shadow-black/10 hover:bg-ink-soft"
            aria-label="View all orders"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-50" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          bare
          icon={ShoppingBag}
          title="No orders yet"
          description="New orders will show up here as they come in."
          className="py-8"
        />
      ) : (
        <div className="-mx-3 overflow-x-auto">
          <table className="bento-table min-w-[560px]">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="text-center">Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 7).map((order) => (
                <tr key={order.id} className="group">
                  <td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex flex-col transition-colors group-hover:text-primary"
                    >
                      <span className="text-sm font-black leading-none text-gray-900 group-hover:text-primary">
                        #{order.orderNumber}
                      </span>
                      <span className="mt-1 text-[10px] font-bold tracking-wider text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="block max-w-[180px] truncate text-sm font-bold text-gray-800">
                      {order.customerName}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="text-center">
                    <OrderStatusPill status={order.status} />
                  </td>
                  <td className="text-right">
                    <span className="text-sm font-black tabular-nums tracking-tight text-gray-900">
                      {formatBDT(order.totalAmount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
