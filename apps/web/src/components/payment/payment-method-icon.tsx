import { CreditCard, Banknote, Wallet } from 'lucide-react';

import { cn } from '@/lib/utils';

// Payment method value from the API. Admin can enable/disable
// individual providers; the component falls back to a default icon
// when the string doesn't match a known value, so keeping the type as
// plain `string` is simpler than a union-with-string-literals trick.
type PaymentMethod = string;

interface PaymentMethodIconProps {
  method: PaymentMethod;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const methodConfig: Record<
  string,
  {
    label: string;
    description: string;
    icon: typeof CreditCard;
    color: string;
    bg: string;
  }
> = {
  STRIPE: {
    label: 'Card Payment',
    description: 'Paid via Stripe',
    icon: CreditCard,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
  },
  COD: {
    label: 'Cash on Delivery',
    description: 'Pay ৳ when delivered',
    icon: Banknote,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const containerSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function PaymentMethodIcon({
  method,
  size = 'md',
  showLabel = false,
  className,
}: PaymentMethodIconProps) {
  const config = methodConfig[method] ?? {
    label: method,
    description: 'Payment method',
    icon: Wallet,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  };

  const Icon = config.icon;

  if (showLabel) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl',
            config.bg,
            containerSizes[size],
          )}
        >
          <Icon className={cn(iconSizes[size], config.color)} strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-black text-gray-900">{config.label}</p>
          <p className="text-[11px] font-bold text-gray-500">{config.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        config.bg,
        containerSizes[size],
        className,
      )}
      title={config.label}
    >
      <Icon className={cn(iconSizes[size], config.color)} strokeWidth={2.25} />
    </div>
  );
}
