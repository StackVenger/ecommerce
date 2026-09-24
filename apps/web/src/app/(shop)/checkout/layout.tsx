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
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <header className="site-container px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3 rounded-[1.5rem] border border-foreground/[0.04] bg-card px-4 shadow-bento sm:h-16 sm:px-6">
          <a href="/" className="truncate text-lg font-black tracking-tighter text-gray-900">
            {siteName}
          </a>

          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
