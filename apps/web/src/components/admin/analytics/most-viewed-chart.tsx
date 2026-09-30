'use client';

import { Eye } from 'lucide-react';
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

import type { MostViewedProduct } from '@/lib/api/admin';

import { EmptyState, SectionHeader } from '@/components/ui/bento';
import { chartNeutrals } from '@/lib/theme/chart-colors';
import { useIsDark } from '@/lib/theme/color-mode';

// ──────────────────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────────────────

// Coral for the leader, softer coral steps for the rest.
const BAR_COLORS = [
  '#f9706a',
  '#f67e63',
  '#f99177',
  '#fdb29b',
  '#fdb29b',
  '#ffd0c0',
  '#ffd0c0',
  '#ffd0c0',
  '#ffe7de',
  '#ffe7de',
];

// ──────────────────────────────────────────────────────────
// Custom Tooltip
// ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MostViewedProduct & { shortName: string };
    value: number;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="border border-gray-200 bg-card px-4 py-3 text-gray-900 shadow-bento-hover">
      <p className="mb-1 font-heading text-xs font-semibold text-gray-900">{item.name}</p>
      <p className="text-xs text-gray-600">
        Views:{' '}
        <span className="font-semibold text-gray-900">{item.viewCount.toLocaleString()}</span>
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Chart Component
// ──────────────────────────────────────────────────────────

interface MostViewedChartProps {
  data: MostViewedProduct[];
}

export function MostViewedChart({ data }: MostViewedChartProps) {
  const neutral = chartNeutrals(useIsDark());
  if (data.length === 0) {
    return (
      <div className="bento-card p-5 sm:p-6">
        <SectionHeader title="Most Viewed Products" caption="Products with the most page views" />
        <EmptyState bare icon={Eye} title="No view data available yet." className="py-8" />
      </div>
    );
  }

  const chartData = data.map((p) => ({
    ...p,
    shortName: p.name.length > 20 ? `${p.name.slice(0, 20)}...` : p.name,
  }));

  return (
    <div className="bento-card p-5 sm:p-6">
      <SectionHeader title="Most Viewed Products" caption="Products with the most page views" />

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid stroke={neutral.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fontWeight: 500, fill: neutral.tick }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="shortName"
            type="category"
            width={140}
            tick={{ fontSize: 11, fontWeight: 500, fill: neutral.label }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244,110,84,0.06)' }} />
          <Bar dataKey="viewCount" radius={[0, 999, 999, 0]} barSize={18}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
