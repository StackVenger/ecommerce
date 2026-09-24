'use client';

import React from 'react';

interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  banglaFont: string;
  monoFont: string;
  baseFontSize: string;
  headingWeight: string;
  bodyWeight: string;
  lineHeight: string;
}

interface TypographySettingsProps {
  typography: TypographyConfig;
  onChange: (typography: TypographyConfig) => void;
}

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
  'Ubuntu',
  'Playfair Display',
  'Merriweather',
  'PT Sans',
  'DM Sans',
  'Work Sans',
];

const BANGLA_FONTS = [
  'Noto Sans Bengali',
  'Hind Siliguri',
  'Baloo Da 2',
  'Galada',
  'Noto Serif Bengali',
  'Anek Bangla',
  'Atma',
];

const MONO_FONTS = [
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'IBM Plex Mono',
  'Inconsolata',
  'Roboto Mono',
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
  { value: '900', label: 'Black (900)' },
];

const FONT_SIZES = [
  { value: '14px', label: '14px - Small' },
  { value: '15px', label: '15px' },
  { value: '16px', label: '16px - Default' },
  { value: '17px', label: '17px' },
  { value: '18px', label: '18px - Large' },
];

const LINE_HEIGHTS = [
  { value: '1.4', label: '1.4 - Tight' },
  { value: '1.5', label: '1.5' },
  { value: '1.6', label: '1.6 - Default' },
  { value: '1.7', label: '1.7' },
  { value: '1.8', label: '1.8 - Relaxed' },
  { value: '2.0', label: '2.0 - Loose' },
];

export default function TypographySettings({ typography, onChange }: TypographySettingsProps) {
  const handleChange = (key: keyof TypographyConfig, value: string) => {
    onChange({ ...typography, [key]: value });
  };

  return (
    <div className="space-y-8">
      {/* Font Families */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">Font Families</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Heading Font</label>
            <select
              value={typography.headingFont}
              onChange={(e) => handleChange('headingFont', e.target.value)}
              className="field-input w-full"
            >
              {GOOGLE_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: `'${typography.headingFont}', sans-serif` }}
              >
                Heading Preview
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">Body Font</label>
            <select
              value={typography.bodyFont}
              onChange={(e) => handleChange('bodyFont', e.target.value)}
              className="field-input w-full"
            >
              {GOOGLE_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p style={{ fontFamily: `'${typography.bodyFont}', sans-serif` }}>
                Body text preview. This is how your content will look with the selected font.
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">Bangla Font / বাংলা ফন্ট</label>
            <select
              value={typography.banglaFont}
              onChange={(e) => handleChange('banglaFont', e.target.value)}
              className="field-input w-full"
            >
              {BANGLA_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p style={{ fontFamily: `'${typography.banglaFont}', sans-serif` }}>
                বাংলা টেক্সট প্রিভিউ। এটি দেখাবে আপনার বাংলা কন্টেন্ট কেমন দেখাবে।
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">Monospace Font</label>
            <select
              value={typography.monoFont}
              onChange={(e) => handleChange('monoFont', e.target.value)}
              className="field-input w-full"
            >
              {MONO_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <code style={{ fontFamily: `'${typography.monoFont}', monospace` }}>
                const price = "৳ 1,500.00";
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Font Settings */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">Font Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Base Font Size</label>
            <select
              value={typography.baseFontSize}
              onChange={(e) => handleChange('baseFontSize', e.target.value)}
              className="field-input w-full"
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Line Height</label>
            <select
              value={typography.lineHeight}
              onChange={(e) => handleChange('lineHeight', e.target.value)}
              className="field-input w-full"
            >
              {LINE_HEIGHTS.map((lh) => (
                <option key={lh.value} value={lh.value}>
                  {lh.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Heading Weight</label>
            <select
              value={typography.headingWeight}
              onChange={(e) => handleChange('headingWeight', e.target.value)}
              className="field-input w-full"
            >
              {FONT_WEIGHTS.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Body Weight</label>
            <select
              value={typography.bodyWeight}
              onChange={(e) => handleChange('bodyWeight', e.target.value)}
              className="field-input w-full"
            >
              {FONT_WEIGHTS.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Typography Scale Preview */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">
          Typography Scale Preview
        </h3>
        <div
          className="p-6 bg-gray-50 rounded-lg space-y-4"
          style={{
            fontFamily: `'${typography.bodyFont}', sans-serif`,
            fontSize: typography.baseFontSize,
            lineHeight: typography.lineHeight,
          }}
        >
          <h1
            style={{
              fontFamily: `'${typography.headingFont}', sans-serif`,
              fontWeight: Number(typography.headingWeight),
              fontSize: '2.5rem',
            }}
          >
            Heading 1 / শিরোনাম ১
          </h1>
          <h2
            style={{
              fontFamily: `'${typography.headingFont}', sans-serif`,
              fontWeight: Number(typography.headingWeight),
              fontSize: '2rem',
            }}
          >
            Heading 2 / শিরোনাম ২
          </h2>
          <h3
            style={{
              fontFamily: `'${typography.headingFont}', sans-serif`,
              fontWeight: Number(typography.headingWeight),
              fontSize: '1.5rem',
            }}
          >
            Heading 3 / শিরোনাম ৩
          </h3>
          <p style={{ fontWeight: Number(typography.bodyWeight) }}>
            Body text paragraph. This is a sample paragraph to preview how your body text will
            appear on the storefront. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          <p
            style={{
              fontFamily: `'${typography.banglaFont}', sans-serif`,
              fontWeight: Number(typography.bodyWeight),
            }}
          >
            বাংলা প্যারাগ্রাফ। এটি একটি নমুনা প্যারাগ্রাফ যা দেখাবে আপনার বাংলা বডি টেক্সট
            স্টোরফ্রন্টে কেমন দেখাবে।
          </p>
          <p className="text-sm text-gray-500">
            Small text / caption: Product details, meta information, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
