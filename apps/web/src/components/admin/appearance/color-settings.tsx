'use client';

import React from 'react';

interface ColorConfig {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface ColorSettingsProps {
  colors: ColorConfig;
  onChange: (colors: ColorConfig) => void;
}

const COLOR_PRESETS: { name: string; colors: Partial<ColorConfig> }[] = [
  {
    name: 'Ocean Blue',
    colors: {
      primary: '#2563eb',
      primaryLight: '#3b82f6',
      primaryDark: '#1d4ed8',
      accent: '#f59e0b',
    },
  },
  {
    name: 'Forest Green',
    colors: {
      primary: '#16a34a',
      primaryLight: '#22c55e',
      primaryDark: '#15803d',
      accent: '#eab308',
    },
  },
  {
    name: 'Royal Purple',
    colors: {
      primary: '#7c3aed',
      primaryLight: '#8b5cf6',
      primaryDark: '#6d28d9',
      accent: '#f43f5e',
    },
  },
  {
    name: 'Sunset Orange',
    colors: {
      primary: '#ea580c',
      primaryLight: '#f97316',
      primaryDark: '#c2410c',
      accent: '#0891b2',
    },
  },
  {
    name: 'Rose Pink',
    colors: {
      primary: '#e11d48',
      primaryLight: '#f43f5e',
      primaryDark: '#be123c',
      accent: '#8b5cf6',
    },
  },
  {
    name: 'Slate Gray',
    colors: {
      primary: '#475569',
      primaryLight: '#64748b',
      primaryDark: '#334155',
      accent: '#2563eb',
    },
  },
];

const COLOR_GROUPS = [
  {
    label: 'Primary Colors',
    fields: [
      { key: 'primary', label: 'Primary' },
      { key: 'primaryLight', label: 'Primary Light' },
      { key: 'primaryDark', label: 'Primary Dark' },
    ],
  },
  {
    label: 'Secondary Colors',
    fields: [
      { key: 'secondary', label: 'Secondary' },
      { key: 'secondaryLight', label: 'Secondary Light' },
      { key: 'secondaryDark', label: 'Secondary Dark' },
    ],
  },
  {
    label: 'Accent & Background',
    fields: [
      { key: 'accent', label: 'Accent' },
      { key: 'background', label: 'Background' },
      { key: 'surface', label: 'Surface' },
    ],
  },
  {
    label: 'Text & Borders',
    fields: [
      { key: 'text', label: 'Text' },
      { key: 'textSecondary', label: 'Text Secondary' },
      { key: 'border', label: 'Border' },
    ],
  },
  {
    label: 'Status Colors',
    fields: [
      { key: 'success', label: 'Success' },
      { key: 'warning', label: 'Warning' },
      { key: 'error', label: 'Error' },
      { key: 'info', label: 'Info' },
    ],
  },
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
        />
      </div>
      <div className="flex-1">
        <label className="field-label">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input mt-0.5 w-full text-xs font-mono uppercase"
          pattern="^#[0-9a-fA-F]{6}$"
        />
      </div>
    </div>
  );
}

export default function ColorSettings({ colors, onChange }: ColorSettingsProps) {
  const handleColorChange = (key: string, value: string) => {
    onChange({ ...colors, [key]: value });
  };

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    onChange({ ...colors, ...preset.colors });
  };

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-3 tracking-tight">Quick Presets</h3>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="rounded-2xl border border-foreground/[0.05] bg-card p-3 text-left shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50"
            >
              <div className="flex gap-1 mb-2">
                {Object.values(preset.colors).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-700">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Groups */}
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-black text-gray-900 mb-3 tracking-tight">{group.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {group.fields.map((field) => (
              <ColorPicker
                key={field.key}
                label={field.label}
                value={(colors as any)[field.key] || '#000000'}
                onChange={(value) => handleColorChange(field.key, value)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Live Preview */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-3 tracking-tight">Live Preview</h3>
        <div
          className="overflow-hidden rounded-[1.5rem] border border-foreground/[0.05]"
          style={{ backgroundColor: colors.background }}
        >
          {/* Preview Header */}
          <div className="px-6 py-3" style={{ backgroundColor: colors.primary }}>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">BDShop</span>
              <div className="flex items-center gap-4">
                <span className="text-white/80 text-sm">Categories</span>
                <span className="text-white/80 text-sm">Products</span>
                <span className="pill" style={{ backgroundColor: colors.accent, color: '#fff' }}>
                  Cart (3)
                </span>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="p-6" style={{ backgroundColor: colors.surface }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
              Featured Products
            </h2>
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              Discover our latest collection of products
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="h-20" style={{ backgroundColor: colors.surface }} />
                  <div className="p-3">
                    <div className="text-sm font-medium" style={{ color: colors.text }}>
                      Product {i}
                    </div>
                    <div className="text-sm font-bold mt-1" style={{ color: colors.primary }}>
                      ৳ {(i * 500).toLocaleString()}
                    </div>
                    <button
                      className="mt-2 w-full py-1.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: colors.primary }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Status badges preview */}
            <div className="flex gap-2 mt-4">
              <span className="pill text-white" style={{ backgroundColor: colors.success }}>
                Success
              </span>
              <span className="pill text-white" style={{ backgroundColor: colors.warning }}>
                Warning
              </span>
              <span className="pill text-white" style={{ backgroundColor: colors.error }}>
                Error
              </span>
              <span className="pill text-white" style={{ backgroundColor: colors.info }}>
                Info
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
