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
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div
        className={cn(
          'flex overflow-hidden rounded-2xl border bg-card shadow-sm transition-all focus-within:ring-4',
          error
            ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-500/10'
            : 'border-foreground/[0.06] focus-within:border-brand-300 focus-within:ring-brand-500/10',
        )}
      >
        <span className="inline-flex items-center border-r border-foreground/[0.06] bg-gray-50 px-4 text-sm font-bold text-gray-500">
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
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none"
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      {helperText && !error && <p className="field-hint">{helperText}</p>}
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
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Pricing (BDT ৳)</h2>
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
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Inventory</h2>
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
                <label htmlFor="quantity" className="field-label">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="0"
                  value={data.quantity}
                  onChange={(e) => onChange('quantity', parseInt(e.target.value, 10) || 0)}
                  className="field-input w-full"
                />
                {errors.quantity && <p className="field-error">{errors.quantity}</p>}
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label htmlFor="lowStockThreshold" className="field-label">
                  Low Stock Threshold
                </label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={data.lowStockThreshold}
                  onChange={(e) => onChange('lowStockThreshold', parseInt(e.target.value, 10) || 0)}
                  className="field-input w-full"
                />
                <p className="field-hint">Alert when stock drops below this number</p>
              </div>
            </>
          )}

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="field-label">
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
              className="field-input w-full"
            />
            <p className="field-hint">Used for shipping cost calculation</p>
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
