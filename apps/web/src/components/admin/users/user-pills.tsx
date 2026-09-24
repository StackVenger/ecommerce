import { StatusPill } from '@/components/ui/bento';

// Literal tone maps for user role / account status pills.

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral' | 'purple';

const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  CUSTOMER: { label: 'Customer', tone: 'brand' },
  ADMIN: { label: 'Admin', tone: 'purple' },
  SUPER_ADMIN: { label: 'Super Admin', tone: 'danger' },
  EDITOR: { label: 'Editor', tone: 'info' },
};

const ACCOUNT_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  PENDING_VERIFICATION: { label: 'Unverified', tone: 'warning' },
};

export function RolePill({ role, className }: { role: string; className?: string }) {
  const meta = ROLE_META[role] ?? { label: role, tone: 'neutral' as const };
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}

export function AccountStatusPill({ status, className }: { status: string; className?: string }) {
  const meta = ACCOUNT_STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}
