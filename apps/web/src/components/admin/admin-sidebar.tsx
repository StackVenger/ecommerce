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
          'fixed left-0 top-0 z-40 hidden h-screen flex-col bg-gray-50 transition-all duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn('flex items-center justify-between pb-8 pt-8', collapsed ? 'px-4' : 'px-6')}
        >
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3">
              <BrandMark />
              <span className="text-lg font-black tracking-tight text-gray-900">Admin</span>
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
          className="absolute -right-3 top-[4.5rem] z-50 flex h-7 w-7 items-center justify-center rounded-full border border-foreground/[0.05] bg-card text-gray-500 shadow-sm transition-colors hover:text-gray-900"
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
          className={cn('scrollbar-thin flex-1 overflow-y-auto pb-4', collapsed ? 'px-3' : 'px-4')}
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
          <div className="mx-4 mb-4 border-t border-foreground/[0.05] px-2 pt-4">
            <p className="eyebrow text-gray-400">ShopBD Admin v1.0</p>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[18rem] max-w-[85vw] flex-col rounded-r-[2rem] bg-gray-50 shadow-2xl shadow-black/10 transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-6 pb-6 pt-6">
          <Link href="/admin" className="flex items-center gap-3" onClick={handleLinkClick}>
            <BrandMark />
            <span className="text-lg font-black tracking-tight text-gray-900">Admin</span>
          </Link>
          <button
            onClick={onMobileClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-card hover:text-gray-900"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4">
          <SidebarNav
            items={navigation}
            collapsed={false}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            isActive={isActive}
            onLinkClick={handleLinkClick}
          />
        </nav>

        <div className="mx-4 mb-4 border-t border-foreground/[0.05] px-2 pt-4">
          <p className="eyebrow text-gray-400">ShopBD Admin v1.0</p>
        </div>
      </aside>
    </>
  );
}

/** Coral rounded monogram used for the admin brand. */
function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-white shadow-brand-glow">
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
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label}>
          {/* Simple link (no children) */}
          {item.href && !item.children ? (
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex h-12 items-center gap-3 rounded-[14px] px-4 text-sm font-bold transition-all',
                isActive(item.href)
                  ? 'bg-card text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:bg-card/60 hover:text-gray-900',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive(item.href) ? 'text-primary' : 'text-gray-500',
                )}
                strokeWidth={2.25}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ) : (
            <>
              {/* Expandable section */}
              <button
                onClick={() => toggleSection(item.label)}
                className={cn(
                  'flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-sm font-bold transition-all',
                  item.children?.some((child) => isActive(child.href))
                    ? 'bg-card text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:bg-card/60 hover:text-gray-900',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    item.children?.some((child) => isActive(child.href))
                      ? 'text-primary'
                      : 'text-gray-500',
                  )}
                  strokeWidth={2.25}
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
                <ul className="relative ml-[1.625rem] mt-1.5 space-y-0.5 border-l border-foreground/[0.06] pl-4">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onLinkClick}
                        className={cn(
                          'block rounded-xl px-3 py-2 text-[13px] font-bold transition-all',
                          isActive(child.href)
                            ? 'bg-card/70 text-primary'
                            : 'text-gray-500 hover:bg-card/50 hover:text-gray-900',
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
