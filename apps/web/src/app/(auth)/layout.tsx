import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { getSiteConfig } from '@/lib/config/site-config';

// ──────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteConfig();
  return {
    title: {
      default: 'Account',
      template: `%s | ${settings.general.site_name}`,
    },
  };
}

// ──────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const { settings } = await getSiteConfig();
  const siteName = settings.general.site_name;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top bar: logo + theme toggle ─────────────────── */}
      <header className="border-b border-gray-200 bg-card">
        <div className="site-container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center bg-primary text-white">
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="font-heading text-lg font-semibold text-gray-900">{siteName}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Centred form panel ───────────────────────────── */}
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-[34rem] bg-gray-100 px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-5 text-center text-[13px] text-gray-500">
        &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
      </footer>
    </div>
  );
}
