'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { AddressForm } from '@/components/account/address-form';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import {
  getAddresses,
  createAddress,
  type Address,
  type CreateAddressData,
} from '@/lib/api/addresses';
import { getSessionId } from '@/lib/api/cart';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  placeOrder,
  calculateShipping,
  type PlaceOrderPayload,
  type ShippingMethod,
} from '@/lib/api/orders';

// ──────────────────────────────────────────────────────────
// Bangladesh Divisions and Districts
// ──────────────────────────────────────────────────────────

const BD_DIVISIONS: Record<string, string[]> = {
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Chattogram: [
    'Bandarban',
    'Brahmanbaria',
    'Chandpur',
    'Chattogram',
    'Comilla',
    "Cox's Bazar",
    'Feni',
    'Khagrachhari',
    'Lakshmipur',
    'Noakhali',
    'Rangamati',
  ],
  Dhaka: [
    'Dhaka',
    'Faridpur',
    'Gazipur',
    'Gopalganj',
    'Kishoreganj',
    'Madaripur',
    'Manikganj',
    'Munshiganj',
    'Narayanganj',
    'Narsingdi',
    'Rajbari',
    'Shariatpur',
    'Tangail',
  ],
  Khulna: [
    'Bagerhat',
    'Chuadanga',
    'Jessore',
    'Jhenaidah',
    'Khulna',
    'Kushtia',
    'Magura',
    'Meherpur',
    'Narail',
    'Satkhira',
  ],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  Rajshahi: [
    'Bogura',
    'Chapainawabganj',
    'Joypurhat',
    'Naogaon',
    'Natore',
    'Nawabganj',
    'Pabna',
    'Rajshahi',
    'Sirajganj',
  ],
  Rangpur: [
    'Dinajpur',
    'Gaibandha',
    'Kurigram',
    'Lalmonirhat',
    'Nilphamari',
    'Panchagarh',
    'Rangpur',
    'Thakurgaon',
  ],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
};

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

const CHECKOUT_STEPS = [
  { id: 'address', label: 'Address', icon: '📍' },
  { id: 'shipping', label: 'Shipping', icon: '🚚' },
  { id: 'payment', label: 'Payment', icon: '💳' },
  { id: 'review', label: 'Review', icon: '✅' },
] as const;

type StepId = (typeof CHECKOUT_STEPS)[number]['id'];

type PaymentMethodType = 'CARD' | 'COD' | 'BKASH';

interface GuestInfo {
  fullName: string;
  email: string;
  phone: string;
}

interface GuestAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  division: string;
  district: string;
  area: string;
  postalCode: string;
}

