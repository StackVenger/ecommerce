'use client';

import { ArrowLeft, Pencil, ShoppingBag, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OrderStatusPill } from '@/components/admin/orders/order-status';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { AccountStatusPill, RolePill } from '@/components/admin/users/user-pills';
import { EmptyState, LoadingState, PageHeader, SectionHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    division: string;
    postalCode: string;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number | string;
    status: string;
    createdAt: string;
  }>;
  _count: { orders: number; reviews: number };
}

const ROLES = ['CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    apiClient
      .get(`/admin/users/${id}`)
      .then(({ data }) => {
        const u = data.data ?? data;
        setUser(u);
        setForm({
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone ?? '',
          role: u.role,
        });
      })
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load user')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/admin/users/${id}`, form);
      toast.success('User updated');
      setEditing(false);
      const { data } = await apiClient.get(`/admin/users/${id}`);
      setUser(data.data ?? data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this user?',
      description: 'This permanently removes the account and all of their data.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      router.push('/admin/users');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete user'));
    }
  };

  if (loading) {
    return <LoadingState label="Loading user details" className="min-h-[400px]" />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={UserRound}
        title="User not found"
        action={
          <Link href="/admin/users" className="btn btn-soft">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Back to users
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {confirmDialog}
      <PageHeader
        eyebrow={
          <Link
            href="/admin/users"
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Users
          </Link>
        }
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        actions={
          <>
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className={`btn ${editing ? 'btn-soft' : 'btn-secondary'}`}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-danger-soft">
              Delete
            </button>
          </>
        }
      />

      {/* Edit Form or Info Display */}
      {editing ? (
        <div className="bento-card mb-6 p-6 sm:p-8">
          <SectionHeader title="Edit user" caption="Profile & access" icon={Pencil} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="user-first-name">
                First Name
              </label>
              <input
                id="user-first-name"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="user-last-name">
                Last Name
              </label>
              <input
                id="user-last-name"
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="user-phone">
                Phone
              </label>
              <input
                id="user-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="field-input"
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="user-role">
                Role
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="field-input"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-full flex justify-end border-t border-foreground/[0.04] pt-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-6">
          <div className="bento-card flex flex-col justify-between gap-3 p-5">
            <p className="eyebrow">Role</p>
            <RolePill role={user.role} className="w-fit" />
          </div>
          <div className="bento-card flex flex-col justify-between gap-3 p-5">
            <p className="eyebrow">Status</p>
            <AccountStatusPill status={user.status} className="w-fit" />
          </div>
          <div className="bento-card flex flex-col justify-between gap-2 p-5">
            <p className="eyebrow">Orders</p>
            <p className="stat-value text-3xl">{user._count.orders}</p>
          </div>
          <div className="bento-card flex flex-col justify-between gap-2 p-5">
            <p className="eyebrow">Reviews</p>
            <p className="stat-value text-3xl">{user._count.reviews}</p>
          </div>
          <div className="bento-card flex flex-col justify-between gap-2 p-5">
            <p className="eyebrow">Joined</p>
            <p className="text-sm font-black text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="bento-card flex flex-col justify-between gap-2 p-5">
            <p className="eyebrow">Last Login</p>
            <p className="text-sm font-black text-gray-900">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <section className="bento-card p-6 sm:p-8">
        <SectionHeader title="Recent Orders" caption="Order history" icon={ShoppingBag} />
        {user.orders.length === 0 ? (
          <p className="rounded-[1.5rem] bg-gray-50 py-10 text-center text-sm font-bold text-gray-400">
            No orders yet
          </p>
        ) : (
          <div className="-mx-3 overflow-x-auto">
            <table className="bento-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {user.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap text-sm font-black text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="whitespace-nowrap text-right text-sm font-black tabular-nums text-gray-900">
                      ৳{Number(order.totalAmount ?? 0).toLocaleString('en-BD')}
                    </td>
                    <td className="text-center">
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
