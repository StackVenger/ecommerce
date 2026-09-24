'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { fetchDashboardCharts, formatBDT, type ChartDataPoint } from '@/lib/api/admin';
import { chartNeutrals } from '@/lib/theme/chart-colors';
import { useIsDark } from '@/lib/theme/color-mode';

// ──────────────────────────────────────────────────────────
// Custom Tooltip
// ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-ink px-4 py-3 text-white shadow-xl shadow-black/10">
      <p className="mb-2 text-xs font-black text-white">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[11px] font-bold text-white/60">
            {entry.dataKey === 'revenue'
              ? `Revenue: ${formatBDT(entry.value)}`
              : `Orders: ${entry.value}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Revenue Chart Component
// ──────────────────────────────────────────────────────────

/**
 * Revenue and orders chart for the admin dashboard.
 *
 * Displays a dual-axis area chart showing daily revenue (BDT ৳)
 * and order counts over the last 30 days.
 */
export function RevenueChart() {
  const neutral = chartNeutrals(useIsDark());
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'revenue' | 'orders' | 'both'>('both');

  useEffect(() => {
    async function loadCharts() {
      try {
        const data = await fetchDashboardCharts();
        setChartData(data.revenueOverTime);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCharts();
  }, []);

  if (isLoading) {
    return (
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 h-6 w-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-80 animate-pulse rounded-[1.5rem] bg-gray-50" />
      </div>
    );
  }

  // Format dates for display
  const formattedData = chartData.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="bento-card p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="section-title">Revenue & Orders</h3>
          <p className="eyebrow mt-1">Last 30 days performance</p>
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-gray-50 p-1">
          {(['both', 'revenue', 'orders'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`chip px-3 py-1.5 capitalize ${activeView === view ? 'chip-active' : ''}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f46e54" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f46e54" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={neutral.grid} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: neutral.tick, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 10, fill: neutral.tick, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`}
            hide={activeView === 'orders'}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 10, fill: neutral.tick, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
            hide={activeView === 'revenue'}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {(activeView === 'both' || activeView === 'revenue') && (
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#f46e54"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Revenue (৳)"
            />
          )}
          {(activeView === 'both' || activeView === 'orders') && (
            <Area
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#ordersGradient)"
              name="Orders"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
