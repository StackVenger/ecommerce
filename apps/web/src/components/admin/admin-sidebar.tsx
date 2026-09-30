'use client';

import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  FileText,
  // Palette,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Sidebar navigation configuration
// ──────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    label: 'Products',
    icon: Package,
    children: [
      { label: 'All Products', href: '/admin/products' },
      { label: 'Add Product', href: '/admin/products/new' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'Brands', href: '/admin/brands' },
    ],
  },
  {
    label: 'Orders',
    icon: ShoppingCart,
    children: [
      { label: 'All Orders', href: '/admin/orders' },
      { label: 'Returns', href: '/admin/orders/returns' },
    ],
  },
  {
    label: 'Customers',
    icon: Users,
    children: [
      { label: 'All Customers', href: '/admin/customers' },
      { label: 'Reviews', href: '/admin/reviews' },
      { label: 'Questions', href: '/admin/questions' },
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    children: [
      // { label: 'Pages', href: '/admin/pages' },
      { label: 'Banners', href: '/admin/banners' },
      { label: 'Coupons', href: '/admin/coupons' },
    ],
  },
  // {
  //   label: 'Appearance',
  //   icon: Palette,
  //   children: [
  //     { label: 'Theme', href: '/admin/appearance/theme' },
  //     { label: 'Navigation', href: '/admin/appearance/navigation' },
  //     { label: 'Home layout', href: '/admin/appearance/home' },
  //   ],
  // },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'General', href: '/admin/settings' },
      { label: 'Payment', href: '/admin/settings/payment' },
      { label: 'Shipping', href: '/admin/settings/shipping' },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    children: [
      { label: 'Users', href: '/admin/users' },
      { label: 'Roles', href: '/admin/roles' },
      { label: 'Audit Logs', href: '/admin/audit-logs' },
    ],
  },
];

// ──────────────────────────────────────────────────────────
// Sidebar component
// ──────────────────────────────────────────────────────────

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Auto-expand the section that matches the current path
    return navigation
      .filter((item) => item.children?.some((child) => pathname.startsWith(child.href)))
      .map((item) => item.label);
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    // Close mobile sidebar on navigation
    onMobileClose?.();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col bg-card transition-all duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between border-b border-gray-200',
            collapsed ? 'px-4' : 'px-6',
          )}
        >
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3">
              <BrandMark />
              <span className="font-heading text-lg font-semibold text-gray-900">Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto" aria-label="Admin dashboard">
              <BrandMark />
            </Link>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-[4.75rem] z-50 flex h-6 w-6 items-center justify-center border border-gray-200 bg-card text-gray-500 transition-colors hover:border-primary hover:text-primary"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Navigation */}
        <nav
          className={cn('scrollbar-thin flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-0')}
        >
          <SidebarNav
            items={navigation}
            collapsed={collapsed}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            isActive={isActive}
          />
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-gray-200 px-6 py-4">
            <p className="text-xs text-gray-400">ShopBD Admin v1.0</p>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[18rem] max-w-[85vw] flex-col border-r border-gray-200 bg-card transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6">
          <Link href="/admin" className="flex items-center gap-3" onClick={handleLinkClick}>
            <BrandMark />
            <span className="font-heading text-lg font-semibold text-gray-900">Admin</span>
          </Link>
          <button
            onClick={onMobileClose}
            className="flex h-9 w-9 items-center justify-center text-gray-500 transition-colors hover:text-primary"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto py-4">
          <SidebarNav
            items={navigation}
            collapsed={false}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            isActive={isActive}
            onLinkClick={handleLinkClick}
          />
        </nav>

        <div className="border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-400">ShopBD Admin v1.0</p>
        </div>
      </aside>
    </>
  );
}

/** Square coral monogram used for the admin brand. */
function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center bg-primary font-heading text-sm font-semibold text-white">
      S
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Navigation list (shared between desktop & mobile)
// ──────────────────────────────────────────────────────────

function SidebarNav({
  items,
  collapsed,
  expandedSections,
  toggleSection,
  isActive,
  onLinkClick,
}: {
  items: NavItem[];
  collapsed: boolean;
  expandedSections: string[];
  toggleSection: (label: string) => void;
  isActive: (href: string) => boolean;
  onLinkClick?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.label}>
          {/* Simple link (no children) */}
          {item.href && !item.children ? (
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'relative flex h-11 items-center gap-3 border-l-2 px-6 font-heading text-sm font-semibold transition-colors',
                isActive(item.href)
                  ? 'border-primary bg-brand-50 text-primary'
                  : 'border-transparent text-gray-700 hover:text-primary',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive(item.href) ? 'text-primary' : 'text-gray-400',
                )}
                strokeWidth={1.75}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ) : (
            <>
              {/* Expandable section */}
              <button
                onClick={() => toggleSection(item.label)}
                className={cn(
                  'flex h-11 w-full items-center gap-3 border-l-2 border-transparent px-6 font-heading text-sm font-semibold transition-colors',
                  item.children?.some((child) => isActive(child.href))
                    ? 'text-primary'
                    : 'text-gray-700 hover:text-primary',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    item.children?.some((child) => isActive(child.href))
                      ? 'text-primary'
                      : 'text-gray-400',
                  )}
                  strokeWidth={1.75}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-gray-400 transition-transform',
                        expandedSections.includes(item.label) && 'rotate-180',
                      )}
                    />
                  </>
                )}
              </button>

              {/* Children */}
              {!collapsed && expandedSections.includes(item.label) && item.children && (
                <ul className="relative mb-1 ml-[2.125rem] space-y-0.5 border-l border-gray-200 pl-3">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onLinkClick}
                        className={cn(
                          'block px-3 py-1.5 text-[13px] transition-colors',
                          isActive(child.href)
                            ? 'font-medium text-primary'
                            : 'text-gray-500 hover:text-primary',
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
