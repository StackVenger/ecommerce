'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Permission {
  key: string;
  value: string;
  group: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  _count: { users: number };
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    Promise.all([apiClient.get('/admin/roles'), apiClient.get('/admin/roles/permissions')])
      .then(([rolesRes, permRes]) => {
        setRoles(rolesRes.data.data ?? rolesRes.data ?? []);
        setPermissions(permRes.data.data ?? permRes.data ?? []);
      })
      .catch(() => toast.error(getApiErrorMessage(err, 'Failed to load roles')))
      .finally(() => setLoading(false));
  }, []);

  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const togglePermission = (value: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(value)
        ? prev.permissions.filter((p) => p !== value)
        : [...prev.permissions, value],
    }));
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', permissions: [] });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
        await apiClient.patch(`/admin/roles/${editingRole.id}`, form);
      } else {
        await apiClient.post('/admin/roles', form);
      }
      const { data } = await apiClient.get('/admin/roles');
      setRoles(data.data ?? data ?? []);
      setShowForm(false);
      toast.success('Role saved');
    } catch (err: any) {
      const msg =
        err?.response?.status === 501
          ? 'Custom roles are not yet supported'
          : 'Failed to save role';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this role?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/roles/${id}`);
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success('Role deleted');
    } catch (err: any) {
      const msg =
        err?.response?.status === 501
          ? 'Built-in roles cannot be deleted'
          : 'Cannot delete role with assigned users';
      toast.error(msg);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-400">Loading roles...</div>;
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500">Manage access control for your team</p>
        </div>
        <button
          onClick={handleNew}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Create Role
        </button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border p-4 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{role.name}</h3>
                {role.description && (
                  <p className="mt-1 text-xs text-gray-500">{role.description}</p>
                )}
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {role._count.users} users
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {role.permissions.slice(0, 5).map((p) => (
                <span key={p} className="rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-600">
                  {p}
                </span>
              ))}
              {role.permissions.length > 5 && (
                <span className="text-xs text-gray-400">+{role.permissions.length - 5} more</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleEdit(role)}
                className="text-sm text-teal-600 hover:text-teal-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Role Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
            </h2>

            <div className="mt-4 space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Role name"
                className="block w-full rounded-md border-gray-300 shadow-sm"
              />
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="block w-full rounded-md border-gray-300 shadow-sm"
              />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Permissions</h3>
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <div key={group}>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">{group}</h4>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((p) => (
                        <label key={p.value} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p.value)}
                            onChange={() => togglePermission(p.value)}
                            className="rounded border-gray-300 text-teal-600"
                          />
                          <span className="text-xs text-gray-600">{p.value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
