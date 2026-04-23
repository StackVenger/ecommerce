import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { GoogleAuthWrapper } from '@/components/auth/google-auth-wrapper';
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left panel: branding (hidden on mobile) ──────── */}
      <div className="relative hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern
                id="auth-grid"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 40L40 0M-10 10L10 -10M30 50L50 30"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                  className="text-primary-foreground"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">{siteName}</span>
          </Link>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-4">
            <p className="text-lg leading-relaxed text-primary-foreground/90">
              &ldquo;This platform has completely transformed how I shop online. The selection is
              incredible, the prices are unbeatable, and delivery is always lightning fast. I
              can&apos;t imagine going back to any other store.&rdquo;
            </p>
            <footer className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20 text-lg font-semibold text-primary-foreground">
                SK
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">Sarah K.</p>
                <p className="text-sm text-primary-foreground/70">Verified customer since 2024</p>
              </div>
            </footer>
          </blockquote>

          {/* Stats */}
          <div className="flex gap-8 border-t border-primary-foreground/20 pt-6">
            <div>
              <p className="text-2xl font-bold text-primary-foreground">50K+</p>
              <p className="text-sm text-primary-foreground/70">Happy customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">4.9</p>
              <p className="text-sm text-primary-foreground/70">Average rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">24h</p>
              <p className="text-sm text-primary-foreground/70">Fast delivery</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-sm text-primary-foreground/50">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>

      {/* ── Right panel: form content ────────────────────── */}
      <div className="flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ShoppingBag className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">{siteName}</span>
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
          <GoogleAuthWrapper>{children}</GoogleAuthWrapper>
        </div>

        {/* Mobile footer */}
        <div className="p-6 text-center text-sm text-muted-foreground lg:hidden">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
