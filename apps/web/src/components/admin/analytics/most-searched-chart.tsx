'use client';

import { Search } from 'lucide-react';
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

import type { MostSearchedTerm } from '@/lib/api/admin';

import { EmptyState, SectionHeader } from '@/components/ui/bento';
import { chartNeutrals } from '@/lib/theme/chart-colors';
import { useIsDark } from '@/lib/theme/color-mode';

// ──────────────────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────────────────

// Coral for the leader, softer coral steps for the rest.
const BAR_COLORS = [
  '#f46e54',
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
    payload: MostSearchedTerm;
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
    <div className="rounded-2xl bg-ink px-4 py-3 shadow-xl shadow-black/10">
      <p className="mb-1 text-xs font-black text-white">"{item.term}"</p>
      <p className="text-[11px] font-bold text-white/60">
        Searches: <span className="text-white">{item.searchCount.toLocaleString()}</span>
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Chart Component
// ──────────────────────────────────────────────────────────

interface MostSearchedChartProps {
  data: MostSearchedTerm[];
}

export function MostSearchedChart({ data }: MostSearchedChartProps) {
  const neutral = chartNeutrals(useIsDark());
  if (data.length === 0) {
    return (
      <div className="bento-card p-6 sm:p-8">
        <SectionHeader title="Most Searched Terms" caption="What customers are looking for" />
        <EmptyState bare icon={Search} title="No search data available yet." className="py-8" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    shortTerm: d.term.length > 20 ? `${d.term.slice(0, 20)}...` : d.term,
  }));

  return (
    <div className="bento-card bento-card-hover p-6 sm:p-8">
      <SectionHeader title="Most Searched Terms" caption="What customers are looking for" />

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid stroke={neutral.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fontWeight: 700, fill: neutral.tick }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="shortTerm"
            type="category"
            width={140}
            tick={{ fontSize: 11, fontWeight: 700, fill: neutral.label }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244,110,84,0.06)' }} />
          <Bar dataKey="searchCount" radius={[0, 999, 999, 0]} barSize={18}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
