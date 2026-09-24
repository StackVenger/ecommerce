'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { CartIcon } from '@/components/cart/cart-icon';
import { ThemeModeSwitcher, ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

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
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="group/search relative">
        {/* Search icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-900"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-2xl border border-foreground/[0.04] bg-card py-3 pl-11 pr-4 text-sm font-medium text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:ring-4 focus:ring-primary/10"
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
    return <div className="h-11 w-11 animate-pulse rounded-2xl bg-gray-200" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-ghost">
          Sign In
        </Link>
        <Link href="/register" className="btn btn-primary">
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-2xl p-1 pr-2 text-gray-700 transition-all hover:bg-card hover:text-gray-900 hover:shadow-sm"
        aria-label="Account menu"
      >
        {/* User avatar or initial */}
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-black text-white">
          {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <span className="hidden text-sm font-black md:inline">{user?.firstName}</span>
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
      <div className="invisible absolute right-0 top-full z-50 w-56 translate-y-1 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="rounded-3xl border border-foreground/[0.04] bg-card p-2 shadow-bento-hover">
          <Link
            href="/account"
            className="block rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            My Account
          </Link>
          <Link
            href="/account/orders"
            className="block rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            My Orders
          </Link>
          <Link
            href="/account/wishlist"
            className="block rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Wishlist
          </Link>
          <hr className="mx-2 my-1.5 border-foreground/[0.05]" />
          <button
            type="button"
            onClick={() => logout()}
            className="block w-full rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
          >
            Sign Out
          </button>
        </div>
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
      className="btn-icon border border-foreground/[0.05] bg-card text-gray-700 shadow-sm hover:bg-gray-50 lg:hidden"
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

/** Default nav when no HEADER menu exists in the DB (first-boot / empty seed). */
const DEFAULT_NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/products', label: 'Products' },
  { href: '/deals', label: 'Deals' },
];

/**
 * Flatten the MenuItem tree into a single list of top-level links for the
 * header row. Submenus would render as dropdowns — not wired yet; the
 * current DOM has no dropdown styling — so second-level items are dropped
 * for now and can be re-added when design lands.
 */
interface HeaderMenuItem {
  id: string;
  label: string;
  url: string;
}

function flattenMenu(menu: unknown): HeaderMenuItem[] {
  if (!menu || typeof menu !== 'object') {
    return [];
  }
  const m = menu as {
    items?: Array<{ id: string; label: string; url: string; isVisible?: boolean }>;
  };
  if (!Array.isArray(m.items)) {
    return [];
  }
  return m.items
    .filter((it) => it && it.label && it.url && it.isVisible !== false)
    .map((it) => ({ id: it.id, label: it.label, url: it.url }));
}

// ──────────────────────────────────────────────────────────
// Header Component
// ──────────────────────────────────────────────────────────

interface HeaderProps {
  /** Site name rendered next to / in place of the logo. */
  siteName?: string;
  /** Admin-uploaded logo URL; falls back to the default bag SVG when empty. */
  logoUrl?: string;
  /**
   * HEADER NavigationMenu fetched server-side. `null` when the admin
   * hasn't configured one yet — we fall back to a conservative default
   * so the site still has a navbar on a fresh install.
   */
  menu?: unknown;
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
export function Header({ siteName = 'Store', logoUrl, menu }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Fall back to the brand mark when the admin logo fails to load (e.g. a
  // deleted CDN asset) instead of showing a broken-image glyph.
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(logoUrl) && !logoFailed;
  const logoRef = useRef<HTMLImageElement>(null);

  // The SSR'd <img> can fail before hydration attaches onError; catch that case too.
  useEffect(() => {
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setLogoFailed(true);
    }
  }, []);
  const pathname = usePathname();
  const isActiveLink = (url: string) =>
    url === '/' ? pathname === '/' : Boolean(pathname?.startsWith(url));

  const navItems = (() => {
    const fromMenu = flattenMenu(menu);
    return fromMenu.length > 0
      ? fromMenu
      : DEFAULT_NAV_LINKS.map((l) => ({ id: l.href, label: l.label, url: l.href }));
  })();

  return (
    <header className="header-blur sticky top-0 z-30 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-3 sm:gap-4">
          {/* Left: Logo + mobile menu */}
          <div className="flex items-center gap-3">
            <MobileMenuButton
              isOpen={mobileMenuOpen}
              onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />

            <Link
              href="/"
              className="flex items-center gap-3 text-lg font-black tracking-tight text-gray-900"
              aria-label={siteName}
            >
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={siteName}
                  ref={logoRef}
                  onError={() => setLogoFailed(true)}
                  className="h-9 w-auto max-w-[160px] object-contain sm:max-w-[180px]"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-brand-glow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                </span>
              )}
              {!showLogo && <span className="hidden sm:inline">{siteName}</span>}
            </Link>
          </div>

          {/* Center: Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((link) => (
              <Link
                key={link.id}
                href={link.url}
                aria-current={isActiveLink(link.url) ? 'page' : undefined}
                className={cn(
                  'rounded-[14px] px-4 py-2.5 text-sm font-bold transition-all',
                  isActiveLink(link.url)
                    ? 'bg-card text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:bg-card/60 hover:text-gray-900',
                )}
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
            <ThemeToggle className="hidden sm:inline-flex" />
            <CartIcon />
            <div className="hidden sm:block">
              <AuthLinks />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="px-4 pb-4 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-4 rounded-[2rem] border border-foreground/[0.04] bg-card p-4 shadow-bento-hover">
            {/* Mobile search */}
            <SearchBar />

            {/* Mobile navigation links */}
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {navItems.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  aria-current={isActiveLink(link.url) ? 'page' : undefined}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm font-bold transition-colors',
                    isActiveLink(link.url)
                      ? 'bg-gray-50 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Colour theme */}
            <div className="space-y-2 border-t border-foreground/[0.05] pt-4 sm:hidden">
              <p className="eyebrow px-1">Theme</p>
              <ThemeModeSwitcher />
            </div>

            {/* Mobile auth links */}
            <div className="border-t border-foreground/[0.05] pt-4 sm:hidden">
              <AuthLinks />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
