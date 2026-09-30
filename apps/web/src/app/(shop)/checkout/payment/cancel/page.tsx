'use client';

import { XCircle, ArrowLeft, ShoppingCart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/bento';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Payment Cancelled' }]} />
      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-md border border-gray-200 bg-card p-6 text-center sm:p-10">
          {/* Cancel Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center text-rose-500">
            <XCircle className="h-14 w-14" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <p className="mb-2 text-sm font-medium text-rose-500">No charge made</p>
          <h1 className="page-title mb-2">Payment Cancelled</h1>
          <p className="page-subtitle mb-6">
            Your payment was not completed. Don&apos;t worry — no charges were made to your account.
          </p>

          {/* Order Info */}
          {orderId && (
            <div className="mb-6 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Order ID:{' '}
                <span className="font-mono font-semibold text-gray-900">
                  {orderId.slice(0, 8)}...
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Your order has been saved. You can complete the payment anytime.
              </p>
            </div>
          )}

          {/* Reasons Section */}
          <div className="mb-6 border border-amber-200 bg-amber-50 p-5 text-left">
            <h3 className="mb-2 text-sm font-semibold text-amber-800">
              Common reasons for cancellation:
            </h3>
            <ul className="list-inside list-disc space-y-1 text-[13px] text-amber-700">
              <li>Changed your mind about the purchase</li>
              <li>Want to modify your order first</li>
              <li>Payment method issue — try a different card</li>
              <li>Accidental navigation away from checkout</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {orderId && (
              <Link href="/checkout" className="btn btn-primary btn-lg w-full">
                <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
                Return to Checkout
              </Link>
            )}

            <Link href="/cart" className="btn btn-outline btn-lg w-full">
              <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />
              View Cart
            </Link>

            <Link href="/contact" className="btn btn-ghost w-full">
              <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
              Need help? Contact support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
