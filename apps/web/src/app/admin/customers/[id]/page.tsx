'use client';

import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UserX,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OrderStatusPill } from '@/components/admin/orders/order-status';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { AccountStatusPill, RolePill } from '@/components/admin/users/user-pills';
import {
  BentoGlow,
  EmptyState,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatCard,
} from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

/**
 * Admin detail view for a single customer. Backfills the gap the audit
 * called out: the customers list has no drill-through today. Reads
 * GET /admin/users/:id; flips active status via PATCH
 * /admin/users/:id/toggle-active; deletes via DELETE /admin/users/:id.
 *
 * Order history and lifetime spend show when /admin/users/:id returns
 * them nested; otherwise the page still renders the profile cleanly.
 */

interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  status: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  orders?: Array<{
    id: string;
    orderNumber: string;
    totalAmount: string | number;
    status: string;
    createdAt: string;
  }>;
  _count?: {
    orders?: number;
  };
}

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const res = await apiClient.get<{ data?: AdminUser } | AdminUser>(`/admin/users/${id}`);
      const payload = (res.data as { data?: AdminUser }).data ?? (res.data as AdminUser);
      setUser(payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load customer:', err);
      toast.error(getApiErrorMessage(err, 'Failed to load customer'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async () => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      await apiClient.patch(`/admin/users/${user.id}/toggle-active`);
      toast.success(user.status === 'ACTIVE' ? 'Customer deactivated' : 'Customer activated');
      await load();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Toggle active failed:', err);
      toast.error('Action failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteCustomer = async () => {
    if (!user) {
      return;
    }
    const ok = await confirm({
      title: 'Delete this customer?',
      description: `${user.email} will be removed permanently along with their saved addresses. Their orders stay in the system with the email kept for reference.`,
      confirmLabel: 'Delete customer',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      await apiClient.delete(`/admin/users/${user.id}`);
      toast.success('Customer deleted');
      router.push('/admin/customers');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete failed:', err);
      toast.error('Delete failed');
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading customer" className="min-h-[400px]" />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Customer not found."
        action={
          <Link href="/admin/customers" className="btn btn-soft">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Back to customers
          </Link>
        }
      />
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed customer';
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => (n as string).charAt(0).toUpperCase())
      .join('') || user.email.charAt(0).toUpperCase();

  return (
    <div>
      {dialog}
      <PageHeader
        eyebrow={
          <Link
            href="/admin/customers"
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Back to customers
          </Link>
        }
        title={fullName}
        description={user.email}
        actions={
          <>
            <button
              type="button"
              onClick={toggleActive}
              disabled={busy}
              className="btn btn-secondary"
            >
              {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={deleteCustomer}
              disabled={busy}
              className="btn btn-danger"
            >
              <UserX className="h-4 w-4" strokeWidth={2.5} />
              Delete
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
        {/* Identity */}
        <section className="bento-dark col-span-2 p-7 md:col-span-6 xl:col-span-4">
          <BentoGlow variant="dark" />
          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-black text-white shadow-brand-glow">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-tight text-white">{fullName}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <RolePill role={user.role} />
                  <AccountStatusPill status={user.status} />
                </div>
              </div>
            </div>
            <div className="mt-auto space-y-2 text-sm font-bold text-white/70">
              <p className="flex items-center gap-2 break-all">
                <Mail className="h-4 w-4 shrink-0 text-white/40" strokeWidth={2.25} />
                {user.email}
                {user.emailVerified && (
                  <ShieldCheck
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-label="Verified"
                    strokeWidth={2.25}
                  />
                )}
              </p>
              {user.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-white/40" strokeWidth={2.25} />
                  {user.phone}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Lifetime spend */}
        <section className="bento-primary col-span-2 flex flex-col justify-between gap-6 p-7 md:col-span-6 xl:col-span-4">
          <BentoGlow variant="primary" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Wallet className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">
              Lifetime spend
            </p>
            <p className="text-4xl font-black tabular-nums tracking-tighter sm:text-5xl">
              {formatSpend(user.orders)}
            </p>
          </div>
        </section>

        <StatCard
          label="Total orders"
          value={String(user._count?.orders ?? user.orders?.length ?? 0)}
          icon={ShoppingBag}
          tone="emerald"
          className="md:col-span-3 xl:col-span-2"
        />
        <StatCard
          label="Member since"
          value={new Date(user.createdAt).toLocaleDateString('en-BD', {
            month: 'short',
            year: 'numeric',
          })}
          icon={CalendarDays}
          tone="blue"
          className="md:col-span-3 xl:col-span-2"
        />

        {/* Profile */}
        <section className="bento-card col-span-2 p-6 sm:p-8 md:col-span-6 xl:col-span-4">
          <SectionHeader title="Profile" caption="Account details" icon={UserRound} />
          <dl className="space-y-3.5 text-sm">
            <Row label="First name" value={user.firstName ?? '—'} />
            <Row label="Last name" value={user.lastName ?? '—'} />
            <Row label="Email" value={user.email} />
            <Row label="Phone" value={user.phone ?? '—'} />
            <Row
              label="Registered"
              value={new Date(user.createdAt).toLocaleString('en-BD', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
            <Row
              label="Last login"
              value={
                user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('en-BD', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'
              }
            />
          </dl>
        </section>

        {/* Recent orders */}
        <section className="bento-card col-span-2 p-6 sm:p-8 md:col-span-6 xl:col-span-8">
          <SectionHeader title="Recent orders" caption="Latest 10 orders" icon={ShoppingBag} />
          {!user.orders || user.orders.length === 0 ? (
            <p className="rounded-[1.5rem] bg-gray-50 py-10 text-center text-sm font-bold text-gray-400">
              No orders yet.
            </p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="bento-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th className="text-center">Status</th>
                    <th>Placed</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="whitespace-nowrap text-sm font-black text-gray-900 transition-colors hover:text-primary"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="text-center">
                        <OrderStatusPill status={o.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString('en-BD')}
                      </td>
                      <td className="whitespace-nowrap text-right text-sm font-black tabular-nums text-gray-900">
                        ৳{Number(o.totalAmount).toLocaleString('en-BD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-foreground/[0.03] pb-3.5 last:border-0 last:pb-0">
      <dt className="shrink-0 font-bold text-gray-500">{label}</dt>
      <dd className="truncate text-right font-black text-gray-900">{value}</dd>
    </div>
  );
}

function formatSpend(orders?: AdminUser['orders']): string {
  if (!orders || orders.length === 0) {
    return '৳0';
  }
  const total = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  return `৳${total.toLocaleString('en-BD')}`;
}
