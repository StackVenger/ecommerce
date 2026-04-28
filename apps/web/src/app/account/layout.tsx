'use client';

import {
  LayoutDashboard,
  Package,
  MapPin,
  Heart,
  User,
  Lock,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  {
    label: 'Dashboard',
    href: '/account/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My Orders',
    href: '/account/orders',
    icon: Package,
  },
  {
    label: 'Addresses',
    href: '/account/addresses',
    icon: MapPin,
  },
  {
    label: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
  },
  {
    label: 'Profile',
    href: '/account/profile',
    icon: User,
  },
  {
    label: 'Change Password',
    href: '/account/change-password',
    icon: Lock,
  },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName || 'User'}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 w-full px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
              <span className="text-sm font-medium text-gray-700">Account Menu</span>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-400 ml-auto transition-transform',
                  isMobileMenuOpen && 'rotate-90',
                )}
              />
            </button>

            {/* Mobile Tabs */}
            {isMobileMenuOpen && (
              <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <nav className="flex flex-col">
                  {sidebarLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors',
                          active
                            ? 'bg-teal-50 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {link.label}
                        {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </Link>
                    );
                  })}

                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              {/* User Info */}
              <div className="px-4 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.fullName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="py-2">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-teal-50 text-primary border-r-2 border-teal-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Sign Out */}
              <div className="px-2 py-3 border-t border-gray-100">
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
