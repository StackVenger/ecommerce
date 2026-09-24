'use client';

import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { EmptyState, PageHeader } from '@/components/ui/bento';
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
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load roles')))
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
    <div>
      {confirmDialog}
      <PageHeader
        title="Roles & Permissions"
        description="Manage access control for your team"
        actions={
          <button type="button" onClick={handleNew} className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Create Role
          </button>
        }
      />

      {/* Roles List */}
      {roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles yet"
          description="Create a role to group permissions for your team."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role, i) => (
            <div key={role.id} className="bento-card bento-card-hover group flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`icon-tile h-12 w-12 group-hover:scale-110 ${ROLE_TONES[i % ROLE_TONES.length]}`}
                  >
                    <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black tracking-tight text-gray-900">
                      {role.name}
                    </h3>
                    {role.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-gray-500">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="pill pill-neutral shrink-0">{role._count.users} users</span>
              </div>
              <div className="mt-5 flex flex-1 flex-wrap content-start gap-1.5">
                {role.permissions.slice(0, 5).map((p) => (
                  <span
                    key={p}
                    className="rounded-lg bg-brand-50 px-2 py-1 text-[10px] font-black text-brand-700"
                  >
                    {p}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500">
                    +{role.permissions.length - 5} more
                  </span>
                )}
              </div>
              <div className="mt-5 flex gap-2 border-t border-foreground/[0.04] pt-5">
                <button
                  type="button"
                  onClick={() => handleEdit(role)}
                  className="btn btn-soft btn-sm"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(role.id)}
                  className="btn btn-danger-soft btn-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-card p-6 shadow-2xl sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-gray-900">
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="field-label" htmlFor="role-name">
                  Role name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Role name"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="role-description">
                  Description
                </label>
                <input
                  id="role-description"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Description"
                  className="field-input"
                />
              </div>

              <div className="space-y-3">
                <p className="field-label mb-0">Permissions</p>
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <div key={group} className="rounded-[1.25rem] bg-gray-50 p-4">
                    <h4 className="eyebrow mb-3">{group}</h4>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((p) => {
                        const checked = form.permissions.includes(p.value);
                        return (
                          <label
                            key={p.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${
                              checked
                                ? 'border-brand-200 bg-card text-brand-700'
                                : 'border-transparent bg-card/60 text-gray-600 hover:bg-card'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.value)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-xs font-bold">{p.value}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-foreground/[0.04] pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-soft">
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn btn-primary">
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_TONES = [
  'bg-brand-50 text-brand-600',
  'bg-purple-50 text-purple-500',
  'bg-blue-50 text-blue-500',
  'bg-emerald-50 text-emerald-500',
  'bg-orange-50 text-orange-500',
];
