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
    <header className="header-blur sticky top-0 z-30 flex h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="btn-icon border border-foreground/[0.05] bg-card text-gray-700 shadow-sm hover:bg-gray-50 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2.25} />
        </button>

        {/* Desktop sidebar collapse toggle */}
        {onDesktopToggle && (
          <button
            onClick={onDesktopToggle}
            className="btn-icon hidden text-gray-500 hover:bg-card hover:text-gray-900 hover:shadow-sm lg:inline-flex"
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
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-900"
            strokeWidth={2.5}
          />
          <input
            type="text"
            placeholder="Search orders, products, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-2xl border border-foreground/[0.04] bg-card py-3 pl-11 pr-4 text-sm font-medium text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:ring-4 focus:ring-brand-500/10 lg:w-80"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Visit store link */}
        <Link href="/" target="_blank" className="btn btn-secondary hidden sm:inline-flex">
          <Store className="h-4 w-4" strokeWidth={2.5} />
          View Store
        </Link>

        <ThemeToggle />

        {/* Notifications */}
        <button
          className="btn-icon relative border border-foreground/[0.05] bg-card text-gray-700 shadow-sm hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" strokeWidth={2.25} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-2xl p-1 pr-2 transition-all hover:bg-card hover:shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-black text-white">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-black leading-tight text-gray-900">
                {user?.fullName ?? 'Admin'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
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
            <div className="absolute right-0 top-full mt-2 w-56 rounded-3xl border border-foreground/[0.04] bg-card p-2 shadow-bento-hover">
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="h-4 w-4" strokeWidth={2.25} />
                Settings
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setShowUserMenu(false)}
              >
                <User className="h-4 w-4" strokeWidth={2.25} />
                My Account
              </Link>
              <hr className="mx-2 my-1.5 border-foreground/[0.05]" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.25} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
