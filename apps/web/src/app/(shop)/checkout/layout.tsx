import type { Metadata } from 'next';

import { getSiteConfig } from '@/lib/config/site-config';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order — secure checkout with multiple payment options.',
};

/**
 * Checkout layout.
 *
 * Provides a clean, distraction-free layout for the checkout flow.
 * Removes the standard shop navigation to keep focus on completing the order.
 */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getSiteConfig();
  const siteName = settings.general.site_name;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="site-container px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="text-xl font-bold text-gray-900">
              {siteName}
            </a>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
