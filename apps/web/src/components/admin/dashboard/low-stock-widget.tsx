'use client';

import { AlertTriangle, ArrowUpRight, PackageCheck, ImageIcon } from 'lucide-react';
import Link from 'next/link';

import { useDashboardActivity } from './use-dashboard-activity';

import { SectionHeader } from '@/components/ui/bento';
import { type ActivityData } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Stock Level Indicator
// ──────────────────────────────────────────────────────────

function StockIndicator({ stock, threshold }: { stock: number; threshold: number }) {
  const percentage = Math.min((stock / Math.max(threshold, 1)) * 100, 100);

  let barColor = 'bg-rose-500';
  if (percentage > 50) {
    barColor = 'bg-orange-400';
  }
  if (percentage > 80) {
    barColor = 'bg-emerald-500';
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className={cn(
          'text-[10px] font-black uppercase tracking-wider tabular-nums',
          stock <= 5 ? 'text-rose-500' : 'text-orange-500',
        )}
      >
        {stock} left
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.max(percentage, 4)}%` }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Low Stock Widget
// ──────────────────────────────────────────────────────────

interface LowStockWidgetProps {
  /** Pre-fetched activity; omit to let the widget fetch its own. */
  data?: ActivityData | null;
  loading?: boolean;
  className?: string;
}

/**
 * Widget showing products that are running low on stock.
 * Helps admins quickly identify items that need restocking.
 */
export function LowStockWidget({ data, loading, className }: LowStockWidgetProps = {}) {
  const { activity, isLoading } = useDashboardActivity(data, loading);
  const alerts = activity?.lowStockAlerts ?? [];

  return (
    <div className={cn('bento-card bento-card-hover flex flex-col p-6 sm:p-8', className)}>
      <SectionHeader
        title="Low Stock"
        caption={
          isLoading
            ? 'Checking inventory'
            : `${alerts.length} product${alerts.length !== 1 ? 's' : ''} need restocking`
        }
        action={
          <Link
            href="/admin/products?filter=low-stock"
            className="btn-icon h-10 w-10 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-100"
            aria-label="View all low stock products"
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-gray-50" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[1.5rem] bg-emerald-50/60 px-6 py-8 text-center">
          <PackageCheck className="h-8 w-8 text-emerald-500" strokeWidth={2.25} />
          <p className="mt-3 text-sm font-black text-gray-900">All stocked up</p>
          <p className="mt-1 text-xs font-bold text-gray-500">No products below their threshold.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {alerts.slice(0, 6).map((alert) => (
            <div key={alert.id} className="group/item flex items-center gap-3">
              {/* Product Image */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-foreground/[0.04] bg-gray-50 transition-transform group-hover/item:scale-105">
                {alert.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alert.image} alt={alert.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gray-300" />
                )}
              </div>

              {/* Product Info */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/products/${alert.id}/edit`}
                  className="block truncate text-sm font-black text-gray-900 transition-colors hover:text-primary"
                >
                  {alert.name}
                </Link>
                <p className="text-[10px] font-bold tracking-wider text-gray-400">
                  SKU {alert.sku}
                </p>
              </div>

              {/* Stock Level */}
              <StockIndicator stock={alert.stock} threshold={alert.lowStockThreshold} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && alerts.length > 0 && (
        <Link
          href="/admin/products?filter=low-stock"
          className="mt-6 flex items-center justify-center gap-1.5 rounded-2xl bg-gray-50 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
