'use client';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

// ──────────────────────────────────────────────────────────
// Presets
// ──────────────────────────────────────────────────────────

export type PresetKey = '1d' | '1w' | '1m' | '1y';

const presets: { key: PresetKey; label: string }[] = [
  { key: '1d', label: '1 Day' },
  { key: '1w', label: '1 Week' },
  { key: '1m', label: '1 Month' },
  { key: '1y', label: '1 Year' },
];

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getPresetRange(key: PresetKey): DateRange {
  const now = new Date();
  const endDate = toDateString(now);

  switch (key) {
    case '1d': {
      const start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      return { startDate: toDateString(start), endDate };
    }
    case '1w': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: toDateString(start), endDate };
    }
    case '1m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { startDate: toDateString(start), endDate };
    }
    case '1y': {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { startDate: toDateString(start), endDate };
    }
  }
}

function getActivePreset(value: DateRange): PresetKey | null {
  for (const preset of presets) {
    const range = getPresetRange(preset.key);
    if (range.startDate === value.startDate && range.endDate === value.endDate) {
      return preset.key;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const activePreset = getActivePreset(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onChange(getPresetRange(preset.key))}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            activePreset === preset.key
              ? 'border-teal-600 bg-teal-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          )}
        >
          {preset.label}
        </button>
      ))}

      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <input
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <span>to</span>
        <input
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}
