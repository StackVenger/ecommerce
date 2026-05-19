'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
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
      .catch(() => toast.error(getApiErrorMessage(err, 'Failed to load user')))
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
    return <div className="animate-pulse text-gray-400">Loading user details...</div>;
  }

  if (!user) {
    return <div className="text-red-500">User not found</div>;
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit Form or Info Display */}
      {editing ? (
        <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="+880 1XXX-XXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-full flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-500">Role</dt>
            <dd className="mt-1 text-sm font-medium">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {user.status === 'ACTIVE' ? 'Active' : user.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Orders</dt>
            <dd className="mt-1 text-sm font-medium">{user._count.orders}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Reviews</dt>
            <dd className="mt-1 text-sm font-medium">{user._count.reviews}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Joined</dt>
            <dd className="mt-1 text-sm">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Last Login</dt>
            <dd className="mt-1 text-sm">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            </dd>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent Orders</h2>
        {user.orders.length === 0 ? (
          <p className="text-sm text-gray-400">No orders yet</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Order #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {user.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-2 text-sm font-medium text-teal-600">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      ৳{Number(order.totalAmount ?? 0).toLocaleString('en-BD')}
                    </td>
                    <td className="px-4 py-2 text-sm">{order.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
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
