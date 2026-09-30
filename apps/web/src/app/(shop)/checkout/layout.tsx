import { Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      {/* Secure-checkout strip */}
      <header className="border-b border-gray-200 bg-gray-50">
        <div className="site-container flex h-12 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/" className="truncate font-heading text-base font-semibold text-gray-900">
            {siteName}
          </a>

          <div className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-emerald-600">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
