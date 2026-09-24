'use client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type PaymentMethodType = 'CARD' | 'COD' | 'BKASH';

interface PaymentStepProps {
  selectedMethod: PaymentMethodType | null;
  onSelectMethod: (method: PaymentMethodType) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface PaymentOption {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

// ──────────────────────────────────────────────────────────
// Payment Option Icons
// ──────────────────────────────────────────────────────────

function CardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function BkashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Payment Methods Configuration
// ──────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'CARD',
    name: 'Credit / Debit Card',
    description: 'Pay securely with Visa, Mastercard, or AMEX via Stripe',
    icon: <CardIcon />,
    badge: 'Recommended',
  },
  {
    id: 'COD',
    name: 'Cash on Delivery',
    description: 'Pay with cash when your order is delivered to your door',
    icon: <CashIcon />,
  },
  {
    id: 'BKASH',
    name: 'bKash Mobile Payment',
    description: 'Pay using your bKash mobile wallet',
    icon: <BkashIcon />,
    badge: 'Coming Soon',
    disabled: true,
    disabledReason: 'bKash integration is coming soon. Please use Card or COD.',
  },
];

// ──────────────────────────────────────────────────────────
// Payment Option Card
// ──────────────────────────────────────────────────────────

interface PaymentOptionCardProps {
  option: PaymentOption;
  isSelected: boolean;
  onSelect: () => void;
}

function PaymentOptionCard({ option, isSelected, onSelect }: PaymentOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={option.disabled}
      className={`w-full text-left rounded-[1.5rem] border-2 p-5 transition-colors ${
        option.disabled
          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
          : isSelected
            ? 'border-primary bg-brand-50'
            : 'border-gray-200 hover:border-gray-300 bg-card'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Radio indicator */}
        <div
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            option.disabled ? 'border-gray-200' : isSelected ? 'border-primary' : 'border-gray-300'
          }`}
        >
          {isSelected && !option.disabled && (
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          )}
        </div>

        {/* Icon */}
        <div
          className={`flex-shrink-0 ${
            option.disabled ? 'text-gray-300' : isSelected ? 'text-primary' : 'text-gray-400'
          }`}
        >
          {option.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{option.name}</span>
            {option.badge && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  option.disabled ? 'bg-gray-100 text-gray-500' : 'bg-brand-100 text-primary'
                }`}
              >
                {option.badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{option.description}</p>
          {option.disabled && option.disabledReason && (
            <p className="mt-1 text-xs text-amber-600">{option.disabledReason}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Card Payment Form (Stripe placeholder)
// ──────────────────────────────────────────────────────────

function CardPaymentForm() {
  return (
    <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Card Details</h3>

      <div className="space-y-4">
        {/* Card number */}
        <div>
          <label htmlFor="cardNumber" className="field-label">
            Card Number
          </label>
          <input
            id="cardNumber"
            type="text"
            placeholder="4242 4242 4242 4242"
            className="field-input"
          />
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cardExpiry" className="field-label">
              Expiry Date
            </label>
            <input id="cardExpiry" type="text" placeholder="MM/YY" className="field-input" />
          </div>
          <div>
            <label htmlFor="cardCvc" className="field-label">
              CVC
            </label>
            <input id="cardCvc" type="text" placeholder="123" className="field-input" />
          </div>
        </div>
      </div>

      {/* Stripe badge */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>Payments are securely processed by Stripe</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// COD Info
// ──────────────────────────────────────────────────────────

function CodInfo() {
  return (
    <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
      <p className="font-medium mb-1">Cash on Delivery</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Pay the delivery person when you receive your order</li>
        <li>Please keep exact change ready</li>
        <li>Available for orders up to ৳10,000</li>
        <li>Order may require verification via phone call</li>
      </ul>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Payment Step Component
// ──────────────────────────────────────────────────────────

/**
 * Checkout Step 3: Payment Method Selection
 *
 * Offers multiple payment options:
 * - Credit/Debit Card via Stripe
 * - Cash on Delivery (COD)
 * - bKash mobile payment (placeholder/coming soon)
 */
export default function PaymentStep({
  selectedMethod,
  onSelectMethod,
  onContinue,
  onBack,
}: PaymentStepProps) {
  return (
    <div>
      <h2 className="section-title mb-1">Payment Method</h2>
      <p className="text-sm text-gray-500 mb-6">How would you like to pay?</p>

      {/* Payment options */}
      <div className="space-y-3">
        {PAYMENT_OPTIONS.map((option) => (
          <PaymentOptionCard
            key={option.id}
            option={option}
            isSelected={selectedMethod === option.id}
            onSelect={() => onSelectMethod(option.id)}
          />
        ))}
      </div>

      {/* Method-specific content */}
      {selectedMethod === 'CARD' && <CardPaymentForm />}
      {selectedMethod === 'COD' && <CodInfo />}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
        <button type="button" onClick={onBack} className="btn btn-soft">
          Back to Shipping
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedMethod}
          className="btn btn-primary btn-lg"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
