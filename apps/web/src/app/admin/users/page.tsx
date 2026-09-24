'use client';

import { Search, UserPlus, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ListPagination } from '@/components/admin/list-pagination';
import { RolePill } from '@/components/admin/users/user-pills';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      if (roleFilter) {
        params.set('role', roleFilter);
      }
      params.set('page', String(page));
      params.set('limit', '20');

      const { data } = await apiClient.get(`/admin/users?${params}`);
      const result = data.data ?? data;
      setUsers(result.users ?? result ?? []);
      setPagination(result.pagination ?? { total: 0, page: 1, limit: 20, pages: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleActive = async (id: string) => {
    try {
      await apiClient.patch(`/admin/users/${id}/toggle-active`);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user status'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description={pagination ? `${pagination.total} total users` : 'Loading...'}
        actions={
          <Link href="/admin/users/new" className="btn btn-primary">
            <UserPlus className="h-4 w-4" strokeWidth={2.5} />
            Add User
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-6 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-3 shadow-bento">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="group/search relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700"
                strokeWidth={2.5}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                aria-label="Search users"
                className="field-input border-transparent bg-gray-50 pl-11 shadow-none focus:bg-card"
              />
            </div>
            <button type="submit" className="btn btn-dark">
              Search
            </button>
          </form>

          <select
            value={roleFilter}
            aria-label="Filter by role"
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="field-input border-transparent bg-gray-50 shadow-none sm:w-48"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="CUSTOMER">Customer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bento-card overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="bento-table min-w-[760px]">
            <thead>
              <tr>
                <th className="pl-4">Name</th>
                <th>Email</th>
                <th className="text-center">Role</th>
                <th className="text-center">Orders</th>
                <th className="text-center">Status</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <LoadingState label="Loading users" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState bare icon={UsersIcon} title="No users found" />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="group">
                    <td className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gray-100 text-xs font-black text-gray-700 transition-transform group-hover:scale-105">
                          {(user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '') ||
                            user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="whitespace-nowrap text-sm font-black text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-sm font-bold text-gray-500">
                      {user.email}
                    </td>
                    <td className="text-center">
                      <RolePill role={user.role} />
                    </td>
                    <td className="text-center text-sm font-black tabular-nums text-gray-900">
                      {user._count.orders}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(user.id)}
                        title="Toggle active status"
                        className={`pill transition-transform hover:scale-105 ${
                          user.status === 'ACTIVE' ? 'pill-success' : 'pill-danger'
                        }`}
                      >
                        {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="pr-4 text-right">
                      <Link href={`/admin/users/${user.id}`} className="btn btn-soft btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <ListPagination
            page={page}
            totalPages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            noun="users"
            onPageChange={(p) => setPage(Math.min(Math.max(1, p), pagination.pages))}
          />
        )}
      </div>
    </div>
  );
}
