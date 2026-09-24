'use client';

import React from 'react';

interface LayoutConfig {
  headerStyle: string;
  footerStyle: string;
  heroStyle: string;
  productCardStyle: string;
  containerMaxWidth: string;
  sidebarPosition: string;
}

interface LayoutSettingsProps {
  layout: LayoutConfig;
  onChange: (layout: LayoutConfig) => void;
}

interface StyleOption {
  value: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const HEADER_STYLES: StyleOption[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Logo left, nav center, actions right',
    preview: (
      <div className="bg-ink p-2 rounded">
        <div className="flex items-center justify-between">
          <div className="w-8 h-3 bg-card rounded" />
          <div className="flex gap-1">
            <div className="w-6 h-2 bg-gray-400 rounded" />
            <div className="w-6 h-2 bg-gray-400 rounded" />
            <div className="w-6 h-2 bg-gray-400 rounded" />
          </div>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'centered',
    label: 'Centered Logo',
    description: 'Nav on top, centered logo, actions below',
    preview: (
      <div className="bg-ink p-2 rounded space-y-1">
        <div className="flex justify-center gap-1">
          <div className="w-6 h-2 bg-gray-400 rounded" />
          <div className="w-6 h-2 bg-gray-400 rounded" />
          <div className="w-6 h-2 bg-gray-400 rounded" />
        </div>
        <div className="flex justify-center">
          <div className="w-12 h-3 bg-card rounded" />
        </div>
      </div>
    ),
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Clean, logo left, hamburger right',
    preview: (
      <div className="bg-ink p-2 rounded">
        <div className="flex items-center justify-between">
          <div className="w-10 h-3 bg-card rounded" />
          <div className="space-y-0.5">
            <div className="w-4 h-0.5 bg-card" />
            <div className="w-4 h-0.5 bg-card" />
            <div className="w-4 h-0.5 bg-card" />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'mega',
    label: 'Mega Menu',
    description: 'Full-width with mega dropdown menus',
    preview: (
      <div className="bg-ink p-2 rounded space-y-1">
        <div className="flex items-center justify-between">
          <div className="w-8 h-3 bg-card rounded" />
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-2 bg-brand-400 rounded" />
          <div className="w-8 h-2 bg-gray-600 rounded" />
          <div className="w-8 h-2 bg-gray-600 rounded" />
          <div className="w-8 h-2 bg-gray-600 rounded" />
        </div>
      </div>
    ),
  },
];

const FOOTER_STYLES: StyleOption[] = [
  {
    value: 'default',
    label: 'Multi-column',
    description: '4 columns with links and newsletter',
    preview: (
      <div className="bg-ink p-2 rounded">
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-0.5">
              <div className="w-full h-1.5 bg-gray-400 rounded" />
              <div className="w-3/4 h-1 bg-gray-600 rounded" />
              <div className="w-3/4 h-1 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    value: 'simple',
    label: 'Simple',
    description: 'Single row with essential links',
    preview: (
      <div className="bg-ink p-2 rounded">
        <div className="flex items-center justify-between">
          <div className="w-8 h-2 bg-gray-400 rounded" />
          <div className="flex gap-1">
            <div className="w-4 h-2 bg-gray-600 rounded" />
            <div className="w-4 h-2 bg-gray-600 rounded" />
            <div className="w-4 h-2 bg-gray-600 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'centered',
    label: 'Centered',
    description: 'Centered layout with social links',
    preview: (
      <div className="bg-ink p-2 rounded text-center space-y-1">
        <div className="w-10 h-2 bg-gray-400 rounded mx-auto" />
        <div className="flex gap-0.5 justify-center">
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
        </div>
      </div>
    ),
  },
];

const HERO_STYLES: StyleOption[] = [
  {
    value: 'slider',
    label: 'Slider',
    description: 'Auto-rotating image slider with navigation',
    preview: (
      <div className="bg-brand-100 p-3 rounded relative">
        <div className="w-full h-8 bg-brand-200 rounded" />
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-card rounded-full" />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-card rounded-full" />
      </div>
    ),
  },
  {
    value: 'split',
    label: 'Split',
    description: 'Text on left, image on right',
    preview: (
      <div className="bg-brand-100 p-2 rounded flex gap-1">
        <div className="flex-1 space-y-0.5">
          <div className="w-full h-2 bg-brand-300 rounded" />
          <div className="w-3/4 h-1.5 bg-brand-200 rounded" />
          <div className="w-8 h-2 bg-brand-500 rounded mt-1" />
        </div>
        <div className="flex-1 h-10 bg-brand-200 rounded" />
      </div>
    ),
  },
  {
    value: 'fullscreen',
    label: 'Fullscreen',
    description: 'Full viewport background with overlay text',
    preview: (
      <div className="bg-ink p-3 rounded flex items-center justify-center">
        <div className="text-center space-y-0.5">
          <div className="w-16 h-2 bg-card rounded mx-auto" />
          <div className="w-12 h-1.5 bg-gray-400 rounded mx-auto" />
          <div className="w-8 h-2 bg-brand-500 rounded mx-auto mt-1" />
        </div>
      </div>
    ),
  },
  {
    value: 'grid',
    label: 'Banner Grid',
    description: 'Grid of featured banners',
    preview: (
      <div className="grid grid-cols-3 gap-0.5">
        <div className="col-span-2 row-span-2 bg-brand-200 rounded h-10" />
        <div className="bg-green-200 rounded h-5" />
        <div className="bg-orange-200 rounded h-5" />
      </div>
    ),
  },
];

const PRODUCT_CARD_STYLES: StyleOption[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Image top, info bottom, hover effects',
    preview: (
      <div className="bento-card overflow-hidden">
        <div className="h-8 bg-gray-100" />
        <div className="p-1.5 space-y-0.5">
          <div className="w-full h-1.5 bg-gray-200 rounded" />
          <div className="w-2/3 h-1.5 bg-brand-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    value: 'overlay',
    label: 'Overlay',
    description: 'Text overlaid on image',
    preview: (
      <div className="bg-gray-200 rounded overflow-hidden h-14 relative">
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 space-y-0.5">
          <div className="w-full h-1 bg-card/80 rounded" />
          <div className="w-2/3 h-1 bg-card/60 rounded" />
        </div>
      </div>
    ),
  },
  {
    value: 'horizontal',
    label: 'Horizontal',
    description: 'Image left, details right',
    preview: (
      <div className="bento-card overflow-hidden flex">
        <div className="w-8 h-10 bg-gray-100" />
        <div className="p-1.5 flex-1 space-y-0.5">
          <div className="w-full h-1.5 bg-gray-200 rounded" />
          <div className="w-2/3 h-1.5 bg-brand-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Clean, no borders, subtle styling',
    preview: (
      <div className="overflow-hidden">
        <div className="h-10 bg-gray-50 rounded" />
        <div className="py-1 space-y-0.5">
          <div className="w-full h-1.5 bg-gray-200 rounded" />
          <div className="w-1/2 h-1.5 bg-gray-300 rounded" />
        </div>
      </div>
    ),
  },
];

const CONTAINER_WIDTHS = [
  { value: '1024px', label: '1024px - Narrow' },
  { value: '1152px', label: '1152px' },
  { value: '1280px', label: '1280px - Default' },
  { value: '1440px', label: '1440px - Wide' },
  { value: '1600px', label: '1600px - Extra Wide' },
  { value: '100%', label: '100% - Full Width' },
];

function StyleSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: StyleOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-black text-gray-900 mb-3 tracking-tight">{label}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`p-3 border-2 rounded-lg text-left transition-colors ${
              value === option.value
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="mb-2">{option.preview}</div>
            <div className="text-xs font-medium text-gray-900">{option.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LayoutSettings({ layout, onChange }: LayoutSettingsProps) {
  const handleChange = (key: keyof LayoutConfig, value: string) => {
    onChange({ ...layout, [key]: value });
  };

  return (
    <div className="space-y-8">
      <StyleSelector
        label="Header Style"
        options={HEADER_STYLES}
        value={layout.headerStyle}
        onChange={(v) => handleChange('headerStyle', v)}
      />

      <StyleSelector
        label="Hero Section Style"
        options={HERO_STYLES}
        value={layout.heroStyle}
        onChange={(v) => handleChange('heroStyle', v)}
      />

      <StyleSelector
        label="Product Card Style"
        options={PRODUCT_CARD_STYLES}
        value={layout.productCardStyle}
        onChange={(v) => handleChange('productCardStyle', v)}
      />

      <StyleSelector
        label="Footer Style"
        options={FOOTER_STYLES}
        value={layout.footerStyle}
        onChange={(v) => handleChange('footerStyle', v)}
      />

      {/* Container & Layout Settings */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-3 tracking-tight">Container & Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Container Max Width</label>
            <select
              value={layout.containerMaxWidth}
              onChange={(e) => handleChange('containerMaxWidth', e.target.value)}
              className="field-input w-full"
            >
              {CONTAINER_WIDTHS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Sidebar Position</label>
            <div className="flex gap-2">
              {['left', 'right', 'none'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => handleChange('sidebarPosition', pos)}
                  className={`flex-1 py-2 border-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    layout.sidebarPosition === pos
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
