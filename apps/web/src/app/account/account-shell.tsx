'use client';

import { LayoutDashboard, Package, MapPin, Heart, User, Lock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/bento';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { label: 'Dashboard', href: '/account/dashboard', icon: LayoutDashboard },
  { label: 'My Orders', href: '/account/orders', icon: Package },
  { label: 'Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Profile', href: '/account/profile', icon: User },
  { label: 'Change Password', href: '/account/change-password', icon: Lock },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const isActive = (href: string) => pathname === href;

  // Block unverified users from the account area. Middleware handles "not logged
  // in"; here we add the "logged in but email not verified" case.
  useEffect(() => {
    if (!isLoading && user && !user.emailVerified) {
      router.replace('/verify-email');
    }
  }, [isLoading, user, router]);

  if (user && !user.emailVerified) {
    return null;
  }

  const initial = (user?.fullName || user?.email || 'U').charAt(0).toUpperCase();

  // "Home › My Account › Section" — the section is the nav entry that owns
  // the current path (nested routes such as an order detail included).
  const section = sidebarLinks.find(
    (link) => pathname === link.href || pathname?.startsWith(`${link.href}/`),
  );
  const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];
  if (!section || section.href === '/account/dashboard') {
    crumbs.push({ label: 'My Account' });
  } else if (pathname === section.href) {
    crumbs.push({ label: 'My Account', href: '/account/dashboard' }, { label: section.label });
  } else {
    crumbs.push(
      { label: 'My Account', href: '/account/dashboard' },
      { label: section.label, href: section.href },
      { label: decodeURIComponent(pathname.split('/').pop() ?? '') },
    );
  }

  return (
    <div className="flex-1">
      <Breadcrumbs items={crumbs} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Mobile / tablet: scrollable tab navigation */}
          <nav
            className="scrollbar-none -mx-4 flex overflow-x-auto border-b border-gray-200 px-4 sm:-mx-6 sm:px-6 lg:hidden"
            aria-label="Account navigation"
          >
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => logout()}
              className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign Out
            </button>
          </nav>

          {/* Desktop Sidebar */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-28 border border-gray-200 bg-card">
              {/* User Info */}
              <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-heading text-base font-semibold text-white">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Welcome back,</p>
                  <p className="truncate font-heading text-[15px] font-semibold text-gray-900">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user?.email || ''}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav aria-label="Account navigation">
                <ul className="divide-y divide-gray-200">
                  {sidebarLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);

                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative flex h-12 items-center gap-3 px-5 text-sm transition-colors',
                            active
                              ? 'font-medium text-primary before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
                              : 'text-gray-700 hover:text-primary',
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      onClick={() => logout()}
                      className="flex h-12 w-full items-center gap-3 px-5 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.75} />
                      Sign Out
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
