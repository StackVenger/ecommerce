'use client';

import { Plus, Package, ShoppingCart, Users, Tag, BarChart3, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Quick Action Items
// ──────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  toneClass: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'Add Product',
    description: 'Create a new product listing',
    href: '/admin/products/new',
    icon: Plus,
    toneClass: 'bg-emerald-50 text-emerald-500',
  },
  {
    label: 'Orders',
    description: 'Manage pending orders',
    href: '/admin/orders',
    icon: ShoppingCart,
    toneClass: 'bg-brand-50 text-brand-600',
  },
  {
    label: 'Products',
    description: 'Manage your product catalog',
    href: '/admin/products',
    icon: Package,
    toneClass: 'bg-purple-50 text-purple-500',
  },
  {
    label: 'Customers',
    description: 'View customer accounts',
    href: '/admin/customers',
    icon: Users,
    toneClass: 'bg-blue-50 text-blue-500',
  },
  {
    label: 'Coupons',
    description: 'Create discount coupons',
    href: '/admin/coupons',
    icon: Tag,
    toneClass: 'bg-rose-50 text-rose-500',
  },
  {
    label: 'Analytics',
    description: 'View sales reports',
    href: '/admin/analytics',
    icon: BarChart3,
    toneClass: 'bg-orange-50 text-orange-500',
  },
];

// ──────────────────────────────────────────────────────────
// Quick Actions Component
// ──────────────────────────────────────────────────────────

/**
 * Compact quick-action hub (icon tiles + micro labels) for the admin
 * dashboard. Provides shortcuts to common admin tasks.
 */
export function QuickActions({ className }: { className?: string } = {}) {
  return (
    <div className={cn('bento-card p-4 sm:p-5', className)}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            title={action.description}
            className="group/btn flex flex-col items-center gap-3 rounded-[1.5rem] p-3 text-center transition-all hover:bg-gray-50"
          >
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover/btn:scale-110',
                action.toneClass,
              )}
            >
              <action.icon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <span className="w-full truncate text-[9px] font-black uppercase tracking-widest text-gray-600">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
