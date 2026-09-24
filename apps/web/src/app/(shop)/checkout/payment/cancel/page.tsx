'use client';

import { XCircle, ArrowLeft, ShoppingCart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bento-card w-full max-w-md p-6 text-center sm:p-10">
        {/* Cancel Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-rose-50 text-rose-500">
          <XCircle className="h-10 w-10" strokeWidth={2.25} />
        </div>

        {/* Title */}
        <p className="eyebrow mb-2 text-rose-500">No charge made</p>
        <h1 className="page-title mb-2">Payment Cancelled</h1>
        <p className="page-subtitle mb-6">
          Your payment was not completed. Don&apos;t worry — no charges were made to your account.
        </p>

        {/* Order Info */}
        {orderId && (
          <div className="bento-tile mb-6 p-4">
            <p className="text-sm font-bold text-gray-600">
              Order ID:{' '}
              <span className="font-mono font-black text-gray-900">{orderId.slice(0, 8)}...</span>
            </p>
            <p className="mt-1 text-xs font-bold text-gray-400">
              Your order has been saved. You can complete the payment anytime.
            </p>
          </div>
        )}

        {/* Reasons Section */}
        <div className="mb-6 rounded-[1.5rem] bg-amber-50 p-5 text-left">
          <h3 className="mb-2 text-sm font-black text-amber-800">
            Common reasons for cancellation:
          </h3>
          <ul className="list-inside list-disc space-y-1 text-xs font-bold text-amber-700">
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

          <Link href="/cart" className="btn btn-soft btn-lg w-full">
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
  );
}
