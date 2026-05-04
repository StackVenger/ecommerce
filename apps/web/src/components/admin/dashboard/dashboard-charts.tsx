'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import type { DateRange } from '@/components/admin/analytics/date-range-picker';

import { fetchDashboardCharts, formatBDT, type ChartsData } from '@/lib/api/admin';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
);

const PIE_PALETTE = [
  '#0d9488',
  '#4f46e5',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

interface DashboardChartsProps {
  dateRange: DateRange;
}

type ChartView = 'both' | 'revenue' | 'orders';

export function DashboardCharts({ dateRange }: DashboardChartsProps) {
  const [data, setData] = useState<ChartsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ChartView>('both');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const charts = await fetchDashboardCharts(dateRange);
        if (!cancelled) {
          setData(charts);
        }
      } catch (err) {
        console.error('Failed to load chart data:', err);
        if (!cancelled) {
          setError('Failed to load chart data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50 xl:col-span-2" />
        <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-gray-50 xl:col-span-3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error ?? 'No chart data available'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <RevenueOrdersChart points={data.revenueOverTime} view={view} onViewChange={setView} />
      </div>
      <CategoryDoughnut data={data.revenueByCategory} />
      <div className="xl:col-span-3">
        <TopProductsChart data={data.topProducts} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Revenue & Orders dual-axis line chart
// ──────────────────────────────────────────────────────────

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

function RevenueOrdersChart({
  points,
  view,
  onViewChange,
}: {
  points: RevenuePoint[];
  view: ChartView;
  onViewChange: (v: ChartView) => void;
}) {
  const labels = useMemo(
    () =>
      points.map((p) =>
        new Date(p.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      ),
    [points],
  );

  const showRevenue = view !== 'orders';
  const showOrders = view !== 'revenue';

  const chartData = {
    labels,
    datasets: [
      ...(showRevenue
        ? [
            {
              label: 'Revenue (৳)',
              data: points.map((p) => p.revenue),
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              fill: true,
              tension: 0.35,
              yAxisID: 'y',
              pointRadius: 2,
              pointHoverRadius: 5,
              borderWidth: 2,
            },
          ]
        : []),
      ...(showOrders
        ? [
            {
              label: 'Orders',
              data: points.map((p) => p.orders),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              fill: true,
              tension: 0.35,
              yAxisID: 'y1',
              pointRadius: 2,
              pointHoverRadius: 5,
              borderWidth: 2,
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label ?? '';
            const value = Number(ctx.parsed.y);
            return label.startsWith('Revenue')
              ? `${label}: ${formatBDT(value)}`
              : `${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280' } },
      y: {
        type: 'linear',
        position: 'left',
        display: showRevenue,
        grid: { color: '#f3f4f6' },
        ticks: {
          color: '#6b7280',
          callback: (value) => `৳${(Number(value) / 1000).toFixed(0)}k`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        display: showOrders,
        grid: { drawOnChartArea: false },
        ticks: { color: '#6b7280', precision: 0 },
      },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue & Orders</h3>
          <p className="text-sm text-gray-500">Daily totals across the selected range</p>
        </div>
        <div className="flex rounded-lg border border-gray-200">
          {(['both', 'revenue', 'orders'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                view === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="h-80">
        {points.length === 0 ? <EmptyChart /> : <Line data={chartData} options={options} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Top products horizontal bar chart
// ──────────────────────────────────────────────────────────

interface TopProductRow {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

function TopProductsChart({ data }: { data: TopProductRow[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const chartData = {
    labels: sorted.map((p) => p.name),
    datasets: [
      {
        label: 'Revenue (৳)',
        data: sorted.map((p) => p.revenue),
        backgroundColor: 'rgba(13, 148, 136, 0.85)',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 18,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const product = sorted[ctx.dataIndex];
            return [
              `Revenue: ${formatBDT(Number(ctx.parsed.x))}`,
              `Units sold: ${product?.totalSold ?? 0}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#f3f4f6' },
        ticks: {
          color: '#6b7280',
          callback: (value) => `৳${(Number(value) / 1000).toFixed(0)}k`,
        },
      },
      y: { grid: { display: false }, ticks: { color: '#6b7280' } },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Products by Revenue</h3>
        <p className="text-sm text-gray-500">Best sellers in the selected range</p>
      </div>
      <div className="h-96">
        {sorted.length === 0 ? <EmptyChart /> : <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Revenue by category doughnut
// ──────────────────────────────────────────────────────────

interface CategoryRow {
  category: string;
  revenue: number;
  percentage: number;
}

function CategoryDoughnut({ data }: { data: CategoryRow[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const chartData = {
    labels: sorted.map((c) => c.category),
    datasets: [
      {
        data: sorted.map((c) => c.revenue),
        backgroundColor: PIE_PALETTE,
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, boxHeight: 12, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const row = sorted[ctx.dataIndex];
            const pct = row?.percentage ?? 0;
            return `${ctx.label}: ${formatBDT(Number(ctx.parsed))} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
        <p className="text-sm text-gray-500">Top {sorted.length} categories</p>
      </div>
      <div className="h-72">
        {sorted.length === 0 ? <EmptyChart /> : <Doughnut data={chartData} options={options} />}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No data for this range
    </div>
  );
}
