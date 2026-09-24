'use client';

import React, { useState, useCallback } from 'react';

import { apiClient, ApiClientError } from '@/lib/api/client';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

interface StatusUpdateDialogProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (newStatus: OrderStatus) => void;
}

interface StatusOption {
  value: OrderStatus;
  label: string;
  description: string;
  icon: string;
  requiresTracking: boolean;
  requiresConfirmation: boolean;
  confirmMessage?: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Order has been placed but not yet confirmed',
    icon: '🕐',
    requiresTracking: false,
    requiresConfirmation: false,
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
    description: 'Order has been confirmed and is awaiting processing',
    icon: '✅',
    requiresTracking: false,
    requiresConfirmation: false,
  },
  {
    value: 'processing',
    label: 'Processing',
    description: 'Order is being prepared for shipment',
    icon: '⚙️',
    requiresTracking: false,
    requiresConfirmation: false,
  },
  {
    value: 'shipped',
    label: 'Shipped',
    description: 'Order has been shipped to the customer',
    icon: '🚚',
    requiresTracking: true,
    requiresConfirmation: false,
  },
  {
    value: 'delivered',
    label: 'Delivered',
    description: 'Order has been delivered to the customer',
    icon: '📦',
    requiresTracking: false,
    requiresConfirmation: true,
    confirmMessage: 'Are you sure this order has been delivered? This will finalize the order.',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    description: 'Order has been cancelled',
    icon: '❌',
    requiresTracking: false,
    requiresConfirmation: true,
    confirmMessage: 'Are you sure you want to cancel this order? This action may trigger a refund.',
  },
  {
    value: 'returned',
    label: 'Returned',
    description: 'Order has been returned by the customer',
    icon: '↩️',
    requiresTracking: false,
    requiresConfirmation: true,
    confirmMessage:
      'Are you sure you want to mark this order as returned? This will initiate the return process.',
  },
];

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export default function StatusUpdateDialog({
  orderId,
  orderNumber,
  currentStatus,
  isOpen,
  onClose,
  onStatusUpdated,
}: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingProvider, setTrackingProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allowedStatuses = STATUS_FLOW[currentStatus] || [];
  const availableOptions = STATUS_OPTIONS.filter((opt) => allowedStatuses.includes(opt.value));
  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === selectedStatus);

  const resetForm = useCallback(() => {
    setSelectedStatus('');
    setTrackingNumber('');
    setTrackingProvider('');
    setNotes('');
    setNotifyCustomer(true);
    setShowConfirmation(false);
    setError('');
    setSubmitting(false);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmitClick = () => {
    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }

    if (selectedOption?.requiresTracking && !trackingNumber.trim()) {
      setError('Tracking number is required for shipped orders');
      return;
    }

    if (selectedOption?.requiresConfirmation) {
      setShowConfirmation(true);
      return;
    }

    handleConfirmUpdate();
  };

  const handleConfirmUpdate = async () => {
    if (!selectedStatus) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Backend expects ORDER_STATUS uppercase enum (PENDING, CONFIRMED, ...);
      // local UI uses lowercase. Normalize on the wire. Tracking info is
      // folded into the optional note (no separate columns yet).
      const noteParts = [
        notes.trim(),
        trackingProvider.trim() && `Carrier: ${trackingProvider.trim()}`,
        trackingNumber.trim() && `Tracking #: ${trackingNumber.trim()}`,
      ].filter(Boolean);

      await apiClient.patch(`/admin/orders/${orderId}/status`, {
        status: selectedStatus.toUpperCase(),
        notifyCustomer,
        ...(noteParts.length ? { note: noteParts.join(' — ') } : {}),
      });

      onStatusUpdated(selectedStatus);
      handleClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to update status');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/[0.04] px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900">Update Order Status</h2>
            <p className="eyebrow mt-1">Order #{orderNumber}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="btn-icon h-10 w-10 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {showConfirmation ? (
          /* Confirmation View */
          <div className="px-6 py-6 sm:px-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                <svg
                  className="h-6 w-6 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-black tracking-tight text-gray-900">
                Confirm Status Change
              </h3>
              <p className="mb-6 text-sm font-medium text-gray-500">
                {selectedOption?.confirmMessage}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="btn btn-soft"
                disabled={submitting}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={submitting}
                className="btn btn-danger"
              >
                {submitting ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <div className="space-y-5 px-6 py-5 sm:px-8">
            {/* Current Status */}
            <div>
              <span className="field-label">Current Status</span>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-black capitalize text-gray-700">
                {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.icon}{' '}
                {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label}
              </div>
            </div>

            {/* New Status Selection */}
            <div>
              <span className="field-label">New Status</span>
              {availableOptions.length === 0 ? (
                <p className="rounded-[1.25rem] bg-gray-50 p-4 text-sm font-bold text-gray-400">
                  No status transitions available from the current status.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border-2 p-4 transition-all ${
                        selectedStatus === option.value
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-foreground/[0.04] bg-gray-50/60 hover:border-gray-200 hover:bg-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={selectedStatus === option.value}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value as OrderStatus);
                          setError('');
                        }}
                        className="mt-0.5 h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="text-sm font-black text-gray-900">
                          {option.icon} {option.label}
                        </span>
                        <p className="mt-0.5 text-xs font-medium text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Tracking Number (for shipped status) */}
            {selectedOption?.requiresTracking && (
              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor="status-tracking-number">
                    Tracking Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="status-tracking-number"
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="status-tracking-provider">
                    Shipping Provider
                  </label>
                  <select
                    id="status-tracking-provider"
                    value={trackingProvider}
                    onChange={(e) => setTrackingProvider(e.target.value)}
                    className="field-input"
                  >
                    <option value="">Select provider</option>
                    <option value="pathao">Pathao Courier</option>
                    <option value="steadfast">Steadfast Courier</option>
                    <option value="redx">RedX</option>
                    <option value="paperfly">Paperfly</option>
                    <option value="sundarban">Sundarban Courier</option>
                    <option value="sa-paribahan">SA Paribahan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="field-label" htmlFor="status-notes">
                Notes (optional)
              </label>
              <textarea
                id="status-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note about this status change..."
                rows={3}
                className="field-input resize-none rounded-[1.25rem]"
              />
            </div>

            {/* Notify Customer */}
            <label className="flex cursor-pointer items-center gap-3 rounded-[1.25rem] bg-gray-50 px-4 py-3">
              <input
                type="checkbox"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-bold text-gray-700">
                Notify customer via email and SMS
              </span>
            </label>

            {/* Error */}
            {error && (
              <div
                className="rounded-[1.25rem] bg-rose-50 p-4 text-sm font-bold text-rose-600"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-foreground/[0.04] pt-5">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-soft"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={!selectedStatus || submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
