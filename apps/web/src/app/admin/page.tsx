'use client';

import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  DateRangePicker,
  getPresetRange,
  type DateRange,
} from '@/components/admin/analytics/date-range-picker';
import { DashboardCharts } from '@/components/admin/dashboard/dashboard-charts';
import { fetchDashboardStats, formatBDT, type DashboardStats } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  growth: number;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ title, value, growth, icon, iconBg }: KpiCardProps) {
  const isPositive = growth >= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={cn('text-sm font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
          {isPositive ? '+' : ''}
          {growth}%
        </span>
        <span className="text-sm text-gray-500">vs previous period</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Status Card
// ──────────────────────────────────────────────────────────

interface StatusCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href: string;
}

function StatusCard({ title, value, icon, color }: StatusCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Admin Dashboard Page
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview of your store performance — all values in BDT (৳)
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : error || !stats ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error ?? 'Something went wrong'}</p>
        </div>
      ) : (
        <>
          <DashboardContent stats={stats} />
          <DashboardCharts dateRange={dateRange} />
        </>
      )}
    </div>
  );
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatBDT(stats.totalRevenue)}
          growth={stats.revenueGrowth}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          iconBg="bg-green-100"
        />
        <KpiCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          growth={stats.ordersGrowth}
          icon={<ShoppingCart className="h-6 w-6 text-teal-600" />}
          iconBg="bg-teal-100"
        />
        <KpiCard
          title="New Customers"
          value={stats.totalCustomers.toLocaleString()}
          growth={stats.customersGrowth}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <KpiCard
          title="Active Products"
          value={stats.totalProducts.toLocaleString()}
          growth={stats.productsGrowth}
          icon={<Package className="h-6 w-6 text-orange-600" />}
          iconBg="bg-orange-100"
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          color="bg-yellow-100"
          href="/admin/orders?status=PENDING"
        />
        <StatusCard
          title="Processing Orders"
          value={stats.processingOrders}
          icon={<ShoppingCart className="h-5 w-5 text-teal-600" />}
          color="bg-teal-100"
          href="/admin/orders?status=PROCESSING"
        />
        <StatusCard
          title="Low Stock Alerts"
          value={stats.lowStockProducts}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          color="bg-red-100"
          href="/admin/products?filter=low-stock"
        />
      </div>
    </>
  );
}
