'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api/errors';
import { getSettingsByGroup, updateSettings } from '@/lib/api/settings';

interface GeneralSettings {
  site_name: string;
  site_name_bn: string;
  site_tagline: string;
  site_tagline_bn: string;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  default_language: string;
  supported_languages: string;
  timezone: string;
  date_format: string;
  support_email: string;
  phone: string;
  address: string;
}

const DEFAULTS: GeneralSettings = {
  site_name: '',
  site_name_bn: '',
  site_tagline: '',
  site_tagline_bn: '',
  currency: 'BDT',
  currency_symbol: '৳',
  currency_position: 'before',
  default_language: 'en',
  supported_languages: 'en,bn',
  timezone: 'Asia/Dhaka',
  date_format: 'DD/MM/YYYY',
  support_email: '',
  phone: '',
  address: '',
};

export default function GeneralSettingsPage() {
  const [form, setForm] = useState<GeneralSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettingsByGroup('general')
      .then((data) => setForm({ ...DEFAULTS, ...data } as GeneralSettings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof GeneralSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings('general', form as unknown as Record<string, string>);
      toast.success('General settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-black text-gray-900 tracking-tight">General Settings</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="field-label">Site Name (English)</label>
          <input
            type="text"
            value={form.site_name}
            onChange={(e) => handleChange('site_name', e.target.value)}
            className="field-input block w-full"
            placeholder="My E-Commerce Store"
          />
        </div>

        <div>
          <label className="field-label">সাইটের নাম (বাংলা)</label>
          <input
            type="text"
            value={form.site_name_bn}
            onChange={(e) => handleChange('site_name_bn', e.target.value)}
            className="field-input block w-full"
            placeholder="আমার ই-কমার্স স্টোর"
          />
        </div>

        <div>
          <label className="field-label">Tagline (English)</label>
          <input
            type="text"
            value={form.site_tagline}
            onChange={(e) => handleChange('site_tagline', e.target.value)}
            className="field-input block w-full"
          />
        </div>

        <div>
          <label className="field-label">ট্যাগলাইন (বাংলা)</label>
          <input
            type="text"
            value={form.site_tagline_bn}
            onChange={(e) => handleChange('site_tagline_bn', e.target.value)}
            className="field-input block w-full"
          />
        </div>

        <div>
          <label className="field-label">Currency</label>
          <div className="mt-1 flex items-center gap-3">
            <select
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="field-input block w-auto py-2.5"
            >
              <option value="BDT">BDT - Bangladeshi Taka</option>
              <option value="USD">USD - US Dollar</option>
            </select>
            <span className="text-lg font-semibold text-gray-600">{form.currency_symbol}</span>
          </div>
        </div>

        <div>
          <label className="field-label">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="field-input block w-full"
          >
            <option value="Asia/Dhaka">Asia/Dhaka (BST +06:00)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div>
          <label className="field-label">Default Language</label>
          <select
            value={form.default_language}
            onChange={(e) => handleChange('default_language', e.target.value)}
            className="field-input block w-full"
          >
            <option value="en">English</option>
            <option value="bn">বাংলা (Bengali)</option>
          </select>
        </div>

        <div>
          <label className="field-label">Date Format</label>
          <select
            value={form.date_format}
            onChange={(e) => handleChange('date_format', e.target.value)}
            className="field-input block w-full"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="field-label">Support Email</label>
          <input
            type="email"
            value={form.support_email}
            onChange={(e) => handleChange('support_email', e.target.value)}
            className="field-input block w-full"
          />
        </div>

        <div>
          <label className="field-label">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="field-input block w-full"
            placeholder="+880 1XXX-XXXXXX"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Address</label>
        <textarea
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
          rows={3}
          className="field-input block w-full rounded-[1.25rem]"
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save General Settings'}
        </button>
      </div>
    </form>
  );
}
