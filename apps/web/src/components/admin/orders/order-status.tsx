import { StatusPill } from '@/components/ui/bento';

// ──────────────────────────────────────────────────────────
// Order / payment status pills
//
// Literal tone maps (no dynamic `bg-${color}` classes) so Tailwind keeps
// every variant. Shared by the dashboard, the orders list and the
// order detail page.
// ──────────────────────────────────────────────────────────

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral' | 'purple';

export const ORDER_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PROCESSING: { label: 'Processing', tone: 'brand' },
  SHIPPED: { label: 'Shipped', tone: 'purple' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

export const PAYMENT_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'brand' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', tone: 'warning' },
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function OrderStatusPill({ status, className }: { status: string; className?: string }) {
  const meta = ORDER_STATUS_META[status] ?? { label: humanize(status), tone: 'neutral' as const };
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}

export function PaymentStatusPill({ status, className }: { status: string; className?: string }) {
  const meta = PAYMENT_STATUS_META[status] ?? { label: humanize(status), tone: 'neutral' as const };
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}
