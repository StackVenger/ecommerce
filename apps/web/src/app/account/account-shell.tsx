'use client';

import { LayoutDashboard, Package, MapPin, Heart, User, Lock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-2 sm:mb-8">
        <p className="eyebrow">My Account</p>
        <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden />
        <p className="text-xs font-bold text-gray-500">Welcome back, {user?.fullName || 'User'}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Mobile / tablet: scrollable chip navigation */}
        <nav
          className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
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
                  'flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all',
                  active
                    ? 'bg-card text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:bg-card/60 hover:text-gray-900',
                )}
              >
                <Icon
                  className={cn('h-4 w-4', active ? 'text-primary' : 'text-gray-400')}
                  strokeWidth={2.25}
                />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => logout()}
            className="flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
            Sign Out
          </button>
        </nav>

        {/* Desktop Sidebar */}
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div className="sticky top-28 space-y-6">
            {/* User Info */}
            <div className="bento-dark p-6">
              <div className="bento-glow -right-10 -top-10 h-40 w-40 bg-primary/25" aria-hidden />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-lg font-black text-white shadow-brand-glow">
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
                  <p className="truncate text-base font-black tracking-tight text-white">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="truncate text-xs font-bold text-white/50">{user?.email || ''}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5" aria-label="Account navigation">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-12 items-center gap-3 rounded-[14px] px-4 text-sm font-bold transition-all',
                      active
                        ? 'bg-card text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:bg-card/60 hover:text-gray-900',
                    )}
                  >
                    <Icon
                      className={cn('h-5 w-5', active ? 'text-primary' : 'text-gray-400')}
                      strokeWidth={2.25}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out */}
            <div className="border-t border-foreground/[0.05] pt-4">
              <button
                onClick={() => logout()}
                className="flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-5 w-5" strokeWidth={2.25} />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
