'use client';

import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { PaymentRecord } from '@/lib/api/payment';

import { LoadingState } from '@/components/ui/bento';
import { getPaymentByOrder, formatBDT } from '@/lib/api/payment';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      getPaymentByOrder(orderId)
        .then(setPayment)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState label="Confirming payment…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bento-card w-full max-w-md p-6 text-center sm:p-10">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-500">
          <CheckCircle className="h-10 w-10" strokeWidth={2.25} />
        </div>

        {/* Title */}
        <p className="eyebrow mb-2 text-emerald-600">Transaction complete</p>
        <h1 className="page-title mb-2">Payment Successful!</h1>
        <p className="page-subtitle mb-6">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        {/* Payment Details */}
        {payment && (
          <div className="bento-tile mb-6 p-5 text-left">
            <h3 className="eyebrow mb-3">Payment Details</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-gray-500">Order ID</span>
                <span className="font-mono font-bold text-gray-900">{orderId?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-gray-500">Amount</span>
                <span className="font-black tabular-nums text-gray-900">
                  {formatBDT(payment.amount)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-gray-500">Method</span>
                <span className="font-black text-gray-900">{payment.method}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-gray-500">Status</span>
                <span className="pill pill-success">{payment.status}</span>
              </div>
            </div>
          </div>
        )}

        {sessionId && !payment && (
          <div className="bento-tile mb-6 p-4">
            <p className="break-all text-sm font-bold text-gray-600">
              Session ID: <span className="font-mono">{sessionId.slice(0, 20)}...</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {orderId && (
            <Link href={`/account/orders/${orderId}`} className="btn btn-primary btn-lg w-full">
              <Package className="h-5 w-5" strokeWidth={2.25} />
              Track Your Order
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link href="/" className="btn btn-soft btn-lg w-full">
            <Home className="h-5 w-5" strokeWidth={2.25} />
            Continue Shopping
          </Link>
        </div>

        {/* Confirmation Note */}
        <p className="mt-6 text-xs font-bold text-gray-400">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
}
