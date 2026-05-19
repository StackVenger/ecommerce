'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface ThemeColors {
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

interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  banglaFont: string;
  monoFont: string;
  baseFontSize: string;
  headingWeight: string;
  bodyWeight: string;
  lineHeight: string;
}

interface ThemeBorders {
  radius: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
  width: string;
  color: string;
}

interface ThemeLayout {
  // Structural toggles (headerStyle, footerStyle, heroStyle,
  // productCardStyle, sidebarPosition) are persisted by the API but not
  // edited here until the storefront components grow matching render
  // branches — hiding them keeps the editor honest.
  containerMaxWidth: string;
}

interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  borders: ThemeBorders;
  layout: ThemeLayout;
  customCSS: string;
  logoUrl: string;
  faviconUrl: string;
}

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: 'Primary',
  primaryLight: 'Primary Light',
  primaryDark: 'Primary Dark',
  secondary: 'Secondary',
  secondaryLight: 'Secondary Light',
  secondaryDark: 'Secondary Dark',
  accent: 'Accent',
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  textSecondary: 'Text Secondary',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
};

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Nunito',
  'Montserrat',
  'Raleway',
  'Source Sans Pro',
];

const BANGLA_FONT_OPTIONS = ['Noto Sans Bengali', 'Hind Siliguri', 'Baloo Da 2', 'Anek Bangla'];

