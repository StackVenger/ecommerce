'use client';

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { BarChart3, PieChart, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Chart } from 'react-chartjs-2';

import type { DateRange } from '@/components/admin/analytics/date-range-picker';

import { EmptyState, SectionHeader, SkeletonBlock, TrendPill } from '@/components/ui/bento';
import { fetchDashboardCharts, formatBDT, type ChartsData } from '@/lib/api/admin';
import { chartNeutrals } from '@/lib/theme/chart-colors';
import { useIsDark } from '@/lib/theme/color-mode';
import { cn } from '@/lib/utils';

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
);

// Bento chart palette — coral primary with indigo / emerald secondaries.
export const CHART_CORAL = '#f46e54';
export const CHART_CORAL_SOFT = 'rgba(244, 110, 84, 0.16)';
export const CHART_CORAL_HOVER = 'rgba(244, 110, 84, 0.35)';
export const CHART_INDIGO = '#4f46e5';
export const CHART_EMERALD = '#10b981';
export const CHART_TICK = '#a8a49e';
export const CHART_GRID = 'rgba(26, 26, 26, 0.04)';

/**
 * Canvas text can't resolve `var(--font-inter)`, so copy the computed
 * body font stack into Chart.js once on the client.
 */
export function useChartFontDefaults() {
  const isDark = useIsDark();
  useEffect(() => {
    const family = getComputedStyle(document.body).fontFamily;
    if (family) {
      ChartJS.defaults.font.family = family;
    }
    ChartJS.defaults.color = chartNeutrals(isDark).tick;
  }, [isDark]);
}

// ──────────────────────────────────────────────────────────
// Data hook
// ──────────────────────────────────────────────────────────

export function useDashboardCharts(dateRange: DateRange) {
  const [data, setData] = useState<ChartsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { data, isLoading, error };
}

// ──────────────────────────────────────────────────────────
// Composite (kept for callers that want all charts at once)
// ──────────────────────────────────────────────────────────

interface DashboardChartsProps {
  dateRange: DateRange;
}

