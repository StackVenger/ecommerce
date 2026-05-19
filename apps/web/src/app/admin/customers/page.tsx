'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
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

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  CUSTOMER: { label: 'Customer', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  SUPER_ADMIN: { label: 'Super Admin', className: 'bg-red-100 text-red-700 border-red-200' },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  SUSPENDED: { label: 'Suspended', className: 'bg-red-100 text-red-700 border-red-200' },
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
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
    <div className="space-y-6">
      {confirmDialog}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">{pagination.total} total users</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                      <span className="ml-3 text-gray-500">Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const roleBadge = ROLE_BADGES[customer.role] ?? {
                    label: customer.role,
                    className: 'bg-gray-100 text-gray-700 border-gray-200',
                  };
                  const statusBadge = STATUS_BADGES[customer.status] ?? {
                    label: customer.status,
                    className: 'bg-gray-100 text-gray-700 border-gray-200',
                  };
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
                            {customer.firstName.charAt(0)}
                            {customer.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                        {customer.phone && (
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={roleBadge.label} className={roleBadge.className} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={statusBadge.label} className={statusBadge.className} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{customer.orders}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString('en-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {customer.lastLoginAt ? (
                          new Date(customer.lastLoginAt).toLocaleDateString('en-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleStatus(customer.id)}
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              customer.status === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {customer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          {customer.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() =>
                                handleDelete(
                                  customer.id,
                                  `${customer.firstName} ${customer.lastName}`.trim() ||
                                    customer.email,
                                )
                              }
                              className="text-xs px-2 py-1 rounded font-medium text-red-600 hover:bg-red-50"
                              title="Permanently delete this customer and all their data"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              customers
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const startPage = Math.max(1, pagination.page - 2);
                const p = startPage + i;
                if (p > pagination.pages) {
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1 border rounded text-sm ${
                      p === pagination.page
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-gray-300 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
