'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import BorderSettings from '../../../components/admin/appearance/border-settings';
import ColorSettings from '../../../components/admin/appearance/color-settings';
import CustomCSSEditor from '../../../components/admin/appearance/custom-css-editor';
import LayoutSettings from '../../../components/admin/appearance/layout-settings';
import TypographySettings from '../../../components/admin/appearance/typography-settings';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

type SettingsTab = 'colors' | 'typography' | 'borders' | 'layout' | 'custom-css';

interface ThemeSettings {
  colors: Record<string, string>;
  typography: Record<string, string>;
  borders: Record<string, string>;
  layout: Record<string, string>;
  customCSS: string;
  logoUrl: string;
  faviconUrl: string;
}

const TAB_LABELS: Record<SettingsTab, string> = {
  colors: 'Colors',
  typography: 'Typography',
  borders: 'Borders & Radius',
  layout: 'Layout',
  'custom-css': 'Custom CSS',
};

export default function AdminAppearancePage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('colors');
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchTheme = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/theme');
      setTheme(data.data || data);
    } catch (error) {
      console.error('Fetch theme error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to load theme settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  const handleSave = async () => {
    if (!theme) {
      return;
    }
    setSaving(true);

    try {
      const { data } = await apiClient.patch('/admin/theme', theme);
      setTheme(data.data || data);
      setHasChanges(false);
      toast.success('Theme saved');
    } catch (error) {
      console.error('Save theme error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to save theme'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset appearance settings?',
      description: 'All customizations will be lost.',
      confirmLabel: 'Reset',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }

    try {
      const { data } = await apiClient.post('/admin/theme/reset');
      setTheme(data.data || data);
      setHasChanges(false);
      toast.success('Theme reset to defaults');
    } catch (error) {
      console.error('Reset theme error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to reset theme'));
    }
  };

  const updateTheme = (section: string, value: any) => {
    if (!theme) {
      return;
    }
    setTheme({ ...theme, [section]: value });
    setHasChanges(true);
  };

  if (loading || !theme) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
          <p className="text-sm text-gray-500 mt-1">Customize your store's look and feel</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-yellow-800">You have unsaved changes.</span>
          <button
            onClick={handleSave}
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
          >
            Save now
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {Object.entries(TAB_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as SettingsTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === key
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'colors' && (
            <ColorSettings
              colors={theme.colors as any}
              onChange={(colors) => updateTheme('colors', colors)}
            />
          )}

          {activeTab === 'typography' && (
            <TypographySettings
              typography={theme.typography as any}
              onChange={(typography) => updateTheme('typography', typography)}
            />
          )}

          {activeTab === 'borders' && (
            <BorderSettings
              borders={theme.borders as any}
              onChange={(borders) => updateTheme('borders', borders)}
            />
          )}

          {activeTab === 'layout' && (
            <LayoutSettings
              layout={theme.layout as any}
              onChange={(layout) => updateTheme('layout', layout)}
            />
          )}

          {activeTab === 'custom-css' && (
            <CustomCSSEditor
              value={theme.customCSS}
              onChange={(css) => updateTheme('customCSS', css)}
            />
          )}
        </div>
      </div>

      {/* Store Identity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Store Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={theme.logoUrl}
              onChange={(e) => updateTheme('logoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {theme.logoUrl && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <img src={theme.logoUrl} alt="Logo preview" className="h-10" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
            <input
              type="text"
              value={theme.faviconUrl}
              onChange={(e) => updateTheme('faviconUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {theme.faviconUrl && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <img src={theme.faviconUrl} alt="Favicon preview" className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