export function DashboardCharts({ dateRange }: DashboardChartsProps) {
  const { data, isLoading, error } = useDashboardCharts(dateRange);

  if (!isLoading && (error || !data)) {
    return (
      <div className="bento-card p-6 text-center text-sm font-bold text-rose-600">
        {error ?? 'No chart data available'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
      <SalesFlowCard
        points={data?.revenueOverTime ?? []}
        loading={isLoading}
        className="lg:col-span-8"
      />
      <CategoryRevenueCard
        data={data?.revenueByCategory ?? []}
        loading={isLoading}
        className="lg:col-span-4"
      />
      <TopProductsCard
        data={data?.topProducts ?? []}
        loading={isLoading}
        className="lg:col-span-12"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sales flow — revenue bars + orders line
// ──────────────────────────────────────────────────────────

type ChartView = 'both' | 'revenue' | 'orders';

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export function SalesFlowCard({
  points,
  loading = false,
  growth,
  className,
}: {
  points: RevenuePoint[];
  loading?: boolean;
  /** Revenue growth % vs previous period, rendered as a trend pill. */
  growth?: number;
  className?: string;
}) {
  useChartFontDefaults();
  const neutral = chartNeutrals(useIsDark());
  const [view, setView] = useState<ChartView>('both');

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

  const totalRevenue = useMemo(() => points.reduce((sum, p) => sum + p.revenue, 0), [points]);
  const totalOrders = useMemo(() => points.reduce((sum, p) => sum + p.orders, 0), [points]);
  const peakIndex = useMemo(() => {
    let idx = -1;
    let max = 0;
    points.forEach((p, i) => {
      if (p.revenue > max) {
        max = p.revenue;
        idx = i;
      }
    });
    return idx;
  }, [points]);

  const showRevenue = view !== 'orders';
  const showOrders = view !== 'revenue';

  const chartData: ChartData<'bar' | 'line', number[], string> = {
    labels,
    datasets: [
      ...(showRevenue
        ? [
            {
              type: 'bar' as const,
              label: 'Revenue (৳)',
              data: points.map((p) => p.revenue),
              backgroundColor: points.map((_, i) =>
                i === peakIndex ? CHART_CORAL : CHART_CORAL_SOFT,
              ),
              hoverBackgroundColor: points.map((_, i) =>
                i === peakIndex ? CHART_CORAL : CHART_CORAL_HOVER,
              ),
              borderRadius: 999,
              borderSkipped: false,
              maxBarThickness: 28,
              categoryPercentage: 0.8,
              barPercentage: 0.85,
              yAxisID: 'y',
              order: 2,
            },
          ]
        : []),
      ...(showOrders
        ? [
            {
              type: 'line' as const,
              label: 'Orders',
              data: points.map((p) => p.orders),
              borderColor: CHART_INDIGO,
              backgroundColor: 'rgba(79, 70, 229, 0.08)',
              fill: !showRevenue,
              tension: 0.4,
              yAxisID: 'y1',
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: neutral.pointBg,
              pointHoverBorderWidth: 2,
              borderWidth: 2.5,
              order: 1,
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: neutral.tooltipBg,
        padding: 12,
        cornerRadius: 14,
        titleFont: { weight: 'bold' },
        bodyFont: { weight: 'bold' },
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label ?? '';
            const value = Number(ctx.parsed.y);
            return label.startsWith('Revenue')
              ? ` ${label}: ${formatBDT(value)}`
              : ` ${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: neutral.tick,
          font: { size: 10, weight: 'bold' },
          maxRotation: 0,
          autoSkipPadding: 12,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        display: showRevenue,
        grid: { color: neutral.grid },
        border: { display: false },
        beginAtZero: true,
        ticks: {
          color: neutral.tick,
          font: { size: 10, weight: 'bold' },
          callback: (value) => `৳${(Number(value) / 1000).toFixed(0)}k`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        display: showOrders,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: { color: neutral.tick, font: { size: 10, weight: 'bold' }, precision: 0 },
      },
    },
  };

  return (
    <div className={cn('bento-card relative flex flex-col overflow-hidden p-6 sm:p-8', className)}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,110,84,0.05)_0%,transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <SectionHeader
          title="Sales Flow"
          caption="Daily revenue & orders"
          action={
            <div className="flex items-center gap-1 rounded-2xl bg-gray-50 p-1">
              {(['both', 'revenue', 'orders'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn('chip px-3 py-1.5 capitalize', view === v && 'chip-active')}
                >
                  {v}
                </button>
              ))}
            </div>
          }
          className="flex-wrap"
        />

        <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="eyebrow mb-1">Range revenue</p>
            {loading ? (
              <SkeletonBlock className="h-10 w-40" />
            ) : (
              <p className="stat-value text-4xl sm:text-5xl">{formatBDT(totalRevenue)}</p>
            )}
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            {growth !== undefined && <TrendPill value={growth} />}
            <span className="text-[11px] font-bold text-gray-400">
              {totalOrders.toLocaleString()} orders in range
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4 pb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-[#4f46e5]" /> Orders
            </span>
          </div>
        </div>

        <div className="h-64 min-h-[16rem] flex-1 sm:h-72">
          {loading ? (
            <SkeletonBlock className="h-full w-full rounded-[1.5rem]" />
          ) : points.length === 0 ? (
            <EmptyChart />
          ) : (
            <Chart type="bar" data={chartData} options={options} />
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Revenue by category — dark segment tile
// ──────────────────────────────────────────────────────────

interface CategoryRow {
  category: string;
  revenue: number;
  percentage: number;
}

const SEGMENT_COLORS = [
  'bg-primary',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-400',
  'bg-rose-400',
];

export function CategoryRevenueCard({
  data,
  loading = false,
  className,
}: {
  data: CategoryRow[];
  loading?: boolean;
  className?: string;
}) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  return (
    <div className={cn('bento-dark group flex flex-col p-6 sm:p-8', className)}>
      <div className="bento-glow -right-10 -top-10 h-40 w-40 bg-primary/20" aria-hidden />
      <div className="bento-glow -bottom-10 -left-10 h-32 w-32 bg-blue-500/10" aria-hidden />
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-8 flex items-center gap-3 text-white/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
            <PieChart className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Revenue segments</span>
        </div>
        <h3 className="mb-6 text-xl font-black tracking-tight text-white">Revenue by Category</h3>

        {loading ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="my-auto py-8 text-center text-sm font-bold text-white/40">
            No data for this range
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {sorted.map((row, i) => (
              <div key={row.category}>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-black uppercase tracking-widest text-white/90">
                    {row.category}
                  </span>
                  <span className="shrink-0 text-[10px] font-black tabular-nums text-white/40">
                    {formatBDT(row.revenue)} · {row.percentage}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000',
                      SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                    )}
                    style={{ width: `${Math.max(Math.min(row.percentage, 100), 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Top products — ranked performance list
// ──────────────────────────────────────────────────────────

interface TopProductRow {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

export function TopProductsCard({
  data,
  loading = false,
  className,
}: {
  data: TopProductRow[];
  loading?: boolean;
  className?: string;
}) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const max = sorted[0]?.revenue || 1;

  return (
    <div className={cn('bento-card bento-card-hover flex flex-col p-6 sm:p-8', className)}>
      <SectionHeader
        title="Top Performance"
        caption="Best sellers by revenue"
        action={
          <div className="icon-tile h-10 w-10 rounded-xl bg-orange-50 text-orange-500">
            <Trophy className="h-5 w-5" strokeWidth={2.25} />
          </div>
        }
      />
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          bare
          icon={BarChart3}
          title="No sales yet"
          description="Best sellers for the selected range will appear here."
          className="py-8"
        />
      ) : (
        <ol className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {sorted.map((p, i) => (
            <li key={p.id} className="group/item flex items-center gap-4">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-xs font-black tabular-nums transition-transform group-hover/item:scale-105',
                  i === 0 ? 'bg-primary text-white shadow-brand-glow' : 'bg-gray-100 text-gray-600',
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-black text-gray-900 transition-colors group-hover/item:text-primary">
                    {p.name}
                  </p>
                  <p className="shrink-0 text-xs font-black tabular-nums tracking-tight text-primary">
                    {formatBDT(p.revenue)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.max((p.revenue / max) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {p.totalSold} sold
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-gray-50/70">
      <BarChart3 className="h-8 w-8 text-gray-300" strokeWidth={2.25} />
      <p className="eyebrow">No data for this range</p>
    </div>
  );
}
