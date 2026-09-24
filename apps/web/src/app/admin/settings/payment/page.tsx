'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api/errors';
import { getSettingsByGroup, updateSettings } from '@/lib/api/settings';

interface PaymentSettings {
  enable_cod: string;
  cod_extra_charge: string;
  min_order_amount: string;
  max_cod_amount: string;
  enable_bkash: string;
  enable_nagad: string;
  enable_rocket: string;
  enable_stripe: string;
  stripe_public_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  bdt_to_usd_rate: string;
}

const DEFAULTS: PaymentSettings = {
  enable_cod: 'true',
  cod_extra_charge: '0',
  min_order_amount: '100',
  max_cod_amount: '50000',
  enable_bkash: 'false',
  enable_nagad: 'false',
  enable_rocket: 'false',
  enable_stripe: 'false',
  stripe_public_key: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  bdt_to_usd_rate: '110',
};

export default function PaymentSettingsPage() {
  const [form, setForm] = useState<PaymentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettingsByGroup('payment')
      .then((data) => setForm({ ...DEFAULTS, ...data } as PaymentSettings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof PaymentSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings('payment', form as unknown as Record<string, string>);
      toast.success('Payment settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save payment settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading payment settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h2 className="text-lg font-black text-gray-900 tracking-tight">Payment Settings</h2>

      {/* Cash on Delivery */}
      <section className="space-y-4 rounded-[1.5rem] border border-foreground/[0.05] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800">Cash on Delivery (COD)</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_cod === 'true'}
              onChange={(e) => handleChange('enable_cod', String(e.target.checked))}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm text-gray-600">Enabled</span>
          </label>
        </div>
        {form.enable_cod === 'true' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm text-gray-600">Extra charge (৳)</label>
              <input
                type="number"
                value={form.cod_extra_charge}
                onChange={(e) => handleChange('cod_extra_charge', e.target.value)}
                className="field-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Min order (৳)</label>
              <input
                type="number"
                value={form.min_order_amount}
                onChange={(e) => handleChange('min_order_amount', e.target.value)}
                className="field-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Max COD (৳)</label>
              <input
                type="number"
                value={form.max_cod_amount}
                onChange={(e) => handleChange('max_cod_amount', e.target.value)}
                className="field-input w-full"
              />
            </div>
          </div>
        )}
      </section>

      {/* Mobile Banking */}
      <section className="space-y-4 rounded-[1.5rem] border border-foreground/[0.05] p-4">
        <h3 className="font-medium text-gray-800">Mobile Banking</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_bkash === 'true'}
              onChange={(e) => handleChange('enable_bkash', String(e.target.checked))}
              className="rounded border-gray-300 text-pink-600"
            />
            <span className="text-sm text-gray-700">bKash</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_nagad === 'true'}
              onChange={(e) => handleChange('enable_nagad', String(e.target.checked))}
              className="rounded border-gray-300 text-orange-600"
            />
            <span className="text-sm text-gray-700">Nagad</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_rocket === 'true'}
              onChange={(e) => handleChange('enable_rocket', String(e.target.checked))}
              className="rounded border-gray-300 text-purple-600"
            />
            <span className="text-sm text-gray-700">Rocket</span>
          </label>
        </div>
      </section>

      {/* Stripe */}
      <section className="space-y-4 rounded-[1.5rem] border border-foreground/[0.05] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800">Stripe</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_stripe === 'true'}
              onChange={(e) => handleChange('enable_stripe', String(e.target.checked))}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm text-gray-600">Enabled</span>
          </label>
        </div>

        {form.enable_stripe === 'true' && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="field-label">Publishable Key</label>
              <input
                type="text"
                value={form.stripe_public_key}
                onChange={(e) => handleChange('stripe_public_key', e.target.value)}
                className="field-input block w-full"
                placeholder="pk_live_..."
              />
            </div>
            <div>
              <label className="field-label">Secret Key</label>
              <input
                type="password"
                value={form.stripe_secret_key}
                onChange={(e) => handleChange('stripe_secret_key', e.target.value)}
                className="field-input block w-full"
                placeholder="sk_live_..."
              />
            </div>
            <div>
              <label className="field-label">Webhook Secret</label>
              <input
                type="password"
                value={form.stripe_webhook_secret}
                onChange={(e) => handleChange('stripe_webhook_secret', e.target.value)}
                className="field-input block w-full"
                placeholder="whsec_..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Currency Conversion */}
      <section className="space-y-3 rounded-[1.5rem] border border-foreground/[0.05] p-4">
        <h3 className="font-medium text-gray-800">Currency Conversion</h3>
        <p className="text-sm text-gray-500">
          Stripe processes in USD. Set the BDT to USD exchange rate.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">1 USD =</span>
          <input
            type="number"
            value={form.bdt_to_usd_rate}
            onChange={(e) => handleChange('bdt_to_usd_rate', e.target.value)}
            className="field-input w-28 py-2.5"
            step="0.01"
          />
          <span className="text-sm text-gray-600">৳ BDT</span>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </form>
  );
}
