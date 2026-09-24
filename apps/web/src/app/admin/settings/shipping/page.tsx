'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api/errors';
import { getSettingsByGroup, updateSettings } from '@/lib/api/settings';

interface ShippingMethod {
  id: string;
  name: string;
  enabled: boolean;
  baseCost: number;
}

interface ShippingZone {
  name: string;
  divisions: string[];
  flatRate: number;
  freeAbove?: number;
  estimatedDays?: number;
}

const BD_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

const DEFAULT_METHODS: ShippingMethod[] = [
  { id: 'standard', name: 'Standard Delivery', enabled: true, baseCost: 60 },
  { id: 'express', name: 'Express Delivery', enabled: true, baseCost: 120 },
  { id: 'same-day', name: 'Same Day (Dhaka Only)', enabled: false, baseCost: 200 },
];

const DEFAULT_ZONES: ShippingZone[] = [
  { name: 'Inside Dhaka', divisions: ['Dhaka'], flatRate: 60, freeAbove: 2000, estimatedDays: 2 },
  {
    name: 'Outside Dhaka',
    divisions: BD_DIVISIONS.filter((d) => d !== 'Dhaka'),
    flatRate: 120,
    freeAbove: 3000,
    estimatedDays: 5,
  },
];

export default function ShippingSettingsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>(DEFAULT_METHODS);
  const [zones, setZones] = useState<ShippingZone[]>(DEFAULT_ZONES);
  const [enableFreeShipping, setEnableFreeShipping] = useState(false);
  const [freeThreshold, setFreeThreshold] = useState(2000);
  const [defaultWeightUnit, setDefaultWeightUnit] = useState('kg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettingsByGroup('shipping')
      .then((data) => {
        if (data.methods) {
          try {
            setMethods(JSON.parse(data.methods));
          } catch {
            /* keep defaults */
          }
        }
        if (data.zones) {
          try {
            setZones(JSON.parse(data.zones));
          } catch {
            /* keep defaults */
          }
        }
        if (data.enable_free_shipping) {
          setEnableFreeShipping(data.enable_free_shipping === 'true');
        }
        if (data.free_shipping_threshold) {
          setFreeThreshold(Number(data.free_shipping_threshold));
        }
        if (data.default_weight_unit) {
          setDefaultWeightUnit(data.default_weight_unit);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleMethod = (id: string) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const updateMethodCost = (id: string, cost: number) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, baseCost: cost } : m)));
  };

  const updateZoneRate = (index: number, rate: number) => {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, flatRate: rate } : z)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings('shipping', {
        methods: JSON.stringify(methods),
        zones: JSON.stringify(zones),
        enable_free_shipping: String(enableFreeShipping),
        free_shipping_threshold: String(freeThreshold),
        default_weight_unit: defaultWeightUnit,
      });
      toast.success('Shipping settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save shipping settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading shipping settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h2 className="text-lg font-black text-gray-900 tracking-tight">Shipping Settings</h2>

      {/* Shipping Methods */}
      <section className="space-y-4">
        <h3 className="font-medium text-gray-800">Shipping Methods</h3>
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-4 rounded-[1.5rem] border border-foreground/[0.05] p-3"
            >
              <input
                type="checkbox"
                checked={method.enabled}
                onChange={() => toggleMethod(method.id)}
                className="rounded border-gray-300 text-brand-600"
              />
              <span className="flex-1 text-sm font-medium">{method.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">৳</span>
                <input
                  type="number"
                  value={method.baseCost}
                  onChange={(e) => updateMethodCost(method.id, Number(e.target.value))}
                  className="field-input w-24 py-2.5"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Zones */}
      <section className="space-y-4">
        <h3 className="font-medium text-gray-800">Shipping Zones</h3>
        <div className="space-y-4">
          {zones.map((zone, idx) => (
            <div key={zone.name} className="rounded-[1.5rem] border border-foreground/[0.05] p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-700">{zone.name}</h4>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Flat Rate: ৳</span>
                  <input
                    type="number"
                    value={zone.flatRate}
                    onChange={(e) => updateZoneRate(idx, Number(e.target.value))}
                    className="field-input w-24 py-2.5"
                  />
                </div>
              </div>
              <p className="field-hint">Divisions: {zone.divisions.join(', ')}</p>
              {zone.estimatedDays && (
                <p className="text-xs text-gray-500">
                  Estimated delivery: {zone.estimatedDays} days
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Free Shipping & Weight */}
      <section className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enableFreeShipping}
            onChange={(e) => setEnableFreeShipping(e.target.checked)}
            className="rounded border-gray-300 text-brand-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable free shipping above threshold
          </span>
        </label>
        {enableFreeShipping && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Threshold: ৳</span>
            <input
              type="number"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(Number(e.target.value))}
              className="field-input w-32 py-2.5"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Default weight unit:</span>
          <select
            value={defaultWeightUnit}
            onChange={(e) => setDefaultWeightUnit(e.target.value)}
            className="field-input w-auto py-2.5"
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="g">Grams (g)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Shipping Settings'}
        </button>
      </div>
    </form>
  );
}
