'use client';

import { Ban, Layers, RotateCcw, Search, Undo2, type LucideIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { OrderStatusPill, PaymentStatusPill } from '@/components/admin/orders/order-status';
import {
  EmptyState,
  LoadingState,
  PageHeader,
  TONE_CLASSES,
  type BentoTone,
} from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

type ReturnStatus = 'RETURNED' | 'CANCELLED' | 'REFUNDED';

interface ReturnOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: number;
  totalAmount: number;
  status: ReturnStatus;
  paymentStatus: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminReturnsPage() {
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | ''>('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch returned, cancelled, and refunded orders using existing admin orders endpoint
      const statuses: ReturnStatus[] = statusFilter
        ? [statusFilter]
        : ['RETURNED', 'CANCELLED', 'REFUNDED'];

      const allOrders: ReturnOrder[] = [];
      let totalCount = 0;

      // If filtering by single status, use one call; otherwise fetch all three
      if (statusFilter) {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          status: statusFilter,
        });
        const { data } = await apiClient.get(`/admin/orders?${params.toString()}`);
        const result = data.data ?? data;
        const rawOrders = result.orders ?? result.data ?? (Array.isArray(result) ? result : []);
        allOrders.push(...rawOrders.map(mapOrder));
        totalCount = result.total ?? result.meta?.total ?? 0;
      } else {
        // Fetch all return-type statuses in parallel
        const results = await Promise.all(
          statuses.map((s) =>
            apiClient
              .get(`/admin/orders?page=1&limit=100&status=${s}`)
              .then(({ data }) => {
                const result = data.data ?? data;
                return (result.orders ?? result.data ?? (Array.isArray(result) ? result : [])).map(
                  mapOrder,
                );
              })
              .catch(() => [] as ReturnOrder[]),
          ),
        );
        for (const batch of results) {
          allOrders.push(...batch);
        }
        // Sort by most recent first
        allOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        totalCount = allOrders.length;
      }

      // Client-side search filter
      const filtered = search
        ? allOrders.filter(
            (o) =>
              o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
              o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
              o.customer.email.toLowerCase().includes(search.toLowerCase()),
          )
        : allOrders;

      setOrders(filtered);
      setPagination((prev) => ({
        ...prev,
        total: search ? filtered.length : totalCount,
        totalPages: Math.ceil((search ? filtered.length : totalCount) / prev.limit),
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error(getApiErrorMessage(error, 'Failed to load returns'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, search]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  function mapOrder(o: any): ReturnOrder {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.customer ?? {
        name: o.user ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() : 'Unknown',
        email: o.user?.email ?? '',
        phone: o.user?.phone ?? '',
      },
      items: typeof o.items === 'number' ? o.items : (o._count?.items ?? o.items?.length ?? 0),
      totalAmount: o.totalAmount ?? 0,
      status: o.status,
      paymentStatus: o.paymentStatus ?? 'PENDING',
      paymentMethod: o.paymentMethod ?? '',
      notes: o.notes || o.cancellationReason || null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  const counts = {
    all: orders.length,
    RETURNED: orders.filter((o) => o.status === 'RETURNED').length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
    REFUNDED: orders.filter((o) => o.status === 'REFUNDED').length,
  };

  return (
    <div>
      <PageHeader
        title="Returns & Cancellations"
        description="Manage returned, cancelled, and refunded orders"
      />

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <SummaryCard
          label="Total"
          count={counts.all}
          icon={Layers}
          tone="gray"
          active={statusFilter === ''}
          onClick={() => setStatusFilter('')}
        />
        <SummaryCard
          label="Returned"
          count={counts.RETURNED}
          icon={RotateCcw}
          tone="orange"
          active={statusFilter === 'RETURNED'}
          onClick={() => setStatusFilter('RETURNED')}
        />
        <SummaryCard
          label="Cancelled"
          count={counts.CANCELLED}
          icon={Ban}
          tone="rose"
          active={statusFilter === 'CANCELLED'}
          onClick={() => setStatusFilter('CANCELLED')}
        />
        <SummaryCard
          label="Refunded"
          count={counts.REFUNDED}
          icon={Undo2}
          tone="purple"
          active={statusFilter === 'REFUNDED'}
          onClick={() => setStatusFilter('REFUNDED')}
        />
      </div>

      {/* Search */}
      <div className="mb-6 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-3 shadow-bento">
        <div className="group/search relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700"
            strokeWidth={2.5}
          />
          <input
            type="text"
            placeholder="Search by order number, customer name, or email..."
            aria-label="Search returns"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input border-transparent bg-gray-50 pl-11 shadow-none focus:bg-card"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bento-card overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="bento-table min-w-[1040px]">
            <thead>
              <tr>
                <th className="pl-4">Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Status</th>
                <th className="text-center">Payment</th>
                <th>Reason / Notes</th>
                <th>Date</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <LoadingState label="Loading returns" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      bare
                      icon={RotateCcw}
                      title="Nothing here"
                      description="No returns or cancellations found."
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="group">
                    <td className="pl-4">
                      <a
                        href={`/admin/orders/${order.id}`}
                        className="whitespace-nowrap text-sm font-black text-gray-900 transition-colors hover:text-primary"
                      >
                        #{order.orderNumber}
                      </a>
                    </td>
                    <td>
                      <div className="max-w-[200px] truncate text-sm font-black leading-tight text-gray-900">
                        {order.customer.name}
                      </div>
                      <div className="max-w-[200px] truncate text-[11px] font-bold text-gray-400">
                        {order.customer.email}
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
                    <td>
                      <p
                        className="max-w-[200px] truncate text-sm font-medium text-gray-600"
                        title={order.notes ?? ''}
                      >
                        {order.notes || (
                          <span className="text-xs font-bold text-gray-300">No notes</span>
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-gray-500">
                      {new Date(order.updatedAt).toLocaleDateString('en-BD', {
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
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  tone: BentoTone;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex items-center gap-4 rounded-[2rem] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
        active
          ? 'border-transparent bg-ink text-white shadow-xl shadow-black/10'
          : 'border-foreground/[0.04] bg-card shadow-bento hover:shadow-bento-hover',
      )}
    >
      <div
        className={cn(
          'icon-tile h-12 w-12 group-hover:scale-110',
          active ? 'bg-white/10 text-white' : TONE_CLASSES[tone],
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div>
        <p
          className={cn(
            'text-2xl font-black tabular-nums tracking-tighter',
            !active && 'text-gray-900',
          )}
        >
          {count}
        </p>
        <p
          className={cn(
            'text-[10px] font-black uppercase tracking-widest',
            active ? 'text-white/50' : 'text-gray-500',
          )}
        >
          {label}
        </p>
      </div>
    </button>
  );
}
