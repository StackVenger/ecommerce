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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your store configuration and preferences
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
          {SETTINGS_TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href === '/admin/settings/general' && pathname === '/admin/settings');

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
    </div>
  );
}