interface CheckoutData {
  addressId: string | null;
  shippingMethodId: string | null;
  shippingCost: number;
  paymentMethod: PaymentMethodType | null;
  couponCode: string | null;
  // Guest fields
  guestInfo: GuestInfo;
  guestAddress: GuestAddress;
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
// Stepper Component
// ──────────────────────────────────────────────────────────

interface StepperProps {
  currentStep: StepId;
  completedSteps: StepId[];
  onStepClick: (step: StepId) => void;
}

function Stepper({ currentStep, completedSteps, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {CHECKOUT_STEPS.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = isCompleted || isCurrent;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 w-full group ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {index < CHECKOUT_STEPS.length - 1 && (
                <div
                  className={`hidden sm:block h-0.5 flex-1 mx-2 mt-[-1.5rem] ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────
// Order Summary Sidebar
// ──────────────────────────────────────────────────────────

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shippingCost: number | null;
  total: number;
  itemCount: number;
  /** Rate-card cost before free-shipping kicks in; used for the strike-through. */
  shippingBaseCost?: number | null;
}

function OrderSummary({
  subtotal,
  discount,
  shippingCost,
  shippingBaseCost,
  total,
  itemCount,
}: OrderSummaryProps) {
  const isFreeShipping = shippingCost === 0 && (shippingBaseCost ?? 0) > 0;
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 sticky top-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          {shippingCost === null ? (
            <span className="text-gray-400 italic">Calculated next</span>
          ) : isFreeShipping ? (
            <span className="flex items-baseline gap-2 font-medium">
              <span className="text-gray-400 line-through">
                {formatPrice(shippingBaseCost ?? 0)}
              </span>
              <span className="text-green-600">Free</span>
            </span>
          ) : shippingCost === 0 ? (
            <span className="font-medium text-green-600">Free</span>
          ) : (
            <span className="font-medium text-gray-900">{formatPrice(shippingCost)}</span>
          )}
        </div>
      </div>

      <div className="my-5 border-t border-gray-200" />

      <CheckoutCouponInput />

      <div className="my-5 border-t border-gray-200" />

      <div className="flex justify-between items-baseline">
        <span className="text-base font-semibold text-gray-900">Total</span>
        <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
      </div>

      <p className="mt-1 text-xs text-gray-400 text-right">BDT ৳ (Bangladeshi Taka)</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Checkout Coupon Input
// ──────────────────────────────────────────────────────────

function CheckoutCouponInput() {
  const { cart, applyCoupon, removeCoupon, isUpdating } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await applyCoupon(trimmed);
      setCode('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Failed to apply coupon';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (cart?.couponCode) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-green-800">
              Coupon &quot;{cart.couponCode}&quot; applied
            </p>
            {cart.discount > 0 && (
              <p className="text-xs text-green-600 mt-0.5">You save {formatPrice(cart.discount)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            disabled={isUpdating}
            className="text-xs font-medium text-green-700 hover:text-red-600 transition-colors disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">Have a coupon?</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Enter code"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={!code.trim() || busy || isUpdating}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Guest Contact Info Form
// ──────────────────────────────────────────────────────────

interface GuestInfoFormProps {
  guestInfo: GuestInfo;
  onChange: (info: GuestInfo) => void;
  errors?: Record<string, string>;
}

function GuestInfoForm({ guestInfo, onChange, errors }: GuestInfoFormProps) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-600"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <h3 className="text-base font-semibold text-amber-900">Guest Checkout</h3>
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Please provide your contact information so we can send you order updates.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="guestName"
            type="text"
            value={guestInfo.fullName}
            onChange={(e) => onChange({ ...guestInfo, fullName: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
              errors?.fullName
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="Your full name"
          />
          {errors?.fullName && <p className="mt-1.5 text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="guestEmail"
              type="email"
              value={guestInfo.email}
              onChange={(e) => onChange({ ...guestInfo, email: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
                errors?.email
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                  : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
              placeholder="you@example.com"
            />
            {errors?.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="guestPhone"
              type="tel"
              value={guestInfo.phone}
              onChange={(e) => onChange({ ...guestInfo, phone: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
                errors?.phone
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                  : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
              placeholder="+880 1XXX-XXXXXX"
            />
            {errors?.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Guest Address Form (Inline)
// ──────────────────────────────────────────────────────────

interface GuestAddressFormProps {
  address: GuestAddress;
  onChange: (address: GuestAddress) => void;
  errors?: Record<string, string>;
}

function GuestAddressForm({ address, onChange, errors }: GuestAddressFormProps) {
  const districts = address.division ? BD_DIVISIONS[address.division] || [] : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="shipName" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Name <span className="text-red-500">*</span>
          </label>
          <input
            id="shipName"
            type="text"
            required
            value={address.fullName}
            onChange={(e) => onChange({ ...address, fullName: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
              errors?.addressFullName
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="Recipient full name"
          />
          {errors?.addressFullName && (
            <p className="mt-1.5 text-xs text-red-500">{errors.addressFullName}</p>
          )}
        </div>
        <div>
          <label htmlFor="shipPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="shipPhone"
            type="tel"
            required
            value={address.phone}
            onChange={(e) => onChange({ ...address, phone: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
              errors?.addressPhone
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="+880 1XXX-XXXXXX"
          />
          {errors?.addressPhone && (
            <p className="mt-1.5 text-xs text-red-500">{errors.addressPhone}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="shipAddr1" className="block text-sm font-medium text-gray-700 mb-1">
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          id="shipAddr1"
          type="text"
          required
          value={address.addressLine1}
          onChange={(e) => onChange({ ...address, addressLine1: e.target.value })}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
            errors?.addressLine1
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
              : 'border-gray-300 focus:border-primary focus:ring-primary'
          }`}
          placeholder="House no., road, area"
        />
        {errors?.addressLine1 && (
          <p className="mt-1.5 text-xs text-red-500">{errors.addressLine1}</p>
        )}
      </div>

      <div>
        <label htmlFor="shipAddr2" className="block text-sm font-medium text-gray-700 mb-1">
          Apartment, Suite, etc. <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="shipAddr2"
          type="text"
          value={address.addressLine2}
          onChange={(e) => onChange({ ...address, addressLine2: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="Apartment, suite, floor"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="shipDivision" className="block text-sm font-medium text-gray-700 mb-1">
            Division <span className="text-red-500">*</span>
          </label>
          <select
            id="shipDivision"
            required
            value={address.division}
            onChange={(e) => onChange({ ...address, division: e.target.value, district: '' })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none bg-white ${
              errors?.division
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
          >
            <option value="">Select Division</option>
            {Object.keys(BD_DIVISIONS).map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
          {errors?.division && <p className="mt-1.5 text-xs text-red-500">{errors.division}</p>}
        </div>
        <div>
          <label htmlFor="shipDistrict" className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-red-500">*</span>
          </label>
          <select
            id="shipDistrict"
            required
            value={address.district}
            onChange={(e) => onChange({ ...address, district: e.target.value })}
            disabled={!address.division}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors?.district
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
          >
            <option value="">Select District</option>
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
          {errors?.district && <p className="mt-1.5 text-xs text-red-500">{errors.district}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="shipArea" className="block text-sm font-medium text-gray-700 mb-1">
            Area / Town <span className="text-red-500">*</span>
          </label>
          <input
            id="shipArea"
            type="text"
            required
            value={address.area}
            onChange={(e) => onChange({ ...address, area: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
              errors?.area
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="Area or town"
          />
          {errors?.area && <p className="mt-1.5 text-xs text-red-500">{errors.area}</p>}
        </div>
        <div>
          <label htmlFor="shipPostal" className="block text-sm font-medium text-gray-700 mb-1">
            Postal Code <span className="text-red-500">*</span>
          </label>
          <input
            id="shipPostal"
            type="text"
            required
            value={address.postalCode}
            onChange={(e) => onChange({ ...address, postalCode: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-1 outline-none ${
              errors?.postalCode
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 bg-red-50/10'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="1000"
          />
          {errors?.postalCode && <p className="mt-1.5 text-xs text-red-500">{errors.postalCode}</p>}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Saved Address Card (for authenticated users)
// ──────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address;
  isSelected: boolean;
  onSelect: () => void;
}

function AddressCard({ address, isSelected, onSelect }: AddressCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
        isSelected ? 'border-primary bg-teal-50' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {address.label || 'Home'}
            </span>
            <p className="font-medium text-gray-900">{address.fullName}</p>
          </div>
          <p className="mt-1 text-sm text-gray-600">{address.phone}</p>
          <p className="mt-1 text-sm text-gray-500">
            {address.addressLine1}
            {address.addressLine2 && `, ${address.addressLine2}`}
          </p>
          <p className="text-sm text-gray-500">
            {address.city}, {address.district}
            {address.division && `, ${address.division}`}
            {address.postalCode && ` ${address.postalCode}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {address.isDefault && (
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-primary">
              Default
            </span>
          )}
          <div
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-primary' : 'border-gray-300'
            }`}
          >
            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </div>
        </div>
      </div>
    </button>
  );
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
      className={`w-full text-left rounded-xl border-2 p-5 transition-colors ${
        isSelected ? 'border-primary bg-teal-50' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-primary' : 'border-gray-300'
            }`}
          >
            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{method.name}</span>
              {method.isFree && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  FREE
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">Estimated delivery: {method.estimatedDays}</p>
            {!method.isFree && method.freeAbove > 0 && (
              <p className="mt-1 text-xs text-primary">
                Free on orders above {formatPrice(method.freeAbove)}
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          {method.isFree ? (
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(method.baseCost)}
              </span>
              <span className="text-lg font-bold text-green-600">Free</span>
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
// Payment Options
// ──────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethodType;
  name: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}> = [
  {
    id: 'CARD',
    name: 'Credit / Debit Card',
    description: 'Pay securely with Visa, Mastercard, or AMEX via Stripe',
    badge: 'Recommended',
  },
  {
    id: 'COD',
    name: 'Cash on Delivery',
    description: 'Pay with cash when your order is delivered',
  },
  {
    id: 'BKASH',
    name: 'bKash Mobile Payment',
    description: 'Pay using your bKash mobile wallet',
    badge: 'Coming Soon',
    disabled: true,
  },
];

// ──────────────────────────────────────────────────────────
// Checkout Login Form Component
// ──────────────────────────────────────────────────────────

function CheckoutLoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        email,
        password,
        rememberMe: true,
      });
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to sign in. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto py-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="checkoutEmail" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="checkoutEmail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="checkoutPassword" className="block text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="checkoutPassword"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-2"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="text-center text-sm text-gray-500 mt-4">
        Don&apos;t have an account?{' '}
        <Link
          href={`/register?redirect=${encodeURIComponent('/checkout')}`}
          className="font-medium text-primary hover:underline"
        >
          Create one now
        </Link>
      </p>
    </form>
  );
}

// ──────────────────────────────────────────────────────────
// Checkout Page
// ──────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { cart, refreshCart } = useCart();

  const [currentStep, setCurrentStep] = useState<StepId>('address');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest');

  const handleGuestInfoChange = (info: GuestInfo) => {
    setCheckoutData((prev) => ({ ...prev, guestInfo: info }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (info.fullName !== checkoutData.guestInfo.fullName) delete next.fullName;
      if (info.email !== checkoutData.guestInfo.email) delete next.email;
      if (info.phone !== checkoutData.guestInfo.phone) delete next.phone;
      return next;
    });
  };

  const handleGuestAddressChange = (addr: GuestAddress) => {
    setCheckoutData((prev) => ({ ...prev, guestAddress: addr }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (addr.fullName !== checkoutData.guestAddress.fullName) delete next.addressFullName;
      if (addr.phone !== checkoutData.guestAddress.phone) delete next.addressPhone;
      if (addr.addressLine1 !== checkoutData.guestAddress.addressLine1) delete next.addressLine1;
      if (addr.division !== checkoutData.guestAddress.division) delete next.division;
      if (addr.district !== checkoutData.guestAddress.district) delete next.district;
      if (addr.area !== checkoutData.guestAddress.area) delete next.area;
      if (addr.postalCode !== checkoutData.guestAddress.postalCode) delete next.postalCode;
      return next;
    });
  };

  // Saved addresses (authenticated users)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Shipping methods
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingZone, setShippingZone] = useState<'INSIDE_DHAKA' | 'OUTSIDE_DHAKA'>(
    'INSIDE_DHAKA',
  );
  const [shippingLoading, setShippingLoading] = useState(false);

  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    addressId: null,
    shippingMethodId: null,
    shippingCost: 0,
    paymentMethod: null,
    couponCode: null,
    guestInfo: { fullName: '', email: '', phone: '' },
    guestAddress: {
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      division: '',
      district: '',
      area: '',
      postalCode: '',
    },
  });

  const isGuest = !authLoading && !isAuthenticated;

  // Load saved addresses for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      setAddressesLoading(true);
      getAddresses()
        .then((addresses) => {
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find((a) => a.isDefault);
          if (defaultAddr) {
            setCheckoutData((prev) => ({ ...prev, addressId: defaultAddr.id }));
          }
        })
        .catch(() => {})
        .finally(() => setAddressesLoading(false));
    }
  }, [isAuthenticated]);

  // Load shipping methods when address is selected or guest division changes
  const loadShipping = useCallback(async () => {
    setShippingLoading(true);
    try {
      const params: { addressId?: string; division?: string; subtotal?: number } = {};
      if (isGuest && checkoutData.guestAddress.district) {
        params.division = checkoutData.guestAddress.district;
      } else if (checkoutData.addressId) {
        params.addressId = checkoutData.addressId;
      } else {
        setShippingLoading(false);
        return;
      }
      if (cart?.subtotal !== undefined && cart.subtotal !== null) {
        params.subtotal = cart.subtotal;
      }
      const result = await calculateShipping(params);
      setShippingMethods(result.methods);
      setShippingZone(result.zone);
    } catch {
      // Use fallback methods
      setShippingMethods([
        {
          id: 'standard',
          name: 'Standard Delivery',
          zone: 'INSIDE_DHAKA',
          baseCost: 60,
          cost: 60,
          estimatedDays: '1-2 days',
          freeAbove: 2000,
          isFree: false,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          zone: 'INSIDE_DHAKA',
          baseCost: 120,
          cost: 120,
          estimatedDays: 'Same day',
          freeAbove: 0,
          isFree: false,
        },
      ]);
    } finally {
      setShippingLoading(false);
    }
  }, [isGuest, checkoutData.addressId, checkoutData.guestAddress.district, cart?.subtotal]);

  // Cart-derived values
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  const itemCount = cart?.itemCount ?? 0;
  const cartItems = cart?.items ?? [];

  const orderSummary = useMemo(() => {
    const shipping = checkoutData.shippingMethodId ? checkoutData.shippingCost : null;
    const total = subtotal - discount + (shipping ?? 0);
    const chosen = checkoutData.shippingMethodId
      ? shippingMethods.find((m) => m.id === checkoutData.shippingMethodId)
      : undefined;
    return {
      subtotal,
      discount,
      shippingCost: shipping,
      shippingBaseCost: chosen?.baseCost ?? null,
      total,
      itemCount,
    };
  }, [
    subtotal,
    discount,
    checkoutData.shippingMethodId,
    checkoutData.shippingCost,
    itemCount,
    shippingMethods,
  ]);

  // Validation for each step (Bangladeshi perspective)

  const validateAddressStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isGuest) {
      // 1. Guest Info Validation (optional fields - only validate when they have values)
      const guestName = checkoutData.guestInfo.fullName.trim();
      if (guestName) {
        if (guestName.length < 3) {
          newErrors.fullName = 'Name must be at least 3 characters long';
        } else if (!/^[a-zA-Z\s.]+$/.test(guestName)) {
          newErrors.fullName = 'Name can only contain letters, spaces, and periods (.)';
        }
      }

      const guestEmail = checkoutData.guestInfo.email.trim();
      if (guestEmail) {
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(guestEmail)) {
          newErrors.email = 'Please enter a valid email address';
        }
      }

      const guestPhone = checkoutData.guestInfo.phone.trim();
      if (guestPhone) {
        const cleanPhone = guestPhone.replace(/[\s-]/g, '');
        if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone)) {
          newErrors.phone = 'Please enter a valid 11-digit Bangladeshi mobile number (e.g., 017XXXXXXXX)';
        }
      }

      // 2. Guest Address Validation
      const addressName = checkoutData.guestAddress.fullName.trim();
      if (!addressName) {
        newErrors.addressFullName = 'Recipient name is required';
      } else if (addressName.length < 3) {
        newErrors.addressFullName = 'Recipient name must be at least 3 characters long';
      } else if (!/^[a-zA-Z\s.]+$/.test(addressName)) {
        newErrors.addressFullName = 'Recipient name can only contain letters, spaces, and periods (.)';
      }

      const addressPhone = checkoutData.guestAddress.phone.trim();
      if (!addressPhone) {
        newErrors.addressPhone = 'Recipient phone number is required';
      } else {
        const cleanAddrPhone = addressPhone.replace(/[\s-]/g, '');
        if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(cleanAddrPhone)) {
          newErrors.addressPhone = 'Please enter a valid 11-digit Bangladeshi mobile number (e.g., 017XXXXXXXX)';
        }
      }

      const addressLine1 = checkoutData.guestAddress.addressLine1.trim();
      if (!addressLine1) {
        newErrors.addressLine1 = 'Street address is required';
      } else if (addressLine1.length < 6) {
        newErrors.addressLine1 = 'Please enter a detailed street address (minimum 6 characters)';
      }

      if (!checkoutData.guestAddress.division) {
        newErrors.division = 'Division is required';
      }

      if (!checkoutData.guestAddress.district) {
        newErrors.district = 'District is required';
      }

      const area = checkoutData.guestAddress.area.trim();
      if (!area) {
        newErrors.area = 'Area/town is required';
      } else if (area.length < 3) {
        newErrors.area = 'Area/town must be at least 3 characters long';
      }

      const postalCode = checkoutData.guestAddress.postalCode.trim();
      if (!postalCode) {
        newErrors.postalCode = 'Postal code is required';
      } else if (!/^\d{4}$/.test(postalCode)) {
        newErrors.postalCode = 'Postal code in Bangladesh must be exactly 4 digits (e.g., 1209)';
      }
    } else {
      if (!checkoutData.addressId) {
        newErrors.addressId = 'Please select a shipping address';
      }
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isGuestInfoValid =
    (checkoutData.guestInfo.fullName.trim() === '' ||
      (checkoutData.guestInfo.fullName.trim().length >= 3 &&
        /^[a-zA-Z\s.]+$/.test(checkoutData.guestInfo.fullName.trim()))) &&
    (checkoutData.guestInfo.email.trim() === '' ||
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(checkoutData.guestInfo.email.trim())) &&
    (checkoutData.guestInfo.phone.trim() === '' ||
      /^(?:\+?88)?01[3-9]\d{8}$/.test(checkoutData.guestInfo.phone.trim().replace(/[\s-]/g, '')));

  const isGuestAddressValid =
    checkoutData.guestAddress.fullName.trim() !== '' &&
    checkoutData.guestAddress.phone.trim() !== '' &&
    checkoutData.guestAddress.addressLine1.trim() !== '' &&
    checkoutData.guestAddress.division.trim() !== '' &&
    checkoutData.guestAddress.district.trim() !== '' &&
    checkoutData.guestAddress.area.trim() !== '' &&
    checkoutData.guestAddress.postalCode.trim() !== '';

  const isAddressStepValid = isGuest
    ? isGuestInfoValid && isGuestAddressValid
    : checkoutData.addressId !== null;

  // Step navigation
  const goToNextStep = () => {
    const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === currentStep);
    const nextStep = CHECKOUT_STEPS[currentIndex + 1];
    if (currentIndex < CHECKOUT_STEPS.length - 1 && nextStep) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      setCurrentStep(nextStep.id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === currentStep);
    const prevStep = CHECKOUT_STEPS[currentIndex - 1];
    if (currentIndex > 0 && prevStep) {
      setCurrentStep(prevStep.id);
    }
  };

  const handleStepClick = (stepId: StepId) => {
    setCurrentStep(stepId);
  };

  // Save a new address from the inline form on the checkout address step.
  // The new address is appended to the saved list and auto-selected — users
  // can manage (rename, delete, set default) it later from /account/addresses.
  const handleCreateAddress = async (data: CreateAddressData) => {
    setSavingAddress(true);
    try {
      const created = await createAddress(data);
      setSavedAddresses((prev) => [created, ...prev]);
      setCheckoutData((prev) => ({ ...prev, addressId: created.id }));
      setShowAddAddress(false);
      toast.success('Address saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save address'));
    } finally {
      setSavingAddress(false);
    }
  };

  // Handle address continue - load shipping
  const handleAddressContinue = async () => {
    if (!validateAddressStep()) {
      toast.error('Please correct the validation errors before continuing');
      return;
    }
    await loadShipping();
    goToNextStep();
  };

  // Handle shipping selection
  const handleSelectShipping = (methodId: string, cost: number) => {
    setCheckoutData((prev) => ({
      ...prev,
      shippingMethodId: methodId,
      shippingCost: cost,
    }));
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    if (!checkoutData.shippingMethodId || !checkoutData.paymentMethod) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PlaceOrderPayload = {
        shippingMethodId: checkoutData.shippingMethodId,
        paymentMethod: checkoutData.paymentMethod,
      };

      const appliedCoupon = cart?.couponCode ?? checkoutData.couponCode;
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon;
      }

      if (isGuest) {
        if (checkoutData.guestInfo.fullName.trim() !== '') {
          payload.guestFullName = checkoutData.guestInfo.fullName.trim();
        }
        if (checkoutData.guestInfo.email.trim() !== '') {
          payload.guestEmail = checkoutData.guestInfo.email.trim();
        }
        if (checkoutData.guestInfo.phone.trim() !== '') {
          payload.guestPhone = checkoutData.guestInfo.phone.trim();
        }
        payload.shippingFullName = checkoutData.guestAddress.fullName;
        payload.shippingPhone = checkoutData.guestAddress.phone;
        payload.shippingAddressLine1 = checkoutData.guestAddress.addressLine1;
        payload.shippingAddressLine2 = checkoutData.guestAddress.addressLine2;
        payload.shippingDivision = checkoutData.guestAddress.division;
        payload.shippingDistrict = checkoutData.guestAddress.district;
        payload.shippingArea = checkoutData.guestAddress.area;
        payload.shippingPostalCode = checkoutData.guestAddress.postalCode;
      } else {
        payload.addressId = checkoutData.addressId!;
      }

      const sessionId = isGuest ? getSessionId() : undefined;
      const result = await placeOrder(payload, sessionId);

      toast.success(`Order placed successfully! Order #${result.orderNumber}`);
      await refreshCart();

      if (isGuest) {
        router.push(
          `/orders/track?orderNumber=${result.orderNumber}&email=${encodeURIComponent(checkoutData.guestInfo.email)}`,
        );
      } else {
        router.push(`/account/orders`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to place order. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the selected address details for review
  const selectedAddress = savedAddresses.find((a) => a.id === checkoutData.addressId);

  const reviewAddress = isGuest
    ? {
        name: checkoutData.guestAddress.fullName,
        phone: checkoutData.guestAddress.phone,
        line1: checkoutData.guestAddress.addressLine1,
        line2: checkoutData.guestAddress.addressLine2,
        area: checkoutData.guestAddress.area,
        district: checkoutData.guestAddress.district,
        division: checkoutData.guestAddress.division,
        postalCode: checkoutData.guestAddress.postalCode,
      }
    : selectedAddress
      ? {
          name: selectedAddress.fullName,
          phone: selectedAddress.phone,
          line1: selectedAddress.addressLine1,
          line2: selectedAddress.addressLine2 || '',
          area: selectedAddress.city,
          district: selectedAddress.district,
          division: selectedAddress.division || '',
          postalCode: selectedAddress.postalCode || '',
        }
      : null;

  const selectedShippingMethod = shippingMethods.find(
    (m) => m.id === checkoutData.shippingMethodId,
  );

  // ── Render Step Content ──────────────────────────────────

  const renderStepContent = () => {
    switch (currentStep) {
      case 'address':
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isGuest ? 'Contact & Shipping Address' : 'Shipping Address'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isGuest
                ? 'Enter your contact details and delivery address'
                : 'Select or add a delivery address'}
            </p>

            {/* Mode Selector for unauthenticated guests */}
            {isGuest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setCheckoutMode('guest')}
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    checkoutMode === 'guest'
                      ? 'border-primary bg-teal-50/30 ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                      checkoutMode === 'guest' ? 'border-primary' : 'border-gray-300'
                    }`}
                  >
                    {checkoutMode === 'guest' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Checkout as Guest</h3>
                    <p className="text-xs text-gray-500 mt-1">No account needed. Fast and simple checkout.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutMode('login')}
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    checkoutMode === 'login'
                      ? 'border-primary bg-teal-50/30 ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                      checkoutMode === 'login' ? 'border-primary' : 'border-gray-300'
                    }`}
                  >
                    {checkoutMode === 'login' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Sign In / Register</h3>
                    <p className="text-xs text-gray-500 mt-1">Use saved addresses, track orders, and more.</p>
                  </div>
                </button>
              </div>
            )}

            {/* Inline Login Form */}
            {isGuest && checkoutMode === 'login' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900">Sign In to Your Account</h3>
                </div>
                <CheckoutLoginForm />
              </div>
            )}

            {/* Guest contact info */}
            {isGuest && checkoutMode === 'guest' && (
              <GuestInfoForm
                guestInfo={checkoutData.guestInfo}
                onChange={handleGuestInfoChange}
                errors={validationErrors}
              />
            )}

            {/* Guest address form */}
            {isGuest && checkoutMode === 'guest' && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Delivery Address</h3>
                <GuestAddressForm
                  address={checkoutData.guestAddress}
                  onChange={handleGuestAddressChange}
                  errors={validationErrors}
                />
              </div>
            )}

            {/* Saved addresses for authenticated users */}
            {!isGuest && (
              <>
                {addressesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
                  </div>
                ) : (
                  <>
                    {savedAddresses.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {savedAddresses.map((address) => (
                          <AddressCard
                            key={address.id}
                            address={address}
                            isSelected={checkoutData.addressId === address.id}
                            onSelect={() =>
                              setCheckoutData((prev) => ({ ...prev, addressId: address.id }))
                            }
                          />
                        ))}
                      </div>
                    )}

                    {showAddAddress ? (
                      <div className="mb-6">
                        <AddressForm
                          onSubmit={handleCreateAddress}
                          onCancel={() => setShowAddAddress(false)}
                          isLoading={savingAddress}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(true)}
                        className="w-full mb-6 rounded-xl border-2 border-dashed border-gray-300 px-4 py-4 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
                      >
                        {savedAddresses.length > 0
                          ? '+ Deliver to a different address'
                          : '+ Add a delivery address'}
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {(!isGuest || checkoutMode === 'guest') && (
              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleAddressContinue}
                  disabled={shippingLoading || isSubmitting}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Shipping
                </button>
              </div>
            )}
          </div>
        );

      case 'shipping':
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Shipping Method</h2>
            <p className="text-sm text-gray-500 mb-6">Choose your preferred delivery option</p>

            {/* Zone indicator */}
            <div
              className={`rounded-lg px-4 py-3 text-sm mb-6 ${
                shippingZone === 'INSIDE_DHAKA'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span className="font-medium">
                {shippingZone === 'INSIDE_DHAKA'
                  ? 'Delivering Inside Dhaka'
                  : 'Delivering Outside Dhaka'}
              </span>
            </div>

            {shippingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <ShippingMethodCard
                    key={method.id}
                    method={method}
                    isSelected={checkoutData.shippingMethodId === method.id}
                    onSelect={() => handleSelectShipping(method.id, method.cost)}
                  />
                ))}
              </div>
            )}

            <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Delivery Information</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Inside Dhaka: Standard ৳60, Express ৳120</li>
                <li>Outside Dhaka: Standard ৳120, Express ৳200</li>
                <li>Free standard shipping on orders above ৳2,000</li>
              </ul>
            </div>

            <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={goToPreviousStep}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Address
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!checkoutData.shippingMethodId}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Method</h2>
            <p className="text-sm text-gray-500 mb-6">How would you like to pay?</p>

            <div className="space-y-3">
              {PAYMENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    !option.disabled &&
                    setCheckoutData((prev) => ({ ...prev, paymentMethod: option.id }))
                  }
                  disabled={option.disabled}
                  className={`w-full text-left rounded-xl border-2 p-5 transition-colors ${
                    option.disabled
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      : checkoutData.paymentMethod === option.id
                        ? 'border-primary bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        option.disabled
                          ? 'border-gray-200'
                          : checkoutData.paymentMethod === option.id
                            ? 'border-primary'
                            : 'border-gray-300'
                      }`}
                    >
                      {checkoutData.paymentMethod === option.id && !option.disabled && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{option.name}</span>
                        {option.badge && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              option.disabled
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-teal-100 text-primary'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {checkoutData.paymentMethod === 'COD' && (
              <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Cash on Delivery</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Pay the delivery person when you receive your order</li>
                  <li>Please keep exact change ready</li>
                  <li>Available for orders up to ৳10,000</li>
                </ul>
              </div>
            )}

            <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={goToPreviousStep}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Shipping
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!checkoutData.paymentMethod}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Review
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Your Order</h2>
            <p className="text-sm text-gray-500 mb-6">
              Please verify everything before placing your order
            </p>

            {/* Guest info */}
            {isGuest && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Contact Info
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('address')}
                    className="text-xs text-primary hover:text-teal-800 font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                  <p className="font-medium text-gray-900">{checkoutData.guestInfo.fullName}</p>
                  <p className="text-gray-600 mt-1">{checkoutData.guestInfo.email}</p>
                  <p className="text-gray-600">{checkoutData.guestInfo.phone}</p>
                </div>
              </div>
            )}

            {/* Cart items */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Items
              </h3>
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-white">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.images[0] && (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        SKU: {item.product.sku} &middot; Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatPrice(item.lineTotal)}
                      </p>
                      <p className="text-xs text-gray-400">{formatPrice(item.price)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            {reviewAddress && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Shipping Address
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('address')}
                    className="text-xs text-primary hover:text-teal-800 font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                  <p className="font-medium text-gray-900">{reviewAddress.name}</p>
                  <p className="text-gray-600 mt-1">{reviewAddress.phone}</p>
                  <p className="text-gray-500 mt-1">
                    {reviewAddress.line1}
                    {reviewAddress.line2 && `, ${reviewAddress.line2}`}
                  </p>
                  <p className="text-gray-500">
                    {reviewAddress.area}, {reviewAddress.district}
                    {reviewAddress.division && `, ${reviewAddress.division}`}
                    {reviewAddress.postalCode && ` ${reviewAddress.postalCode}`}
                  </p>
                </div>
              </div>
            )}

            {/* Shipping method */}
            {selectedShippingMethod && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Delivery Method
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('shipping')}
                    className="text-xs text-primary hover:text-teal-800 font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{selectedShippingMethod.name}</span>
                    {selectedShippingMethod.isFree ? (
                      <span className="flex items-baseline gap-2 font-semibold">
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(selectedShippingMethod.baseCost)}
                        </span>
                        <span className="text-green-600">Free</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900">
                        {formatPrice(selectedShippingMethod.cost)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Payment Method
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep('payment')}
                  className="text-xs text-primary hover:text-teal-800 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                <span className="font-medium text-gray-900">
                  {PAYMENT_OPTIONS.find((o) => o.id === checkoutData.paymentMethod)?.name ??
                    checkoutData.paymentMethod}
                </span>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Order Total
              </h3>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    {selectedShippingMethod?.isFree ? (
                      <span className="flex items-baseline gap-2 font-medium">
                        <span className="text-gray-400 line-through">
                          {formatPrice(selectedShippingMethod.baseCost)}
                        </span>
                        <span className="text-green-600">Free</span>
                      </span>
                    ) : checkoutData.shippingCost === 0 ? (
                      <span className="font-medium text-green-600">Free</span>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {formatPrice(checkoutData.shippingCost)}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(orderSummary.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary hover:underline">
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={goToPreviousStep}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Payment
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={!termsAccepted || isSubmitting}
                className={`rounded-xl px-10 py-3.5 text-sm font-semibold text-white transition-colors ${
                  termsAccepted && !isSubmitting
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  `Place Order — ${formatPrice(orderSummary.total)}`
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Empty cart guard
  if (!authLoading && itemCount === 0) {
    return (
      <div className="site-container px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some items to your cart before checkout.</p>
        <a
          href="/products"
          className="inline-flex items-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  // Surface cart price changes: CartItem.price is the snapshot at add-to-cart
  // time; the variant/product carry the live price. If the admin changed the
  // price since then, the customer's cart total still uses the snapshot —
  // warn them once so they can review before placing the order.
  const priceChangeNotices = (cart?.items ?? [])
    .map((item) => {
      const livePrice = Number(item.variant?.price ?? item.product.price);
      const snapshotPrice = Number(item.price);
      if (Math.abs(livePrice - snapshotPrice) <= 0.005) {
        return null;
      }
      const label = item.variant
        ? `${item.product.name} (${item.variant.name})`
        : item.product.name;
      return `The price of ${label} changed since you added it (was ৳${snapshotPrice.toFixed(2)}, now ৳${livePrice.toFixed(2)}).`;
    })
    .filter((m): m is string => m !== null);

  return (
    <div className="site-container px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      {priceChangeNotices.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-medium text-yellow-800">Prices have changed</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-yellow-700">
            {priceChangeNotices.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-yellow-700">
            Your cart total still uses the prices at the time you added these items. Remove and re-add the items to use the latest price.
          </p>
        </div>
      )}

      <Stepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">{renderStepContent()}</div>

        <div className="mt-10 lg:mt-0 lg:col-span-4">
          <OrderSummary {...orderSummary} />
        </div>
      </div>
    </div>
  );
}
