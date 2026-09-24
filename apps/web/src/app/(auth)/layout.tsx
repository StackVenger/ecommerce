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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:grid lg:grid-cols-2 lg:gap-4">
      {/* ── Left panel: ink bento brand tile (hidden on mobile) ── */}
      <aside className="bento-dark relative hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        <div className="bento-glow -right-16 -top-16 h-80 w-80 bg-primary/30" aria-hidden="true" />
        <div
          className="bento-glow -bottom-16 -left-16 h-64 w-64 bg-blue-500/10"
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-brand-glow">
              <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black tracking-tight text-white">{siteName}</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <p className="eyebrow text-white/40">Your store, your pulse</p>
            <h2 className="mt-3 max-w-md text-4xl font-black leading-[1.05] tracking-tighter text-white xl:text-5xl">
              Shop smarter. Checkout faster.
            </h2>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '50K+', label: 'Happy customers' },
              { value: '4.9', label: 'Average rating' },
              { value: '24h', label: 'Fast delivery' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.5rem] border border-white/5 bg-white/[0.06] p-4 backdrop-blur-md xl:p-5"
              >
                <p className="text-2xl font-black tabular-nums tracking-tighter text-white xl:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <blockquote className="rounded-[2rem] bg-primary p-6 shadow-brand-glow xl:p-7">
            <p className="text-base font-bold leading-relaxed text-white">
              &ldquo;This platform has completely transformed how I shop online. The selection is
              incredible, the prices are unbeatable, and delivery is always lightning fast. I
              can&apos;t imagine going back to any other store.&rdquo;
            </p>
            <footer className="mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white backdrop-blur-md">
                SK
              </div>
              <div>
                <p className="text-sm font-black text-white">Sarah K.</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  Verified customer since 2024
                </p>
              </div>
            </footer>
          </blockquote>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs font-bold text-white/30">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </aside>

      {/* ── Right panel: form content ────────────────────── */}
      <div className="flex min-h-[calc(100vh-1.5rem)] flex-col sm:min-h-[calc(100vh-2rem)]">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-3 pb-2 pt-3 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-brand-glow">
              <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black tracking-tight text-gray-900">{siteName}</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Desktop theme toggle */}
        <div className="hidden justify-end px-3 pt-3 lg:flex">
          <ThemeToggle />
        </div>

        {/* Centered form card */}
        <div className="flex flex-1 items-center justify-center py-6 lg:py-8">
          <div className="bento-card flex w-full max-w-lg justify-center px-5 py-8 sm:px-10 sm:py-12">
            {children}
          </div>
        </div>

        {/* Mobile footer */}
        <div className="pb-4 text-center text-xs font-bold text-gray-400 lg:hidden">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
