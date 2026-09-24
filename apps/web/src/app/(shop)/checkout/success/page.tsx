'use client';

import { Check, Home, MailCheck, PackageCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { IconTile } from '@/components/ui/bento';

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
  const colors = ['#f46e54', '#fd9a80', '#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#1a1a1a'];
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
      tone: 'brand' as const,
      title: 'Order Confirmation',
      text: 'You will receive an email confirmation with your order details shortly.',
    },
    {
      icon: PackageCheck,
      tone: 'blue' as const,
      title: 'Processing',
      text: 'Our team will verify and start preparing your order within 24 hours.',
    },
    {
      icon: Truck,
      tone: 'purple' as const,
      title: 'Shipping',
      text: 'Once shipped, you will receive a tracking update via SMS and email.',
    },
    {
      icon: Home,
      tone: 'emerald' as const,
      title: 'Delivery',
      text: 'Your order will be delivered to your specified address.',
    },
  ];

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-6">
          {/* Hero tile */}
          <div className="bento-card flex flex-col items-center p-8 text-center sm:p-10 md:col-span-6">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-500">
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>

            <p className="eyebrow mb-2 text-emerald-600">Payment received · Order confirmed</p>
            <h1 className="page-title mb-3 sm:text-4xl">Order Placed Successfully!</h1>

            <p className="page-subtitle max-w-md">
              Thank you for your order. We&apos;re getting it ready for you.
            </p>

            {/* Order number */}
            {orderNumber && (
              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-[1.25rem] border border-primary/10 bg-primary/5 px-6 py-4">
                <span className="eyebrow text-brand-700">Order Number</span>
                <span className="font-mono text-lg font-black text-brand-700">{orderNumber}</span>
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

              <Link href="/" className="btn btn-secondary btn-lg w-full sm:w-auto">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* What happens next */}
          <div className="bento-card p-6 sm:p-8 md:col-span-6">
            <h2 className="section-title">What happens next?</h2>
            <p className="eyebrow mb-6 mt-1">Your order journey</p>

            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="bento-tile flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <IconTile icon={step.icon} tone={step.tone} size="sm" />
                    <span className="text-2xl font-black tabular-nums tracking-tighter text-gray-200">
                      0{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{step.title}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-8 text-center text-xs font-bold text-gray-400">
          Have a question about your order?{' '}
          <a href="/contact" className="font-black text-brand-700 hover:underline">
            Contact our support team
          </a>
        </p>
      </div>
    </>
  );
}
