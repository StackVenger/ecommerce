'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CartIcon } from '@/components/cart/cart-icon';
import { useAuth } from '@/hooks/use-auth';

// ──────────────────────────────────────────────────────────
// Search Bar
// ──────────────────────────────────────────────────────────

function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-lg">
      <div className="relative">
        {/* Search icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100 outline-none transition-all"
          aria-label="Search products"
        />
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────
// Auth Links
// ──────────────────────────────────────────────────────────

function AuthLinks() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Account menu"
      >
        {/* User avatar or initial */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
          {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <span className="hidden md:inline text-sm font-medium">{user?.firstName}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hidden md:block"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
        <Link
          href="/account"
          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          My Account
        </Link>
        <Link
          href="/account/orders"
          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          My Orders
        </Link>
        <Link
          href="/account/wishlist"
          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Wishlist
        </Link>
        <hr className="my-1 border-gray-100" />
        <button
          type="button"
          onClick={() => logout()}
          className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Mobile Menu Toggle
// ──────────────────────────────────────────────────────────

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors lg:hidden"
      onClick={onToggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Navigation Links
// ──────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/products', label: 'Products' },
  { href: '/deals', label: 'Deals' },
] as const;

// ──────────────────────────────────────────────────────────
// Header Component
// ──────────────────────────────────────────────────────────

interface HeaderProps {
  /** Site name rendered next to / in place of the logo. */
  siteName?: string;
  /** Admin-uploaded logo URL; falls back to the default bag SVG when empty. */
  logoUrl?: string;
}

/**
 * Main site header with navigation, search, cart icon, and auth links.
 *
 * Features:
 * - Sticky header with blur backdrop
 * - Responsive navigation (desktop links + mobile hamburger menu)
 * - Integrated search bar
 * - Cart icon with animated item count badge
 * - Auth links (sign in/up for guests, account dropdown for users)
 *
 * `siteName` and `logoUrl` come from the server-side site config so the
 * storefront reflects admin-edited branding without a rebuild.
 */
export function Header({ siteName = 'ShopBD', logoUrl }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Logo + mobile menu */}
          <div className="flex items-center gap-3">
            <MobileMenuButton
              isOpen={mobileMenuOpen}
              onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />

            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-gray-900"
              aria-label={siteName}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-8 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-600"
                >
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              )}
              {!logoUrl && <span className="hidden sm:inline">{siteName}</span>}
            </Link>
          </div>

          {/* Center: Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Center: Search bar */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <SearchBar />
          </div>

          {/* Right: Cart + Auth */}
          <div className="flex items-center gap-2">
            <CartIcon />
            <div className="hidden sm:block">
              <AuthLinks />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
            {/* Mobile search */}
            <SearchBar />

            {/* Mobile navigation links */}
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile auth links */}
            <div className="border-t border-gray-100 pt-4 sm:hidden">
              <AuthLinks />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
