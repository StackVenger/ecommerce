'use client';

import { ShoppingCart, UserPlus, AlertTriangle, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { useDashboardActivity } from './use-dashboard-activity';

import { formatBDT, type ActivityData } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Activity Item Types
// ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: 'order' | 'registration' | 'low_stock';
  title: string;
  description: string;
  time: Date;
  href?: string;
  icon: LucideIcon;
  iconClass: string;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mergeAndSortActivities(data: ActivityData): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Add recent orders
  for (const order of data.recentOrders) {
    items.push({
      id: `order-${order.id}`,
      type: 'order',
      title: order.customerName,
      description: `Placed order #${order.orderNumber} · ${formatBDT(order.totalAmount)}`,
      time: new Date(order.createdAt),
      href: `/admin/orders/${order.id}`,
      icon: ShoppingCart,
      iconClass: 'bg-brand-50 text-brand-600',
    });
  }

  // Add recent registrations
  for (const reg of data.recentRegistrations) {
    items.push({
      id: `reg-${reg.id}`,
      type: 'registration',
      title: reg.name,
      description: `Created an account · ${reg.email}`,
      time: new Date(reg.createdAt),
      icon: UserPlus,
      iconClass: 'bg-emerald-50 text-emerald-500',
    });
  }

  // Add low stock alerts
  for (const alert of data.lowStockAlerts) {
    items.push({
      id: `stock-${alert.id}`,
      type: 'low_stock',
      title: 'Low stock alert',
      description: `${alert.name} (SKU: ${alert.sku}) has only ${alert.stock} units left`,
      time: new Date(), // Current time for alerts
      href: `/admin/products/${alert.id}/edit`,
      icon: AlertTriangle,
      iconClass: 'bg-orange-50 text-orange-500',
    });
  }

  // Sort by time, most recent first
  return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 15);
}

// ──────────────────────────────────────────────────────────
// Activity Feed Component
// ──────────────────────────────────────────────────────────

interface ActivityFeedProps {
  /** Pre-fetched activity; omit to let the widget fetch its own. */
  data?: ActivityData | null;
  loading?: boolean;
  /** Max items to render. */
  limit?: number;
  className?: string;
}

/**
 * "Pulse" feed — a chronological list of recent orders, customer
 * registrations, and low stock alerts.
 */
export function ActivityFeed({ data, loading, limit = 15, className }: ActivityFeedProps = {}) {
  const { activity, isLoading } = useDashboardActivity(data, loading);
  const activities = activity ? mergeAndSortActivities(activity).slice(0, limit) : [];

  return (
    <div className={cn('bento-card bento-card-hover flex flex-col p-6 sm:p-8', className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <h3 className="section-title">Pulse</h3>
        </div>
        <span className="eyebrow">Live activity</span>
      </div>

      {/* Activity List */}
      <div className="scrollbar-thin -mr-2 flex max-h-[26rem] flex-1 flex-col gap-6 overflow-y-auto pr-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-gray-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-gray-100" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-50" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-sm font-bold text-gray-400">
            No recent activity.
          </div>
        ) : (
          activities.map((item, i) => {
            const body = (
              <>
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 group-hover/item:scale-110',
                      item.iconClass,
                    )}
                  >
                    <item.icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card',
                      i === 0 ? 'bg-emerald-500' : 'bg-gray-300',
                    )}
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="mb-0.5 truncate text-xs font-black text-gray-900 transition-colors group-hover/item:text-primary">
                    {item.title}
                  </p>
                  <p className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-500">
                    {item.description}
                  </p>
                  <p className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
                    {timeAgo(item.time)}
                  </p>
                </div>
              </>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} className="group/item flex gap-4">
                {body}
              </Link>
            ) : (
              <div key={item.id} className="group/item flex gap-4">
                {body}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 border-t border-foreground/[0.04] pt-5">
        <Link
          href="/admin/orders"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-50 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all hover:bg-primary hover:text-white"
        >
          Open order log
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
