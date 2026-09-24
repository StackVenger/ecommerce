import { cn } from '@/lib/utils';

interface PaymentBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Order statuses
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'bg-brand-50',
    text: 'text-brand-700',
    dot: 'bg-brand-500',
  },
  PROCESSING: {
    label: 'Processing',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  SHIPPED: {
    label: 'Shipped',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  // Payment statuses
  COMPLETED: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  REFUNDED: {
    label: 'Refunded',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  PARTIALLY_REFUNDED: {
    label: 'Partial Refund',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-500',
  },
};

const sizeClasses = {
  sm: 'px-2.5 py-0.5 text-[9px]',
  md: 'px-3 py-1 text-[10px]',
  lg: 'px-3.5 py-1.5 text-[11px]',
};

export function PaymentBadge({ status, size = 'md', className }: PaymentBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl font-black uppercase tracking-widest',
        config.bg,
        config.text,
        sizeClasses[size],
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
