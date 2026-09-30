'use client';

import {
  Bell,
  Search,
  Menu,
  User,
  LogOut,
  Settings,
  Store,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Admin Top Bar
// ──────────────────────────────────────────────────────────

interface AdminTopbarProps {
  sidebarCollapsed: boolean;
  onMenuToggle: () => void;
  onDesktopToggle?: () => void;
}

export function AdminTopbar({ sidebarCollapsed, onMenuToggle, onDesktopToggle }: AdminTopbarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-card px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="btn-icon border border-gray-200 bg-card text-gray-700 hover:border-primary hover:text-primary lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        {/* Desktop sidebar collapse toggle */}
        {onDesktopToggle && (
          <button
            onClick={onDesktopToggle}
            className="btn-icon hidden text-gray-500 hover:text-primary lg:inline-flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Search */}
        <div className="group/search relative hidden md:block">
          <Search
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-primary"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Search orders, products, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-64 border border-gray-300 bg-card pl-11 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary lg:w-80"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Visit store link */}
        <Link href="/" target="_blank" className="btn btn-secondary btn-sm hidden sm:inline-flex">
          <Store className="h-4 w-4" strokeWidth={2} />
          View Store
        </Link>

        <ThemeToggle />

        {/* Notifications */}
        <button
          className="btn-icon relative border border-gray-200 bg-card text-gray-700 hover:border-primary hover:text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1 pr-2 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-white">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden text-left md:block">
              <p className="font-heading text-sm font-semibold leading-tight text-gray-900">
                {user?.fullName ?? 'Admin'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrator'}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-gray-400 transition-transform md:block',
                showUserMenu && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 border border-gray-200 bg-card py-1 shadow-bento-hover">
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
                Settings
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                onClick={() => setShowUserMenu(false)}
              >
                <User className="h-4 w-4" strokeWidth={1.75} />
                My Account
              </Link>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
