'use client';

import {
  AlertTriangle,
  Eye,
  Search,
  ShoppingBag,
  TrendingUp,
  Heart,
  ShoppingCart,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { ConversionFunnel } from '@/components/admin/analytics/conversion-funnel';
import { DateRangePicker, type DateRange } from '@/components/admin/analytics/date-range-picker';
import { MostSearchedChart } from '@/components/admin/analytics/most-searched-chart';
import { MostViewedChart } from '@/components/admin/analytics/most-viewed-chart';
import {
  BentoGlow,
  PageHeader,
  SectionHeader,
  SkeletonBlock,
  StatCard,
} from '@/components/ui/bento';
import {
  fetchAnalyticsOverview,
  formatBDT,
  type AnalyticsOverview,
  type MostOrderedProduct,
  type MostCartedProduct,
  type MostWishlistedProduct,
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Product Rank Table
// ──────────────────────────────────────────────────────────

interface RankTableProps<T> {
  title: string;
  subtitle: string;
  data: T[];
  columns: {
    label: string;
    render: (item: T) => React.ReactNode;
    className?: string;
  }[];
  emptyMessage: string;
  icon?: LucideIcon;
  className?: string;
}

function RankTable<T>({
  title,
  subtitle,
  data,
  columns,
  emptyMessage,
  icon,
  className,
}: RankTableProps<T>) {
  return (
    <div className={cn('bento-card flex flex-col p-6 sm:p-8', className)}>
      <SectionHeader title={title} caption={subtitle} icon={icon} />

      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-[1.5rem] bg-gray-50 py-10 text-center text-sm font-bold text-gray-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="-mx-3 overflow-x-auto">
          <table className="bento-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                {columns.map((col) => (
                  <th key={col.label} className={col.className}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-black tabular-nums',
                        index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>
                  {columns.map((col) => (
                    <td key={col.label} className={col.className}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Analytics Page
// ──────────────────────────────────────────────────────────

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchAnalyticsOverview({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 10,
      });
      setData(result);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Product Analytics"
          description="Track product performance and customer behavior"
          actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
        />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-44 rounded-[2rem] md:col-span-3" />
          ))}
          <SkeletonBlock className="col-span-2 h-80 rounded-[2rem] md:col-span-6 xl:col-span-12" />
          <SkeletonBlock className="col-span-2 h-96 rounded-[2rem] md:col-span-6" />
          <SkeletonBlock className="col-span-2 h-96 rounded-[2rem] md:col-span-6" />
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div>
        <PageHeader
          title="Product Analytics"
          description="Track product performance and customer behavior"
        />
        <div className="bento-card flex flex-col items-center gap-4 p-10 text-center">
          <div className="icon-tile bg-rose-50 text-rose-500">
            <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <p className="text-sm font-black text-gray-900">{error ?? 'Something went wrong'}</p>
          <button type="button" onClick={loadData} className="btn btn-dark btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Content ───────────────────────────────────────────────────────

  const totalSearches = data.mostSearched.reduce((sum, t) => sum + t.searchCount, 0);

  return (
    <div>
      <PageHeader
        title="Product Analytics"
        description="Track product performance and customer behavior — values in BDT (৳)"
        actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
        className="xl:items-end"
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
        {/* KPI tiles — conversion rate leads as the coral hero */}
        <div className="bento-primary col-span-2 flex flex-col justify-between gap-6 p-7 md:col-span-6 xl:col-span-3">
          <BentoGlow variant="primary" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <TrendingUp className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <span className="rounded-xl bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Views → Orders
            </span>
          </div>
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">
              Conversion Rate
            </p>
            <p className="text-5xl font-black tabular-nums tracking-tighter">
              {data.funnel.overallConversionRate}%
            </p>
          </div>
        </div>
        <StatCard
          label="Total Views"
          value={data.funnel.totalViews.toLocaleString()}
          icon={Eye}
          tone="indigo"
          className="md:col-span-2 xl:col-span-3"
        />
        <StatCard
          label="Total Searches"
          value={totalSearches.toLocaleString()}
          icon={Search}
          tone="purple"
          className="md:col-span-2 xl:col-span-3"
        />
        <StatCard
          label="Total Orders"
          value={data.funnel.totalOrders.toLocaleString()}
          icon={ShoppingBag}
          tone="emerald"
          className="col-span-2 md:col-span-2 xl:col-span-3"
        />

        {/* Conversion Funnel */}
        <div className="col-span-2 md:col-span-6 xl:col-span-12">
          <ConversionFunnel data={data.funnel} />
        </div>

        {/* Charts Row: Most Viewed + Most Searched */}
        <div className="col-span-2 md:col-span-6">
          <MostViewedChart data={data.mostViewed} />
        </div>
        <div className="col-span-2 md:col-span-6">
          <MostSearchedChart data={data.mostSearched} />
        </div>

        {/* Tables Row: Most Ordered + Most Carted */}
        <RankTable<MostOrderedProduct>
          title="Most Ordered Products"
          subtitle="Best sellers by quantity"
          data={data.mostOrdered}
          emptyMessage="No order data available yet."
          icon={Trophy}
          className="col-span-2 md:col-span-6"
          columns={[
            {
              label: 'Product',
              render: (item) => (
                <span className="text-sm font-black text-gray-900">{item.name}</span>
              ),
            },
            {
              label: 'Units Sold',
              render: (item) => (
                <span className="font-black tabular-nums text-gray-700">
                  {item.totalQuantity.toLocaleString()}
                </span>
              ),
              className: 'text-right',
            },
            {
              label: 'Revenue',
              render: (item) => (
                <span className="font-black tabular-nums tracking-tight text-primary">
                  {formatBDT(item.totalRevenue)}
                </span>
              ),
              className: 'text-right',
            },
          ]}
        />

        <RankTable<MostCartedProduct>
          title="Most Added to Cart"
          subtitle="Products customers add to cart most"
          data={data.mostCarted}
          emptyMessage="No cart data available yet."
          icon={ShoppingCart}
          className="col-span-2 md:col-span-6"
          columns={[
            {
              label: 'Product',
              render: (item) => (
                <span className="text-sm font-black text-gray-900">{item.name}</span>
              ),
            },
            {
              label: 'Cart Adds',
              render: (item) => (
                <div className="flex items-center justify-end gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-black tabular-nums text-gray-700">
                    {item.cartAddCount.toLocaleString()}
                  </span>
                </div>
              ),
              className: 'text-right',
            },
          ]}
        />

        {/* Most Wishlisted */}
        <RankTable<MostWishlistedProduct>
          title="Most Wishlisted Products"
          subtitle="Products customers save to their wishlists"
          data={data.mostWishlisted}
          emptyMessage="No wishlist data available yet."
          icon={Heart}
          className="col-span-2 md:col-span-6 xl:col-span-12"
          columns={[
            {
              label: 'Product',
              render: (item) => (
                <span className="text-sm font-black text-gray-900">{item.name}</span>
              ),
            },
            {
              label: 'Wishlist Adds',
              render: (item) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <span className="font-black tabular-nums text-gray-700">
                    {item.wishlistCount.toLocaleString()}
                  </span>
                </div>
              ),
              className: 'text-right',
            },
          ]}
        />
      </div>
    </div>
  );
}
