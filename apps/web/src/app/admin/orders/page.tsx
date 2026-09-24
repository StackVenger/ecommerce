'use client';

import { Download, Filter, Search, ShoppingBag, X } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { ListPagination } from '@/components/admin/list-pagination';
import { OrderStatusPill, PaymentStatusPill } from '@/components/admin/orders/order-status';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingMethod: string;
  createdAt: string;
  updatedAt: string;
}

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

interface OrderFilters {
  search: string;
  status: OrderStatus | '';
  paymentStatus: PaymentStatus | '';
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_BADGES: Record<OrderStatus, { label: string }> = {
  PENDING: { label: 'Pending' },
  CONFIRMED: { label: 'Confirmed' },
  PROCESSING: { label: 'Processing' },
  SHIPPED: { label: 'Shipped' },
  DELIVERED: { label: 'Delivered' },
  CANCELLED: { label: 'Cancelled' },
  RETURNED: { label: 'Returned' },
};

const PAYMENT_BADGES: Record<PaymentStatus, { label: string }> = {
  PENDING: { label: 'Pending' },
  PAID: { label: 'Paid' },
  FAILED: { label: 'Failed' },
  REFUNDED: { label: 'Refunded' },
  PARTIALLY_REFUNDED: { label: 'Partial Refund' },
};

function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);

      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.status) {
        params.set('status', filters.status);
      }
      if (filters.paymentStatus) {
        params.set('paymentStatus', filters.paymentStatus);
      }
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo);
      }
      if (filters.minAmount) {
        params.set('minAmount', filters.minAmount);
      }
      if (filters.maxAmount) {
        params.set('maxAmount', filters.maxAmount);
      }

      const { data } = await apiClient.get(`/admin/orders?${params.toString()}`);
      const result = data.data ?? data;
      const rawOrders = result.orders ?? result.data ?? (Array.isArray(result) ? result : []);
      const mappedOrders = rawOrders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer ?? {
          name: o.user ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() : 'Unknown',
          email: o.user?.email ?? '',
          phone: o.user?.phone ?? '',
        },
        items: typeof o.items === 'number' ? o.items : (o._count?.items ?? o.items?.length ?? 0),
        totalAmount: o.totalAmount ?? o.total ?? 0,
        status: o.status,
        paymentStatus: o.paymentStatus ?? 'PENDING',
        paymentMethod: o.paymentMethod ?? '',
        shippingMethod: o.shippingMethod ?? '',
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
      setOrders(mappedOrders);
      const meta = result.meta ?? result;
      setPagination((prev) => ({
        ...prev,
        total: meta.total ?? 0,
        totalPages: meta.totalPages ?? 0,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(getApiErrorMessage(error, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrders(next);
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) {
        params.set('status', filters.status);
      }
      if (filters.paymentStatus) {
        params.set('paymentStatus', filters.paymentStatus);
      }
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo);
      }

      const { data } = await apiClient.get(`/admin/orders/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Orders exported');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to export orders'));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Bulk: export only the selected rows. Reuses the same export endpoint
  // by passing a comma-separated id list — when set, the server restricts
  // the CSV to those rows regardless of any other filter the page holds.
  const handleExportSelected = async () => {
    if (selectedOrders.size === 0) {
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('ids', Array.from(selectedOrders).join(','));
      const { data } = await apiClient.get(`/admin/orders/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-selected-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedOrders.size} order(s)`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to export selected orders'));
    }
  };

  // Bulk: apply a new status to every selected order. Status transitions
  // are server-validated so some rows may legitimately be rejected (e.g.
  // setting DELIVERED on a PENDING order) — report aggregate counts and
  // refresh the list so the UI reflects what actually changed.
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<OrderStatus>('CONFIRMED');
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);

  const handleBulkUpdateStatus = async () => {
    if (selectedOrders.size === 0) {
      return;
    }
    setBulkStatusBusy(true);
    const ids = Array.from(selectedOrders);
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.patch(`/admin/orders/${id}/status`, { status: bulkStatusValue })),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    setBulkStatusBusy(false);
    setBulkStatusOpen(false);
    if (succeeded > 0) {
      toast.success(
        `Updated ${succeeded} order(s) to ${bulkStatusValue}` +
          (failed > 0 ? ` (${failed} skipped — invalid transition)` : ''),
      );
    } else if (failed > 0) {
      toast.error(`No orders updated — ${failed} skipped (invalid status transition)`);
    }
    setSelectedOrders(new Set());
    fetchOrders();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      paymentStatus: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage and track all customer orders"
        actions={
          <button type="button" onClick={handleExportCSV} className="btn btn-secondary">
            <Download className="h-4 w-4" strokeWidth={2.5} />
            Export CSV
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-3 shadow-bento">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="group/search relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700"
              strokeWidth={2.5}
            />
            <input
              type="text"
              placeholder="Search by order number, customer name, email, or phone..."
              aria-label="Search orders"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="field-input border-transparent bg-gray-50 pl-11 shadow-none focus:bg-card"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select
              value={filters.status}
              aria-label="Filter by order status"
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as OrderStatus | '' }))
              }
              className="field-input border-transparent bg-gray-50 shadow-none sm:w-40"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_BADGES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <select
              value={filters.paymentStatus}
              aria-label="Filter by payment status"
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentStatus: e.target.value as PaymentStatus | '',
                }))
              }
              className="field-input border-transparent bg-gray-50 shadow-none sm:w-40"
            >
              <option value="">All Payments</option>
              {Object.entries(PAYMENT_BADGES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={`btn col-span-2 ${showFilters ? 'btn-primary' : 'btn-soft'}`}
            >
              <Filter className="h-4 w-4" strokeWidth={2.5} />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-4 border-t border-foreground/[0.04] px-1 pb-1 pt-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="field-label" htmlFor="orders-date-from">
                Date From
              </label>
              <input
                id="orders-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="orders-date-to">
                Date To
              </label>
              <input
                id="orders-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="orders-min-amount">
                Min Amount (৳)
              </label>
              <input
                id="orders-min-amount"
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                placeholder="0"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="orders-max-amount">
                Max Amount (৳)
              </label>
              <input
                id="orders-max-amount"
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                placeholder="999999"
                className="field-input"
              />
            </div>
            <div className="col-span-full flex justify-end">
              <button type="button" onClick={resetFilters} className="btn btn-ghost btn-sm">
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                Reset all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bento-card overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="bento-table min-w-[1040px]">
            <thead>
              <tr>
                <th className="w-10 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all orders"
                    checked={selectedOrders.size === orders.length && orders.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th className="text-center">Status</th>
                <th className="text-center">Payment</th>
                <th>Date</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <LoadingState label="Loading orders" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      bare
                      icon={ShoppingBag}
                      title="No orders found"
                      description="No orders found matching your filters."
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="group">
                    <td className="pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Select order ${order.orderNumber}`}
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td>
                      <a
                        href={`/admin/orders/${order.id}`}
                        className="whitespace-nowrap text-sm font-black text-gray-900 transition-colors hover:text-primary"
                      >
                        #{order.orderNumber}
                      </a>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-brand-50 text-xs font-black text-brand-700">
                          {(order.customer.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="max-w-[200px] truncate text-sm font-black leading-tight text-gray-900">
                            {order.customer.name}
                          </div>
                          <div className="max-w-[200px] truncate text-[11px] font-bold text-gray-400">
                            {order.customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="whitespace-nowrap rounded-xl bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-600">
                        {order.items} item{order.items !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right text-sm font-black tabular-nums tracking-tight text-gray-900">
                      {formatBDT(order.totalAmount)}
                    </td>
                    <td className="text-center">
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td className="text-center">
                      <PaymentStatusPill status={order.paymentStatus} />
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-BD', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="pr-4 text-right">
                      <a href={`/admin/orders/${order.id}`} className="btn btn-soft btn-sm">
                        View
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          noun="orders"
          onPageChange={handlePageChange}
        />
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-max -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-[1.75rem] bg-ink px-4 py-3 text-white shadow-2xl shadow-black/20 sm:bottom-6 sm:gap-3 sm:px-6">
          <span className="text-xs font-black uppercase tracking-widest text-white/70">
            {selectedOrders.size} selected
          </span>
          <button
            type="button"
            onClick={() => setBulkStatusOpen(true)}
            className="btn btn-primary btn-sm shadow-none"
          >
            Update Status
          </button>
          <button
            type="button"
            onClick={handleExportSelected}
            className="btn btn-sm bg-emerald-500 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Export Selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedOrders(new Set())}
            className="btn btn-sm bg-white/10 text-white hover:bg-white/20"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk status modal */}
      {bulkStatusOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => !bulkStatusBusy && setBulkStatusOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-transparent"
          />
          <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-card p-6 shadow-2xl sm:p-8">
            <h3 className="text-xl font-black tracking-tight text-gray-900">
              Update status for {selectedOrders.size} order(s)
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Orders that can&apos;t legally transition to the new status will be skipped.
            </p>
            <label className="field-label mt-5" htmlFor="bulk-status">
              New status
            </label>
            <select
              id="bulk-status"
              value={bulkStatusValue}
              onChange={(e) => setBulkStatusValue(e.target.value as OrderStatus)}
              disabled={bulkStatusBusy}
              className="field-input"
            >
              {Object.entries(STATUS_BADGES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkStatusOpen(false)}
                disabled={bulkStatusBusy}
                className="btn btn-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUpdateStatus}
                disabled={bulkStatusBusy}
                className="btn btn-primary"
              >
                {bulkStatusBusy ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
