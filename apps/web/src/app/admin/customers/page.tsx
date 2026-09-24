'use client';

import { Search, Users } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { ListPagination } from '@/components/admin/list-pagination';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { AccountStatusPill, RolePill } from '@/components/admin/users/user-pills';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  orders: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (search) {
        params.set('search', search);
      }
      if (roleFilter) {
        params.set('role', roleFilter);
      }

      const { data } = await apiClient.get(`/admin/users?${params.toString()}`);
      const result = data.data ?? data;
      const rawUsers = result.users ?? result.data ?? (Array.isArray(result) ? result : []);

      setCustomers(
        rawUsers.map((u: any) => ({
          id: u.id,
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          email: u.email,
          phone: u.phone ?? null,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
          orders: u._count?.orders ?? u.orders ?? 0,
        })),
      );

      const pg = result.pagination ?? result.meta ?? result;
      setPagination((prev) => ({
        ...prev,
        total: pg.total ?? 0,
        pages: pg.pages ?? pg.totalPages ?? 0,
      }));
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error(getApiErrorMessage(err, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleStatus = async (id: string) => {
    try {
      await apiClient.patch(`/admin/users/${id}/toggle-active`);
      toast.success('User status updated');
      fetchCustomers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user status'));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      description:
        'Permanently removes the account and all of their orders, reviews, addresses, cart, wishlist, and audit history. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/users/${id}`);
      toast.success(`${name} deleted`);
      fetchCustomers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete customer'));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div>
      {confirmDialog}
      <PageHeader
        title="Customers"
        description={`${pagination.total} total users`}
        actions={
          <div className="flex items-center gap-3 rounded-2xl border border-foreground/[0.04] bg-card px-4 py-2.5 shadow-bento">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <Users className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-lg font-black leading-none tabular-nums tracking-tighter text-gray-900">
                {pagination.total}
              </p>
              <p className="eyebrow mt-0.5">Accounts</p>
            </div>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-3 shadow-bento">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="group/search relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700"
              strokeWidth={2.5}
            />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              aria-label="Search customers"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="field-input border-transparent bg-gray-50 pl-11 shadow-none focus:bg-card"
            />
          </div>
          <select
            value={roleFilter}
            aria-label="Filter by role"
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="field-input border-transparent bg-gray-50 shadow-none sm:w-48"
          >
            <option value="">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bento-card overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="bento-table min-w-[1000px]">
            <thead>
              <tr>
                <th className="pl-4">Customer</th>
                <th>Contact</th>
                <th className="text-center">Role</th>
                <th className="text-center">Status</th>
                <th className="text-center">Orders</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingState label="Loading customers" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState bare icon={Users} title="No customers found." />
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="group">
                    <td className="pl-4">
                      <a
                        href={`/admin/customers/${customer.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-brand-50 text-sm font-black text-brand-700 transition-transform group-hover:scale-105">
                          {customer.firstName.charAt(0)}
                          {customer.lastName.charAt(0)}
                        </div>
                        <span className="whitespace-nowrap text-sm font-black text-gray-900 transition-colors group-hover:text-primary">
                          {customer.firstName} {customer.lastName}
                        </span>
                      </a>
                    </td>
                    <td>
                      <div className="max-w-[220px] truncate text-sm font-bold text-gray-800">
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="text-[11px] font-bold text-gray-400">{customer.phone}</div>
                      )}
                    </td>
                    <td className="text-center">
                      <RolePill role={customer.role} />
                    </td>
                    <td className="text-center">
                      <AccountStatusPill status={customer.status} />
                    </td>
                    <td className="text-center text-sm font-black tabular-nums text-gray-900">
                      {customer.orders}
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString('en-BD', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                      {customer.lastLoginAt ? (
                        new Date(customer.lastLoginAt).toLocaleDateString('en-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="text-gray-300">Never</span>
                      )}
                    </td>
                    <td className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(customer.id)}
                          className={`btn btn-sm ${
                            customer.status === 'ACTIVE'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {customer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        {customer.role !== 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                customer.id,
                                `${customer.firstName} ${customer.lastName}`.trim() ||
                                  customer.email,
                              )
                            }
                            className="btn btn-danger-soft btn-sm"
                            title="Permanently delete this customer and all their data"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          page={pagination.page}
          totalPages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          noun="customers"
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
