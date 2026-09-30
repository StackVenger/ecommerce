'use client';

import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Package,
  PackageOpen,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  DateRangePicker,
  getPresetRange,
  type DateRange,
} from '@/components/admin/analytics/date-range-picker';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import {
  CategoryRevenueCard,
  SalesFlowCard,
  TopProductsCard,
  useDashboardCharts,
} from '@/components/admin/dashboard/dashboard-charts';
import { LowStockWidget } from '@/components/admin/dashboard/low-stock-widget';
import { QuickActions } from '@/components/admin/dashboard/quick-actions';
import { RecentOrdersWidget } from '@/components/admin/dashboard/recent-orders-widget';
import { useDashboardActivity } from '@/components/admin/dashboard/use-dashboard-activity';
import { PageHeader, SkeletonBlock, StatCard, TrendPill } from '@/components/ui/bento';
import { fetchDashboardStats, formatBDT, type DashboardStats } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Admin Dashboard Page — bento overview
// ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange('1m'));

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchDashboardStats(dateRange);
        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load dashboard statistics');
        }
        console.error('Dashboard stats error:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your store pulse at a glance — all values in BDT (৳)"
        actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
        className="xl:items-end"
      />

      {error && !isLoading ? (
        <div className="bento-card flex flex-col items-center gap-3 p-10 text-center">
          <div className="icon-tile bg-rose-50 text-rose-500">
            <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <p className="text-sm font-semibold text-gray-900">{error ?? 'Something went wrong'}</p>
        </div>
      ) : (
        <DashboardGrid stats={stats} statsLoading={isLoading} dateRange={dateRange} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Bento grid
// ──────────────────────────────────────────────────────────

function DashboardGrid({
  stats,
  statsLoading,
  dateRange,
}: {
  stats: DashboardStats | null;
  statsLoading: boolean;
  dateRange: DateRange;
}) {
  const charts = useDashboardCharts(dateRange);
  // Fetched once here and shared by the Pulse, ledger and stock tiles.
  const { activity: activityData, isLoading: activityLoading } = useDashboardActivity();
  const activity = { data: activityData ?? null, isLoading: activityLoading };

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
      {/* ── Row 1: KPI tiles ─────────────────────────────── */}
      <RevenueHero
        stats={stats}
        loading={statsLoading}
        className="col-span-2 md:col-span-6 xl:col-span-4"
      />
      <OrdersTile stats={stats} loading={statsLoading} className="md:col-span-3 xl:col-span-2" />
      <CustomersTile stats={stats} loading={statsLoading} className="md:col-span-3 xl:col-span-2" />
      <AttentionTile
        stats={stats}
        loading={statsLoading}
        className="col-span-2 md:col-span-6 xl:col-span-4"
      />

      {/* ── Row 2: sales flow · pulse · quick stats ───────── */}
      <SalesFlowCard
        points={charts.data?.revenueOverTime ?? []}
        loading={charts.isLoading}
        growth={stats?.revenueGrowth}
        className="col-span-2 md:col-span-6 xl:col-span-5"
      />
      <ActivityFeed
        data={activity.data}
        loading={activity.isLoading}
        limit={8}
        className="col-span-2 md:col-span-3 xl:col-span-3"
      />
      <div className="col-span-2 grid grid-cols-2 gap-4 sm:gap-6 md:col-span-3 xl:col-span-4">
        <HubStat
          href="/admin/products"
          label="Active Products"
          value={stats?.totalProducts.toLocaleString()}
          icon={Package}
          tone="purple"
          loading={statsLoading}
        />
        <HubStat
          href="/admin/orders"
          label="Pending"
          value={stats?.pendingOrders.toLocaleString()}
          icon={Clock}
          tone="orange"
          loading={statsLoading}
        />
        <HubStat
          href="/admin/orders"
          label="Processing"
          value={stats?.processingOrders.toLocaleString()}
          icon={PackageOpen}
          tone="blue"
          loading={statsLoading}
        />
        <HubStat
          href="/admin/products?filter=low-stock"
          label="Low Stock"
          value={stats?.lowStockProducts.toLocaleString()}
          icon={AlertTriangle}
          tone="rose"
          loading={statsLoading}
        />
      </div>

      {/* ── Row 3: order ledger · category segments ──────── */}
      <RecentOrdersWidget
        data={activity.data}
        loading={activity.isLoading}
        className="col-span-2 md:col-span-6 xl:col-span-8"
      />
      <CategoryRevenueCard
        data={charts.data?.revenueByCategory ?? []}
        loading={charts.isLoading}
        className="col-span-2 md:col-span-6 xl:col-span-4"
      />

      {/* ── Row 4: top products · stock + shortcuts ──────── */}
      <TopProductsCard
        data={charts.data?.topProducts ?? []}
        loading={charts.isLoading}
        className="col-span-2 md:col-span-6 xl:col-span-8"
      />
      <div className="col-span-2 flex flex-col gap-4 sm:gap-6 md:col-span-6 xl:col-span-4">
        <LowStockWidget data={activity.data} loading={activity.isLoading} className="flex-1" />
        <QuickActions />
      </div>

      {charts.error && (
        <p className="col-span-2 text-xs font-bold text-rose-500 md:col-span-6 xl:col-span-12">
          {charts.error}
        </p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// KPI tiles
// ──────────────────────────────────────────────────────────

interface TileProps {
  stats: DashboardStats | null;
  loading: boolean;
  className?: string;
}

function RevenueHero({ stats, loading, className }: TileProps) {
  const avgOrder = stats && stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  return (
    <div
      className={cn(
        'bento-card bento-card-hover group flex flex-col items-center justify-center p-8 text-center sm:p-10',
        className,
      )}
    >
      <div className="icon-tile mb-6 h-16 w-16 bg-orange-50 text-orange-500">
        <Wallet className="h-8 w-8" strokeWidth={2.25} />
      </div>
      <p className="eyebrow mb-2">Total Revenue</p>
      {loading || !stats ? (
        <SkeletonBlock className="mb-4 h-12 w-48" />
      ) : (
        <h2 className="stat-value mb-4 text-4xl sm:text-5xl">{formatBDT(stats.totalRevenue)}</h2>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {stats && <TrendPill value={stats.revenueGrowth} />}
        <span className="text-xs text-gray-500">vs previous period</span>
      </div>
      <div className="mt-6 w-full max-w-[16rem] border border-gray-200 px-4 py-3">
        <p className="eyebrow">Avg. order value</p>
        <p className="mt-1 text-lg font-heading font-semibold tabular-nums text-gray-900">
          {loading || !stats ? '—' : formatBDT(avgOrder)}
        </p>
      </div>
    </div>
  );
}

function OrdersTile({ stats, loading, className }: TileProps) {
  return (
    <Link
      href="/admin/orders"
      className={cn(
        'bento-card group flex flex-col items-center justify-center p-5 text-center transition-all sm:p-8 hover:border-gray-300 hover:shadow-bento-hover',
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <div className="icon-tile mb-6 h-14 w-14 bg-indigo-50 text-indigo-500">
          <ShoppingBag className="h-7 w-7" strokeWidth={2.25} />
        </div>
        <p className="eyebrow mb-2">Total Orders</p>
        {loading || !stats ? (
          <SkeletonBlock className="h-10 w-20" />
        ) : (
          <h2 className="stat-value text-3xl sm:text-4xl">{stats.totalOrders.toLocaleString()}</h2>
        )}
        {stats && (
          <span className="mt-3 bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">
            {stats.ordersGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.ordersGrowth).toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}

function CustomersTile({ stats, loading, className }: TileProps) {
  return (
    <Link
      href="/admin/customers"
      className={cn(
        'bento-card group flex flex-col items-center justify-center p-5 text-center transition-all sm:p-8 hover:border-blue-500/20 hover:shadow-bento-hover',
        className,
      )}
    >
      <div className="icon-tile mb-6 h-14 w-14 bg-blue-50 text-blue-500">
        <Users className="h-7 w-7" strokeWidth={2.25} />
      </div>
      {loading || !stats ? (
        <SkeletonBlock className="mb-2 h-10 w-20" />
      ) : (
        <h2 className="stat-value mb-1 text-3xl sm:text-4xl">
          {stats.totalCustomers.toLocaleString()}
        </h2>
      )}
      <p className="eyebrow">New Customers</p>
      {stats && <TrendPill value={stats.customersGrowth} className="mt-3" />}
    </Link>
  );
}

function AttentionTile({ stats, loading, className }: TileProps) {
  const pending = stats?.pendingOrders ?? 0;
  return (
    <div className={cn('bento-card border-t-2 border-t-primary p-8', className)}>
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between">
          <div className="icon-tile bg-brand-50 text-primary">
            <ArrowUpRight className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <span className="bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {loading ? '…' : `${stats?.processingOrders ?? 0} processing`}
          </span>
        </div>
        <div>
          <p className="eyebrow mb-2">Needs attention</p>
          <h3 className="mb-5 font-heading text-xl font-semibold leading-snug text-gray-900">
            {loading
              ? 'Checking your order queue…'
              : pending > 0
                ? `${pending.toLocaleString()} order${pending === 1 ? ' is' : 's are'} waiting to be confirmed.`
                : 'Your order queue is clear. Nice work!'}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders" className="btn btn-primary btn-sm">
              Review orders
            </Link>
            <Link href="/admin/products/new" className="btn btn-secondary btn-sm">
              Add product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HubStat({
  href,
  label,
  value,
  icon,
  tone,
  loading,
}: {
  href: string;
  label: string;
  value: string | undefined;
  icon: typeof Package;
  tone: 'purple' | 'orange' | 'blue' | 'rose';
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <StatCard
        label={label}
        value={value ?? '—'}
        icon={icon}
        tone={tone}
        loading={loading}
        className="h-full p-5 sm:p-6"
      />
    </Link>
  );
}
