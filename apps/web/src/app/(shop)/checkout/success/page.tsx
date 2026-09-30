'use client';

import { Check, Home, MailCheck, PackageCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Breadcrumbs } from '@/components/ui/bento';

// ──────────────────────────────────────────────────────────
// Confetti Animation (CSS-only)
// ──────────────────────────────────────────────────────────

/**
 * CSS-based confetti animation.
 *
 * Creates falling colorful dots using pure CSS keyframes.
 * No external dependencies required.
 */
function Confetti() {
  const colors = ['#f9706a', '#fca6a1', '#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#1a1a1a'];
  // Random geometry is generated after mount so the server and client
  // markup match (Math.random during render caused a hydration mismatch).
  const [pieces, setPieces] = useState<
    Array<{ left: number; delay: number; duration: number; size: number }>
  >([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: 50 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
        size: 6 + Math.random() * 6,
      })),
    );
  }, []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map(({ left, delay, duration, size }, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      ))}

      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 50;
        }

        .confetti-piece {
          position: absolute;
          top: -10px;
          border-radius: 50%;
          opacity: 0;
          animation: confetti-fall linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Success Page
// ──────────────────────────────────────────────────────────

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const [showConfetti, setShowConfetti] = useState(true);

  // Hide confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      icon: MailCheck,
      title: 'Order Confirmation',
      text: 'You will receive an email confirmation with your order details shortly.',
    },
    {
      icon: PackageCheck,
      title: 'Processing',
      text: 'Our team will verify and start preparing your order within 24 hours.',
    },
    {
      icon: Truck,
      title: 'Shipping',
      text: 'Once shipped, you will receive a tracking update via SMS and email.',
    },
    {
      icon: Home,
      title: 'Delivery',
      text: 'Your order will be delivered to your specified address.',
    },
  ];

  return (
    <>
      {showConfetti && <Confetti />}

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Order Confirmed' }]} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Hero panel */}
          <div className="flex flex-col items-center border border-gray-200 bg-card p-8 text-center sm:p-10">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 text-emerald-500">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </div>

            <p className="mb-2 text-sm font-medium text-emerald-600">
              Payment received · Order confirmed
            </p>
            <h1 className="page-title mb-3 sm:text-3xl">Order Placed Successfully!</h1>

            <p className="page-subtitle max-w-md">
              Thank you for your order. We&apos;re getting it ready for you.
            </p>

            {/* Order number */}
            {orderNumber && (
              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 border border-gray-200 bg-gray-50 px-6 py-4">
                <span className="text-sm text-gray-500">Order Number</span>
                <span className="font-mono text-lg font-bold text-primary">{orderNumber}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              {orderNumber && (
                <Link
                  href={`/account/orders/${orderNumber}`}
                  className="btn btn-primary btn-lg w-full sm:w-auto"
                >
                  Track Your Order
                </Link>
              )}

              <Link href="/" className="btn btn-outline btn-lg w-full sm:w-auto">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* What happens next */}
          <div className="border border-gray-200 bg-card p-6 sm:p-8">
            <h2 className="shop-heading">What happens next?</h2>
            <p className="mb-6 mt-3 text-sm text-gray-500">Your order journey</p>

            <ol className="grid grid-cols-1 border-t border-gray-200 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="flex flex-col gap-3 border-b border-gray-200 py-5 sm:px-4 lg:border-b-0 lg:border-r lg:last:border-r-0"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                      <span className="font-heading text-xl font-semibold tabular-nums text-gray-300">
                        0{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-heading text-sm font-semibold text-primary">
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-gray-500">
            Have a question about your order?{' '}
            <a href="/contact" className="font-medium text-primary hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
