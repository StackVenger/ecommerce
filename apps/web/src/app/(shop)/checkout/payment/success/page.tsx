'use client';

import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { PaymentRecord } from '@/lib/api/payment';

import { Breadcrumbs, LoadingState } from '@/components/ui/bento';
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
    <>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Payment Successful' }]} />
      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-md border border-gray-200 bg-card p-6 text-center sm:p-10">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center text-emerald-500">
            <CheckCircle className="h-14 w-14" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <p className="mb-2 text-sm font-medium text-emerald-600">Transaction complete</p>
          <h1 className="page-title mb-2">Payment Successful!</h1>
          <p className="page-subtitle mb-6">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>

          {/* Payment Details */}
          {payment && (
            <div className="mb-6 bg-gray-50 p-5 text-left">
              <h3 className="mb-3 font-heading text-sm font-semibold text-gray-900">
                Payment Details
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {orderId?.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold tabular-nums text-primary">
                    {formatBDT(payment.amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="font-semibold text-gray-900">{payment.method}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="pill pill-success">{payment.status}</span>
                </div>
              </div>
            </div>
          )}

          {sessionId && !payment && (
            <div className="mb-6 bg-gray-50 p-4">
              <p className="break-all text-sm text-gray-600">
                Session ID: <span className="font-mono">{sessionId.slice(0, 20)}...</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {orderId && (
              <Link href={`/account/orders/${orderId}`} className="btn btn-primary btn-lg w-full">
                <Package className="h-5 w-5" strokeWidth={1.75} />
                Track Your Order
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link href="/" className="btn btn-outline btn-lg w-full">
              <Home className="h-5 w-5" strokeWidth={1.75} />
              Continue Shopping
            </Link>
          </div>

          {/* Confirmation Note */}
          <p className="mt-6 text-xs text-gray-500">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </div>
    </>
  );
}