export default function AdminThemePage() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'colors' | 'typography' | 'borders' | 'layout' | 'advanced'
  >('colors');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    async function loadTheme() {
      try {
        const { data } = await apiClient.get('/theme');
        setTheme(data.data ?? data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load theme'));
      } finally {
        setLoading(false);
      }
    }
    loadTheme();
  }, []);

  const saveTheme = async () => {
    if (!theme) {
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.patch('/admin/theme', theme);
      setTheme(data.data ?? data);
      toast.success('Theme saved successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save theme'));
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = async () => {
    const ok = await confirm({
      title: 'Reset theme to defaults?',
      description: 'All customizations will be lost.',
      confirmLabel: 'Reset',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.post('/admin/theme/reset');
      setTheme(data.data ?? data);
      toast.success('Theme reset to defaults');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reset theme'));
    } finally {
      setSaving(false);
    }
  };

  const updateColor = (key: keyof ThemeColors, value: string) => {
    if (!theme) {
      return;
    }
    setTheme({ ...theme, colors: { ...theme.colors, [key]: value } });
  };

  const updateTypography = (key: keyof ThemeTypography, value: string) => {
    if (!theme) {
      return;
    }
    setTheme({ ...theme, typography: { ...theme.typography, [key]: value } });
  };

  const updateBorders = (key: keyof ThemeBorders, value: string) => {
    if (!theme) {
      return;
    }
    setTheme({ ...theme, borders: { ...theme.borders, [key]: value } });
  };

  const updateLayout = (key: keyof ThemeLayout, value: string) => {
    if (!theme) {
      return;
    }
    setTheme({ ...theme, layout: { ...theme.layout, [key]: value } });
  };

  const uploadBrandingImage = async (file: File, kind: 'logo' | 'favicon') => {
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post('/upload/image?directory=branding', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data?.data ?? data;
      const url: string | undefined = result?.url;
      if (!url) {
        throw new Error('Upload response missing url');
      }
      setTheme((prev) =>
        prev ? { ...prev, [kind === 'logo' ? 'logoUrl' : 'faviconUrl']: url } : prev,
      );
      toast.success(`${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded — don't forget to save`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Failed to upload ${kind}`));
    } finally {
      setUploading(false);
    }
  };

  const handleBrandingFilePicked = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'logo' | 'favicon',
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
    if (file) {
      void uploadBrandingImage(file, kind);
    }
  };

  const clearBrandingImage = (kind: 'logo' | 'favicon') => {
    setTheme((prev) =>
      prev ? { ...prev, [kind === 'logo' ? 'logoUrl' : 'faviconUrl']: '' } : prev,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="text-center py-12 text-gray-500">Failed to load theme configuration.</div>
    );
  }

  const tabs = [
    { id: 'colors' as const, label: 'Colors' },
    { id: 'typography' as const, label: 'Typography' },
    { id: 'borders' as const, label: 'Borders' },
    { id: 'layout' as const, label: 'Layout' },
    { id: 'advanced' as const, label: 'Advanced' },
  ];

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Theme Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Customize colors, typography, and layout</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetTheme}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveTheme}
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(COLOR_LABELS) as [keyof ThemeColors, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="h-9 w-9 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div
            className="mt-6 p-4 rounded-lg border border-gray-200"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: theme.colors.secondary }}
              >
                Secondary
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: theme.colors.accent }}
              >
                Accent
              </button>
              <span
                className="px-3 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: theme.colors.success }}
              >
                Success
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: theme.colors.error }}
              >
                Error
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Typography</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading Font</label>
              <select
                value={theme.typography.headingFont}
                onChange={(e) => updateTypography('headingFont', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Font</label>
              <select
                value={theme.typography.bodyFont}
                onChange={(e) => updateTypography('bodyFont', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bangla Font</label>
              <select
                value={theme.typography.banglaFont}
                onChange={(e) => updateTypography('banglaFont', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {BANGLA_FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Font Size</label>
              <select
                value={theme.typography.baseFontSize}
                onChange={(e) => updateTypography('baseFontSize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {['14px', '15px', '16px', '17px', '18px'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading Weight</label>
              <select
                value={theme.typography.headingWeight}
                onChange={(e) => updateTypography('headingWeight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {['400', '500', '600', '700', '800'].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Line Height</label>
              <select
                value={theme.typography.lineHeight}
                onChange={(e) => updateTypography('lineHeight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {['1.4', '1.5', '1.6', '1.7', '1.8'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Typography Preview */}
          <div className="mt-6 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <h2
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: Number(theme.typography.headingWeight),
              }}
              className="text-xl text-gray-900 mb-1"
            >
              Heading Text Preview
            </h2>
            <p
              style={{
                fontFamily: theme.typography.bodyFont,
                fontSize: theme.typography.baseFontSize,
                lineHeight: theme.typography.lineHeight,
              }}
              className="text-gray-600"
            >
              Body text preview. This is how your content will look with the selected typography
              settings.
            </p>
            <p
              style={{
                fontFamily: theme.typography.banglaFont,
                fontSize: theme.typography.baseFontSize,
              }}
              className="text-gray-600 mt-1"
            >
              বাংলা টেক্সট প্রিভিউ। এই হল আপনার বাংলা কন্টেন্ট।
            </p>
          </div>
        </div>
      )}

      {/* Borders Tab */}
      {activeTab === 'borders' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Borders & Radius</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(
              [
                ['radius', 'Default Radius'],
                ['radiusSm', 'Small Radius'],
                ['radiusMd', 'Medium Radius'],
                ['radiusLg', 'Large Radius'],
                ['width', 'Border Width'],
              ] as [keyof ThemeBorders, string][]
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  value={theme.borders[key]}
                  onChange={(e) => updateBorders(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.borders.color}
                  onChange={(e) => updateBorders('color', e.target.value)}
                  className="h-9 w-9 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.borders.color}
                  onChange={(e) => updateBorders('color', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Border Preview */}
          <div className="mt-6 flex gap-4">
            {(['radiusSm', 'radiusMd', 'radiusLg'] as (keyof ThemeBorders)[]).map((key) => (
              <div
                key={key}
                className="w-24 h-24 flex items-center justify-center text-xs text-gray-500"
                style={{
                  borderRadius: theme.borders[key],
                  border: `${theme.borders.width} solid ${theme.borders.color}`,
                  backgroundColor: theme.colors.surface,
                }}
              >
                {key}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Layout Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Max Width
              </label>
              <select
                value={theme.layout.containerMaxWidth}
                onChange={(e) => updateLayout('containerMaxWidth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="1024px">1024px</option>
                <option value="1152px">1152px</option>
                <option value="1280px">1280px (Default)</option>
                <option value="1440px">1440px</option>
                <option value="1536px">1536px</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Logo & Favicon */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo uploader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={(e) => handleBrandingFilePicked(e, 'logo')}
                />
                <div className="flex items-center gap-3">
                  {theme.logoUrl ? (
                    <img
                      src={theme.logoUrl}
                      alt="Logo preview"
                      className="h-14 max-w-[160px] object-contain rounded border border-gray-200 bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      None
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo || saving}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      {uploadingLogo ? 'Uploading…' : theme.logoUrl ? 'Replace' : 'Upload logo'}
                    </button>
                    {theme.logoUrl && !uploadingLogo && (
                      <button
                        type="button"
                        onClick={() => clearBrandingImage('logo')}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG, WebP or SVG. Uploaded to Cloudinary.
                </p>
              </div>

              {/* Favicon uploader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  hidden
                  onChange={(e) => handleBrandingFilePicked(e, 'favicon')}
                />
                <div className="flex items-center gap-3">
                  {theme.faviconUrl ? (
                    <img
                      src={theme.faviconUrl}
                      alt="Favicon preview"
                      className="h-10 w-10 object-contain rounded border border-gray-200 bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      None
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon || saving}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      {uploadingFavicon
                        ? 'Uploading…'
                        : theme.faviconUrl
                          ? 'Replace'
                          : 'Upload favicon'}
                    </button>
                    {theme.faviconUrl && !uploadingFavicon && (
                      <button
                        type="button"
                        onClick={() => clearBrandingImage('favicon')}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  32×32 or 64×64 PNG/SVG recommended. Uploaded to Cloudinary.
                </p>
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom CSS</h2>
            <textarea
              value={theme.customCSS}
              onChange={(e) => setTheme({ ...theme, customCSS: e.target.value })}
              rows={12}
              placeholder="/* Add your custom CSS here */&#10;.my-class {&#10;  color: red;&#10;}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-2">
              Custom CSS will be injected into every storefront page. Use with caution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
