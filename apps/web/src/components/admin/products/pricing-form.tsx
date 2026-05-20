'use client';

import { DollarSign, Package, AlertTriangle, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface PricingFormData {
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  quantity: number;
  lowStockThreshold: number;
  weight: number | null;
}

interface PricingFormProps {
  data: PricingFormData;
  onChange: <K extends keyof PricingFormData>(field: K, value: PricingFormData[K]) => void;
  errors?: Record<string, string>;
  /** When true the product is sold by variants — base stock fields are
   *  hidden because stock is tracked per-variant in the Variants tab. */
  hasVariants?: boolean;
}

// ──────────────────────────────────────────────────────────
// BDT Currency Input
// ──────────────────────────────────────────────────────────

interface CurrencyInputProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

function CurrencyInput({
  id,
  label,
  value,
  onChange,
  required,
  error,
  helperText,
  placeholder = '0.00',
}: CurrencyInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div
        className={cn(
          'flex rounded-lg border focus-within:ring-1',
          error
            ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
            : 'border-gray-300 focus-within:border-teal-500 focus-within:ring-teal-500',
        )}
      >
        <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-500">
          ৳
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : parseFloat(val));
          }}
          placeholder={placeholder}
          className="flex-1 rounded-r-lg px-4 py-2.5 text-sm focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Pricing & Inventory Form
// ──────────────────────────────────────────────────────────

/**
 * Pricing and inventory form for product creation/editing.
 *
 * All prices are in BDT (৳). Includes selling price, compare-at price,
 * cost price, stock quantity, and low stock threshold.
 */
export function PricingForm({
  data,
  onChange,
  errors = {},
  hasVariants = false,
}: PricingFormProps) {
  // Calculate profit margin
  const margin =
    data.price && data.costPrice
      ? (((data.price - data.costPrice) / data.price) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-8">
      {/* Pricing Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Pricing (BDT ৳)</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Selling Price */}
          <CurrencyInput
            id="price"
            label="Selling Price"
            value={data.price || null}
            onChange={(val) => onChange('price', val ?? 0)}
            required
            error={errors.price}
            placeholder="e.g., 1500.00"
          />

          {/* Compare At Price */}
          <CurrencyInput
            id="compareAtPrice"
            label="Compare At Price"
            value={data.compareAtPrice}
            onChange={(val) => onChange('compareAtPrice', val)}
            helperText="Original price before discount (shown as strikethrough)"
            placeholder="e.g., 2000.00"
          />

          {/* Cost Price */}
          <CurrencyInput
            id="costPrice"
            label="Cost Price"
            value={data.costPrice}
            onChange={(val) => onChange('costPrice', val)}
            helperText="Your cost — not visible to customers"
            placeholder="e.g., 800.00"
          />
        </div>

        {/* Margin Indicator */}
        {margin !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
            <Info className="h-4 w-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              Profit margin:{' '}
              <span
                className={cn(
                  'font-semibold',
                  parseFloat(margin) > 30
                    ? 'text-green-600'
                    : parseFloat(margin) > 10
                      ? 'text-yellow-600'
                      : 'text-red-600',
                )}
              >
                {margin}%
              </span>
              {' · '}
              Profit per unit:{' '}
              <span className="font-semibold text-gray-900">
                ৳{((data.price ?? 0) - (data.costPrice ?? 0)).toFixed(2)}
              </span>
            </p>
          </div>
        )}

        {/* Compare price warning */}
        {data.compareAtPrice !== null &&
          data.compareAtPrice > 0 &&
          data.price >= data.compareAtPrice && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Compare-at price should be higher than the selling price.
              </p>
            </div>
          )}
      </div>

      {/* Inventory Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
        </div>

        {hasVariants && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p>
              Stock is managed per variant in the <strong>Variants</strong> tab. The base Stock
              Quantity is ignored when variants exist.
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!hasVariants && (
            <>
              {/* Stock Quantity */}
              <div>
                <label
                  htmlFor="quantity"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="0"
                  value={data.quantity}
                  onChange={(e) => onChange('quantity', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label
                  htmlFor="lowStockThreshold"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Low Stock Threshold
                </label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={data.lowStockThreshold}
                  onChange={(e) => onChange('lowStockThreshold', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Alert when stock drops below this number
                </p>
              </div>
            </>
          )}

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="mb-1.5 block text-sm font-medium text-gray-700">
              Weight (grams)
            </label>
            <input
              id="weight"
              type="number"
              min="0"
              value={data.weight ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange('weight', val === '' ? null : parseFloat(val));
              }}
              placeholder="e.g., 500"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-gray-500">Used for shipping cost calculation</p>
          </div>
        </div>

        {/* Stock Warning */}
        {!hasVariants && data.quantity > 0 && data.quantity <= data.lowStockThreshold && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <p className="text-sm text-orange-700">
              Current stock ({data.quantity}) is at or below the low stock threshold (
              {data.lowStockThreshold}).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
