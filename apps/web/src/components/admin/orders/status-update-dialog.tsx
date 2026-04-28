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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Update Order Status</h2>
            <p className="text-sm text-gray-500">Order #{orderNumber}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
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
          <div className="px-6 py-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Status Change</h3>
              <p className="text-sm text-gray-600 mb-6">{selectedOption?.confirmMessage}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmUpdate}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <div className="px-6 py-4 space-y-5">
            {/* Current Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
              <div className="text-sm text-gray-600 capitalize font-medium">
                {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.icon}{' '}
                {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label}
              </div>
            </div>

            {/* New Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
              {availableOptions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No status transitions available from the current status.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedStatus === option.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {option.icon} {option.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Provider
                  </label>
                  <select
                    value={trackingProvider}
                    onChange={(e) => setTrackingProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note about this status change..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>

            {/* Notify Customer */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Notify customer via email and SMS</span>
            </label>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={!selectedStatus || submitting}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
