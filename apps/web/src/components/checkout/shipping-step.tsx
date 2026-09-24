'use client';

import { useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ShippingMethod {
  id: string;
  name: string;
  zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  cost: number;
  estimatedDays: string;
  freeAbove: number;
  isFree: boolean;
}

interface ShippingStepProps {
  addressId: string;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string, cost: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ──────────────────────────────────────────────────────────
// Shipping Method Card
// ──────────────────────────────────────────────────────────

interface ShippingMethodCardProps {
  method: ShippingMethod;
  isSelected: boolean;
  onSelect: () => void;
}

function ShippingMethodCard({ method, isSelected, onSelect }: ShippingMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-[1.5rem] border-2 p-5 transition-colors ${
        isSelected
          ? 'border-primary bg-brand-50/60 shadow-brand-glow'
          : 'border-foreground/[0.04] bg-card hover:border-foreground/[0.1]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Radio indicator */}
          <div
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-primary' : 'border-gray-300'
            }`}
          >
            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </div>

          <div>
            {/* Method name */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{method.name}</span>
              {method.isFree && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  FREE
                </span>
              )}
            </div>

            {/* Delivery estimate */}
            <p className="mt-1 text-sm text-gray-500">Estimated delivery: {method.estimatedDays}</p>

            {/* Free shipping threshold hint */}
            {!method.isFree && method.freeAbove > 0 && (
              <p className="mt-1 text-xs text-primary">
                Free on orders above {formatPrice(method.freeAbove)}
              </p>
            )}
          </div>
        </div>

        {/* Cost */}
        <div className="text-right">
          {method.isFree ? (
            <div>
              <span className="text-lg font-bold text-green-600">Free</span>
              {method.cost === 0 && method.freeAbove > 0 && (
                <p className="text-xs text-gray-400 line-through">
                  {formatPrice(method.zone === 'INSIDE_DHAKA' ? 60 : 120)}
                </p>
              )}
            </div>
          ) : (
            <span className="text-lg font-bold text-gray-900">{formatPrice(method.cost)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Zone Info Banner
// ──────────────────────────────────────────────────────────

function ZoneInfo({ zone }: { zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA' }) {
  const isInsideDhaka = zone === 'INSIDE_DHAKA';

  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm mb-6 ${
        isInsideDhaka
          ? 'bg-brand-50 text-brand-800 border border-brand-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-medium">
          {isInsideDhaka ? 'Delivering Inside Dhaka' : 'Delivering Outside Dhaka'}
        </span>
      </div>
      <p className="mt-1 text-xs opacity-80">
        {isInsideDhaka
          ? 'Standard delivery within 1-2 business days'
          : 'Standard delivery within 3-5 business days'}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Shipping Step Component
// ──────────────────────────────────────────────────────────

/**
 * Checkout Step 2: Shipping Method Selection
 *
 * Displays available shipping methods based on the delivery zone
 * (Inside Dhaka vs Outside Dhaka). Shows delivery estimates and
 * highlights free shipping when the order qualifies (above ৳2000).
 */
export default function ShippingStep({
  addressId,
  selectedMethodId,
  onSelectMethod,
  onContinue,
  onBack,
}: ShippingStepProps) {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [zone, setZone] = useState<'INSIDE_DHAKA' | 'OUTSIDE_DHAKA'>('INSIDE_DHAKA');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch shipping methods from API: GET /shipping/calculate?addressId=x
    // For now, use placeholder data
    const fetchMethods = async () => {
      setIsLoading(true);

      // Simulated API response
      const mockZone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA' = 'INSIDE_DHAKA';
      const mockMethods: ShippingMethod[] = [
        {
          id: 'standard',
          name: 'Standard Delivery (Inside Dhaka)',
          zone: mockZone,
          cost: 60,
          estimatedDays: '1-2 days',
          freeAbove: 2000,
          isFree: false,
        },
        {
          id: 'express',
          name: 'Express Delivery (Inside Dhaka)',
          zone: mockZone,
          cost: 120,
          estimatedDays: 'Same day',
          freeAbove: 0,
          isFree: false,
        },
      ];

      setZone(mockZone);
      setMethods(mockMethods);
      setIsLoading(false);
    };

    fetchMethods();
  }, [addressId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title mb-1">Shipping Method</h2>
      <p className="text-sm text-gray-500 mb-6">Choose your preferred delivery option</p>

      {/* Zone indicator */}
      <ZoneInfo zone={zone} />

      {/* Shipping methods */}
      <div className="space-y-3">
        {methods.map((method) => (
          <ShippingMethodCard
            key={method.id}
            method={method}
            isSelected={selectedMethodId === method.id}
            onSelect={() => onSelectMethod(method.id, method.cost)}
          />
        ))}
      </div>

      {/* Delivery info */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Delivery Information</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Inside Dhaka: Standard ৳60, Express ৳120</li>
          <li>Outside Dhaka: Standard ৳120, Express ৳200</li>
          <li>Free standard shipping on orders above ৳2,000</li>
          <li>Delivery times may vary during holidays and peak seasons</li>
        </ul>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
        <button type="button" onClick={onBack} className="btn btn-soft">
          Back to Address
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedMethodId}
          className="btn btn-primary btn-lg"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}
