'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { getAddresses, type Address } from '@/lib/api/addresses';
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
}

function OrderSummary({ subtotal, discount, shippingCost, total, itemCount }: OrderSummaryProps) {
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
          <span
            className={shippingCost !== null ? 'font-medium text-gray-900' : 'text-gray-400 italic'}
          >
            {shippingCost !== null
              ? shippingCost === 0
                ? 'Free'
                : formatPrice(shippingCost)
              : 'Calculated next'}
          </span>
        </div>
      </div>

      <div className="my-6 border-t border-gray-200" />

      <div className="flex justify-between items-baseline">
        <span className="text-base font-semibold text-gray-900">Total</span>
        <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
      </div>

      <p className="mt-1 text-xs text-gray-400 text-right">BDT ৳ (Bangladeshi Taka)</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Guest Contact Info Form
// ──────────────────────────────────────────────────────────

interface GuestInfoFormProps {
  guestInfo: GuestInfo;
  onChange: (info: GuestInfo) => void;
}

function GuestInfoForm({ guestInfo, onChange }: GuestInfoFormProps) {
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
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="guestName"
            type="text"
            required
            value={guestInfo.fullName}
            onChange={(e) => onChange({ ...guestInfo, fullName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Your full name"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="guestEmail"
              type="email"
              required
              value={guestInfo.email}
              onChange={(e) => onChange({ ...guestInfo, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="guestPhone"
              type="tel"
              required
              value={guestInfo.phone}
              onChange={(e) => onChange({ ...guestInfo, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="+880 1XXX-XXXXXX"
            />
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
}

function GuestAddressForm({ address, onChange }: GuestAddressFormProps) {
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Recipient full name"
          />
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="+880 1XXX-XXXXXX"
          />
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
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="House no., road, area"
        />
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
          >
            <option value="">Select Division</option>
            {Object.keys(BD_DIVISIONS).map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select District</option>
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Area or town"
          />
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="1000"
          />
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
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{address.fullName}</p>
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

        <div className="flex items-center gap-2">
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
            <span className="text-lg font-bold text-green-600">Free</span>
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

  // Saved addresses (authenticated users)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

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
      const params: { addressId?: string; division?: string } = {};
      if (isGuest && checkoutData.guestAddress.district) {
        params.division = checkoutData.guestAddress.district;
      } else if (checkoutData.addressId) {
        params.addressId = checkoutData.addressId;
      } else {
        setShippingLoading(false);
        return;
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
          cost: 60,
          estimatedDays: '1-2 days',
          freeAbove: 2000,
          isFree: false,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          zone: 'INSIDE_DHAKA',
          cost: 120,
          estimatedDays: 'Same day',
          freeAbove: 0,
          isFree: false,
        },
      ]);
    } finally {
      setShippingLoading(false);
    }
  }, [isGuest, checkoutData.addressId, checkoutData.guestAddress.district]);

  // Cart-derived values
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  const itemCount = cart?.itemCount ?? 0;
  const cartItems = cart?.items ?? [];

  const orderSummary = useMemo(() => {
    const shipping = checkoutData.shippingMethodId ? checkoutData.shippingCost : null;
    const total = subtotal - discount + (shipping ?? 0);
    return { subtotal, discount, shippingCost: shipping, total, itemCount };
  }, [subtotal, discount, checkoutData.shippingMethodId, checkoutData.shippingCost, itemCount]);

  // Validation for each step
  const isGuestInfoValid =
    checkoutData.guestInfo.fullName.trim() !== '' &&
    checkoutData.guestInfo.email.trim() !== '' &&
    checkoutData.guestInfo.phone.trim() !== '';

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

  // Handle address continue - load shipping
  const handleAddressContinue = async () => {
    if (!isAddressStepValid) {
      toast.error(
        isGuest ? 'Please fill in all required fields' : 'Please select a shipping address',
      );
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

      if (checkoutData.couponCode) {
        payload.couponCode = checkoutData.couponCode;
      }

      if (isGuest) {
        payload.guestFullName = checkoutData.guestInfo.fullName;
        payload.guestEmail = checkoutData.guestInfo.email;
        payload.guestPhone = checkoutData.guestInfo.phone;
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

            {/* Guest contact info */}
            {isGuest && (
              <GuestInfoForm
                guestInfo={checkoutData.guestInfo}
                onChange={(info) => setCheckoutData((prev) => ({ ...prev, guestInfo: info }))}
              />
            )}

            {/* Guest address form */}
            {isGuest && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Delivery Address</h3>
                <GuestAddressForm
                  address={checkoutData.guestAddress}
                  onChange={(addr) => setCheckoutData((prev) => ({ ...prev, guestAddress: addr }))}
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
                ) : savedAddresses.length > 0 ? (
                  <div className="space-y-3 mb-6">
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
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center mb-6">
                    <p className="text-gray-500 mb-2">No saved addresses found.</p>
                    <a
                      href="/account/addresses"
                      className="text-sm font-medium text-primary hover:text-teal-800"
                    >
                      Add an address in your account settings
                    </a>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleAddressContinue}
                disabled={!isAddressStepValid}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Shipping
              </button>
            </div>
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
                    <span className="font-semibold text-gray-900">
                      {selectedShippingMethod.cost === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(selectedShippingMethod.cost)
                      )}
                    </span>
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
                    <span className="font-medium text-gray-900">
                      {checkoutData.shippingCost === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(checkoutData.shippingCost)
                      )}
                    </span>
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

  return (
    <div className="site-container px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

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
