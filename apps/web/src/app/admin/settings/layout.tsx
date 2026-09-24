'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

const SETTINGS_TABS = [
  { label: 'General', href: '/admin/settings/general' },
  { label: 'Shipping', href: '/admin/settings/shipping' },
  { label: 'Payment', href: '/admin/settings/payment' },
  { label: 'SEO', href: '/admin/settings/seo' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your store configuration and preferences</p>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto rounded-[1.5rem] border border-foreground/[0.04] bg-card p-2 shadow-bento scrollbar-none sm:w-fit"
        aria-label="Settings tabs"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === '/admin/settings/general' && pathname === '/admin/settings');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`chip ${isActive ? 'chip-active' : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="bento-card p-6 sm:p-8">{children}</div>
    </div>
  );
}
