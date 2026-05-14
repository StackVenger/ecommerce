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
          'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 lg:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                S
              </div>
              <span className="text-lg font-semibold text-gray-900">Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                S
              </div>
            </Link>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-400">ShopBD Admin v1.0</p>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <Link href="/admin" className="flex items-center gap-2" onClick={handleLinkClick}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold text-gray-900">Admin</span>
          </Link>
          <button
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav
            items={navigation}
            collapsed={false}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            isActive={isActive}
            onLinkClick={handleLinkClick}
          />
        </nav>

        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-400">ShopBD Admin v1.0</p>
        </div>
      </aside>
    </>
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
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label}>
          {/* Simple link (no children) */}
          {item.href && !item.children ? (
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ) : (
            <>
              {/* Expandable section */}
              <button
                onClick={() => toggleSection(item.label)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  item.children?.some((child) => isActive(child.href))
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expandedSections.includes(item.label) && 'rotate-180',
                      )}
                    />
                  </>
                )}
              </button>

              {/* Children */}
              {!collapsed && expandedSections.includes(item.label) && item.children && (
                <ul className="mt-1 space-y-1 pl-11">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onLinkClick}
                        className={cn(
                          'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                          isActive(child.href)
                            ? 'font-medium text-teal-700'
                            : 'text-gray-600 hover:text-gray-900',
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
