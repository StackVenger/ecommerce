'use client';

import React from 'react';

interface BorderConfig {
  radius: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
  width: string;
  color: string;
}

interface BorderSettingsProps {
  borders: BorderConfig;
  onChange: (borders: BorderConfig) => void;
}

const RADIUS_PRESETS = [
  { name: 'Sharp', values: { radius: '0px', radiusSm: '0px', radiusMd: '0px', radiusLg: '0px' } },
  { name: 'Subtle', values: { radius: '4px', radiusSm: '2px', radiusMd: '4px', radiusLg: '6px' } },
  {
    name: 'Default',
    values: { radius: '8px', radiusSm: '4px', radiusMd: '8px', radiusLg: '12px' },
  },
  {
    name: 'Rounded',
    values: { radius: '12px', radiusSm: '6px', radiusMd: '12px', radiusLg: '16px' },
  },
  {
    name: 'Extra Round',
    values: { radius: '16px', radiusSm: '8px', radiusMd: '16px', radiusLg: '24px' },
  },
  {
    name: 'Pill',
    values: { radius: '9999px', radiusSm: '9999px', radiusMd: '9999px', radiusLg: '9999px' },
  },
];

const BORDER_WIDTHS = ['0px', '1px', '2px', '3px'];

export default function BorderSettings({ borders, onChange }: BorderSettingsProps) {
  const handleChange = (key: keyof BorderConfig, value: string) => {
    onChange({ ...borders, [key]: value });
  };

  const applyPreset = (preset: (typeof RADIUS_PRESETS)[0]) => {
    onChange({ ...borders, ...preset.values });
  };

  return (
    <div className="space-y-8">
      {/* Radius Presets */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">
          Border Radius Presets
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="rounded-2xl border border-foreground/[0.05] bg-card p-4 text-center shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50"
            >
              <div
                className="w-12 h-12 bg-brand-500 mx-auto mb-2"
                style={{ borderRadius: preset.values.radius }}
              />
              <span className="text-xs font-medium text-gray-700">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Radius Values */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">
          Custom Border Radius
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Small (buttons, badges)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="24"
                value={parseInt(borders.radiusSm)}
                onChange={(e) => handleChange('radiusSm', `${e.target.value}px`)}
                className="flex-1"
              />
              <span className="text-sm font-mono text-gray-600 w-16">{borders.radiusSm}</span>
            </div>
          </div>
          <div>
            <label className="field-label">Medium (cards, inputs)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="32"
                value={parseInt(borders.radiusMd)}
                onChange={(e) => handleChange('radiusMd', `${e.target.value}px`)}
                className="flex-1"
              />
              <span className="text-sm font-mono text-gray-600 w-16">{borders.radiusMd}</span>
            </div>
          </div>
          <div>
            <label className="field-label">Large (modals, sections)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="48"
                value={parseInt(borders.radiusLg)}
                onChange={(e) => handleChange('radiusLg', `${e.target.value}px`)}
                className="flex-1"
              />
              <span className="text-sm font-mono text-gray-600 w-16">{borders.radiusLg}</span>
            </div>
          </div>
          <div>
            <label className="field-label">Default</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="32"
                value={parseInt(borders.radius)}
                onChange={(e) => handleChange('radius', `${e.target.value}px`)}
                className="flex-1"
              />
              <span className="text-sm font-mono text-gray-600 w-16">{borders.radius}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Border Width & Color */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">Border Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Border Width</label>
            <div className="flex gap-2">
              {BORDER_WIDTHS.map((width) => (
                <button
                  key={width}
                  onClick={() => handleChange('width', width)}
                  className={`flex-1 py-2 border-2 rounded-lg text-xs font-medium transition-colors ${
                    borders.width === width
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Border Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={borders.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={borders.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="field-input flex-1 font-mono py-2.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">Preview</h3>
        <div className="p-6 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-4 bg-card"
              style={{
                borderRadius: borders.radiusSm,
                border: `${borders.width} solid ${borders.color}`,
              }}
            >
              <p className="text-xs text-gray-500">Small radius</p>
              <p className="text-sm font-medium">Button / Badge</p>
            </div>
            <div
              className="p-4 bg-card"
              style={{
                borderRadius: borders.radiusMd,
                border: `${borders.width} solid ${borders.color}`,
              }}
            >
              <p className="text-xs text-gray-500">Medium radius</p>
              <p className="text-sm font-medium">Card / Input</p>
            </div>
            <div
              className="p-4 bg-card"
              style={{
                borderRadius: borders.radiusLg,
                border: `${borders.width} solid ${borders.color}`,
              }}
            >
              <p className="text-xs text-gray-500">Large radius</p>
              <p className="text-sm font-medium">Modal / Section</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn btn-primary" style={{ borderRadius: borders.radiusSm }}>
              Primary Button
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700"
              style={{
                borderRadius: borders.radiusSm,
                border: `${borders.width} solid ${borders.color}`,
              }}
            >
              Secondary Button
            </button>
            <span
              className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium inline-flex items-center"
              style={{ borderRadius: borders.radiusFull }}
            >
              Badge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
