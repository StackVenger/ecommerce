'use client';

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Ticket,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { formatBDT } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number;
  usageCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function getCouponStatus(coupon: Coupon): { label: string; color: string } {
  if (!coupon.isActive) {
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-600' };
  }
  if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
    return { label: 'Expired', color: 'bg-red-100 text-red-700' };
  }
  if (new Date(coupon.startDate) > new Date()) {
    return { label: 'Scheduled', color: 'bg-teal-100 text-teal-700' };
  }
  return { label: 'Active', color: 'bg-green-100 text-green-700' };
}

function formatDiscountValue(coupon: Coupon): string {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}%`;
  }
  return formatBDT(coupon.discountValue);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ──────────────────────────────────────────────────────────
// Copy Code Button
// ──────────────────────────────────────────────────────────

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Coupon Form Dialog
// ──────────────────────────────────────────────────────────

interface CouponFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCoupon?: Coupon | null;
}

function CouponFormDialog({ isOpen, onClose, onSuccess, editCoupon }: CouponFormDialogProps) {
  const isEditing = !!editCoupon;

  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    minimumOrderAmount: null,
    maximumDiscount: null,
    usageLimit: null,
    usageLimitPerUser: 1,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    endDate: '',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && editCoupon) {
      setFormData({
        code: editCoupon.code,
        description: editCoupon.description ?? '',
        discountType: editCoupon.discountType,
        discountValue: editCoupon.discountValue,
        minimumOrderAmount: editCoupon.minimumOrderAmount,
        maximumDiscount: editCoupon.maximumDiscount,
        usageLimit: editCoupon.usageLimit,
        usageLimitPerUser: editCoupon.usageLimitPerUser,
        startDate: editCoupon.startDate.split('T')[0] ?? '',
        endDate: editCoupon.endDate?.split('T')[0] ?? '',
        isActive: editCoupon.isActive,
      });
    } else if (isOpen) {
      setFormData({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        minimumOrderAmount: null,
        maximumDiscount: null,
        usageLimit: null,
        usageLimitPerUser: 1,
        startDate: new Date().toISOString().split('T')[0] ?? '',
        endDate: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [isOpen, editCoupon]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    }
    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount must be greater than 0';
    }
    if (formData.discountType === 'PERCENTAGE' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentage cannot exceed 100%';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        endDate: formData.endDate || undefined,
        minimumOrderAmount: formData.minimumOrderAmount ?? undefined,
        maximumDiscount: formData.maximumDiscount ?? undefined,
        usageLimit: formData.usageLimit ?? undefined,
      };

      if (isEditing) {
        await apiClient.patch(`/admin/coupons/${editCoupon.id}`, payload);
      } else {
        await apiClient.post('/admin/coupons', payload);
      }

      toast.success(isEditing ? 'Coupon updated' : 'Coupon created');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save coupon'));
      console.error('Failed to save coupon:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Ticket className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Coupon' : 'Create Coupon'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Coupon Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g., SAVE20"
                className={cn(
                  'flex-1 rounded-lg border px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-1',
                  errors.code
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-teal-500',
                )}
              />
              <button
                onClick={generateCode}
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Generate
              </button>
            </div>
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., 20% off on all electronics"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT',
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (৳)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-lg border border-gray-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  {formData.discountType === 'PERCENTAGE' ? '%' : '৳'}
                </span>
                <input
                  type="number"
                  min="0"
                  max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                  value={formData.discountValue || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discountValue: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 rounded-r-lg px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              {errors.discountValue && (
                <p className="mt-1 text-sm text-red-600">{errors.discountValue}</p>
              )}
            </div>
          </div>

          {/* Min order & Max discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Min. Order (৳)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimumOrderAmount ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minimumOrderAmount: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="No minimum"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {formData.discountType === 'PERCENTAGE' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max Discount (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maximumDiscount ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maximumDiscount: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="No cap"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Total Usage Limit
              </label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usageLimit: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Per User Limit
              </label>
              <input
                type="number"
                min="1"
                value={formData.usageLimitPerUser}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usageLimitPerUser: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Admin Coupon Management Page
// ──────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [page, setPage] = useState(1);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const { data } = await apiClient.get(`/admin/coupons?${params.toString()}`);
      setCoupons(data.data ?? data ?? []);
      setMeta(data.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this coupon?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/coupons/${id}`);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete coupon'));
      console.error('Failed to delete coupon:', err);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await apiClient.patch(`/admin/coupons/${coupon.id}`, {
        isActive: !coupon.isActive,
      });
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
      fetchCoupons();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to toggle coupon'));
      console.error('Failed to toggle coupon:', err);
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">Manage discount coupons — all amounts in BDT (৳)</p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setShowDialog(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Conditions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-8 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Ticket className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No coupons found. Create your first coupon.
                    </p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-900">
                            {coupon.code}
                          </code>
                          <CopyCodeButton code={coupon.code} />
                        </div>
                        {coupon.description && (
                          <p className="mt-0.5 text-xs text-gray-500">{coupon.description}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDiscountValue(coupon)}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          {coupon.discountType === 'PERCENTAGE' ? 'off' : 'flat'}
                        </span>
                        {coupon.maximumDiscount && (
                          <p className="text-xs text-gray-500">
                            Max: {formatBDT(coupon.maximumDiscount)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-600">
                        {coupon.minimumOrderAmount ? (
                          <span>Min. order: {formatBDT(coupon.minimumOrderAmount)}</span>
                        ) : (
                          <span className="text-gray-400">No minimum</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-600">
                        <span>
                          {coupon.usageCount ?? 0}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                        </span>
                        <p className="text-xs text-gray-400">{coupon.usageLimitPerUser} per user</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-xs text-gray-600">
                        <p>{formatDate(coupon.startDate)}</p>
                        {coupon.endDate && (
                          <p className="text-gray-400">to {formatDate(coupon.endDate)}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            status.color,
                          )}
                        >
                          {status.label}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-600">
              {meta.total} coupon{meta.total !== 1 ? 's' : ''} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coupon Form Dialog */}
      <CouponFormDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingCoupon(null);
        }}
        onSuccess={fetchCoupons}
        editCoupon={editingCoupon}
      />
    </div>
  );
}
