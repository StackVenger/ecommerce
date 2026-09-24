'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { fetchDashboardCharts, formatBDT, type TopProduct } from '@/lib/api/admin';
import { chartNeutrals } from '@/lib/theme/chart-colors';
import { useIsDark } from '@/lib/theme/color-mode';

// ──────────────────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────────────────

const BAR_COLORS = [
  '#f46e54',
  '#4f46e5',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4338ca',
  '#f46e54',
];

// ──────────────────────────────────────────────────────────
// Custom Tooltip
// ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TopProduct;
    value: number;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const product = payload[0]?.payload;
  if (!product) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-ink px-4 py-3 text-white shadow-xl shadow-black/10">
      <p className="mb-1 text-xs font-black text-white">{product.name}</p>
      <p className="text-[11px] font-bold text-white/60">
        Sold: <span className="font-medium">{product.totalSold} units</span>
      </p>
      <p className="text-[11px] font-bold text-white/60">
        Revenue: <span className="font-medium">{formatBDT(product.revenue)}</span>
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Top Products Chart
// ──────────────────────────────────────────────────────────

/**
 * Horizontal bar chart showing top-selling products by quantity.
 * Revenue values displayed in BDT (৳).
 */
export function TopProductsChart() {
  const neutral = chartNeutrals(useIsDark());
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchDashboardCharts();
        setProducts(data.topProducts);
      } catch (err) {
        console.error('Failed to load top products:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 h-6 w-40 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-80 animate-pulse rounded-[1.5rem] bg-gray-50" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bento-card p-6 sm:p-8">
        <h3 className="section-title">Top Products</h3>
        <p className="mt-4 rounded-[1.5rem] bg-gray-50 py-10 text-center text-sm font-bold text-gray-400">
          No sales data available yet.
        </p>
      </div>
    );
  }

  // Truncate product names for chart display
  const chartData = products.map((p) => ({
    ...p,
    shortName: p.name.length > 20 ? `${p.name.slice(0, 20)}...` : p.name,
  }));

  return (
    <div className="bento-card p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="section-title">Top Products</h3>
        <p className="eyebrow mt-1">Best sellers in the last 30 days</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid stroke={neutral.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: neutral.tick, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="shortName"
            type="category"
            width={140}
            tick={{ fontSize: 11, fill: neutral.tick, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalSold" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
