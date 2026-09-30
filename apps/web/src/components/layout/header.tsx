'use client';

import { ChevronDown, Menu, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { CartIcon } from '@/components/cart/cart-icon';
import { SocialLinks, type SocialSettings } from '@/components/layout/social-links';
import { ThemeModeSwitcher, ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Search Bar
// ──────────────────────────────────────────────────────────

/**
 * Header search. `variant="onBrand"` is the translucent field that sits on
 * the coral header bar; `default` is the plain bordered field used inside
 * the mobile menu.
 */
function SearchBar({ variant = 'default' }: { variant?: 'default' | 'onBrand' }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const onBrand = variant === 'onBrand';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full" role="search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search our store"
        className={cn(
          'h-11 w-full rounded-lg pl-4 pr-12 text-sm outline-none transition-colors',
          onBrand
            ? 'border border-white/10 bg-white/20 text-white placeholder:text-white/80 focus:bg-white/30'
            : 'border border-gray-300 bg-card text-gray-900 placeholder:text-gray-400 focus:border-primary',
        )}
        aria-label="Search products"
      />
      <button
        type="submit"
        aria-label="Submit search"
        className={cn(
          'absolute right-0 top-0 flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-80',
          onBrand ? 'text-white' : 'text-gray-500',
        )}
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────
// Account links
// ──────────────────────────────────────────────────────────

const ACCOUNT_LINKS = [
  { href: '/account', label: 'My Account' },
  { href: '/account/orders', label: 'My Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

/** "My Account ⌄" dropdown (signed in) or Sign in / Register links, for the coral top bar. */
function TopBarAccount() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <span className="h-3 w-24 animate-pulse bg-white/30" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3 text-[13px] font-light text-white/90">
        <Link href="/login" className="transition-colors hover:text-white">
          Sign In
        </Link>
        <span className="h-3 w-px bg-white/50" aria-hidden />
        <Link href="/register" className="transition-colors hover:text-white">
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 py-2 text-[13px] font-light text-white/90 transition-colors hover:text-white"
        aria-label="Account menu"
      >
        {user?.firstName ? `Hi, ${user.firstName}` : 'My Account'}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      <div className="invisible absolute right-0 top-full z-50 w-48 translate-y-1 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="border border-gray-200 bg-card py-2 shadow-bento-hover">
          {ACCOUNT_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <hr className="my-1.5 border-gray-200" />
          <button
            type="button"
            onClick={() => logout()}
            className="block w-full px-4 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Stacked account links for the mobile menu panel. */
function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="h-10 animate-pulse bg-gray-100" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Link href="/login" className="btn btn-secondary" onClick={onNavigate}>
          Sign In
        </Link>
        <Link href="/register" className="btn btn-primary" onClick={onNavigate}>
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {ACCOUNT_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          className="py-2.5 text-sm text-gray-700 transition-colors hover:text-primary"
        >
          {l.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => {
          onNavigate();
          void logout();
        }}
        className="py-2.5 text-left text-sm text-rose-600"
      >
        Sign Out
      </button>
    </div>
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
 * header row. Submenus would render as dropdowns — not wired yet — so
 * second-level items are dropped for now.
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
  /** Admin-uploaded logo URL; falls back to the default bag mark when empty. */
  logoUrl?: string;
  /**
   * HEADER NavigationMenu fetched server-side. `null` when the admin
   * hasn't configured one yet — we fall back to a conservative default
   * so the site still has a navbar on a fresh install.
   */
  menu?: unknown;
  /** Admin social links, shown as "Follow us" in the top bar. */
  social?: SocialSettings;
}

/**
 * Main site header, three tiers:
 *  1. Coral utility bar — "Follow us" social links, account links.
 *  2. Coral brand bar — logo, search, cart.
 *  3. White navigation row (desktop) / "Menu" toggle bar (mobile).
 *
 * `siteName`, `logoUrl`, `menu` and `social` come from the server-side
 * site config so the storefront reflects admin-edited branding.
 */
export function Header({ siteName = 'Store', logoUrl, menu, social }: HeaderProps = {}) {
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

  // Close the mobile panel on navigation.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = (() => {
    const fromMenu = flattenMenu(menu);
    return fromMenu.length > 0
      ? fromMenu
      : DEFAULT_NAV_LINKS.map((l) => ({ id: l.href, label: l.label, url: l.href }));
  })();

  return (
    <header className="sticky top-0 z-30 w-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* ─── Coral brand block ─────────────────────────────── */}
      <div className="bg-primary text-white">
        {/* Utility bar */}
        <div className="site-container hidden px-4 sm:px-6 md:block lg:px-8">
          <div className="flex h-10 items-center justify-between border-b border-white/20 text-[13px]">
            <SocialLinks social={social} variant="onBrand" label="Follow Us:" />
            <div className="ml-auto flex items-center gap-4">
              <Link
                href="/orders/track"
                className="font-light text-white/90 transition-colors hover:text-white"
              >
                Track Order
              </Link>
              <span className="h-3 w-px bg-white/50" aria-hidden />
              <TopBarAccount />
            </div>
          </div>
        </div>

        {/* Brand bar */}
        <div className="site-container px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4 md:h-[4.5rem] lg:gap-10">
            <Link
              href="/"
              className="flex min-w-0 shrink-0 items-center gap-2.5 font-heading text-xl font-semibold text-white"
              aria-label={siteName}
            >
              {showLogo ? (
                <span className="flex h-11 items-center bg-white px-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={siteName}
                    ref={logoRef}
                    onError={() => setLogoFailed(true)}
                    className="h-9 w-auto max-w-[140px] object-contain sm:max-w-[170px]"
                  />
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center border-2 border-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
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
              {!showLogo && <span className="truncate">{siteName}</span>}
            </Link>

            <div className="hidden max-w-[22rem] flex-1 md:block lg:max-w-md">
              <SearchBar variant="onBrand" />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle className="hidden border-white/40 bg-transparent text-white shadow-none hover:bg-white/15 sm:inline-flex" />
              <CartIcon />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation row ────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-card">
        <div className="site-container px-4 sm:px-6 lg:px-8">
          {/* Desktop */}
          <nav
            className="hidden h-[3.25rem] items-center gap-10 lg:flex"
            aria-label="Main navigation"
          >
            {navItems.map((link) => (
              <Link
                key={link.id}
                href={link.url}
                aria-current={isActiveLink(link.url) ? 'page' : undefined}
                className={cn(
                  'relative flex h-full items-center font-heading text-sm font-semibold transition-colors',
                  isActiveLink(link.url) ? 'text-primary' : 'text-gray-900 hover:text-primary',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu bar */}
          <div className="flex h-12 items-center justify-between lg:hidden">
            <button
              type="button"
              className="flex items-center gap-2.5 font-heading text-sm font-semibold text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={2} />
              )}
              Menu
            </button>
            <Link
              href="/account"
              className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-primary md:hidden"
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
              Account
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto border-b border-gray-200 bg-card lg:hidden">
          <div className="site-container space-y-5 px-4 py-4 sm:px-6">
            <div className="md:hidden">
              <SearchBar />
            </div>

            <nav className="flex flex-col divide-y divide-gray-200" aria-label="Mobile navigation">
              {navItems.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  aria-current={isActiveLink(link.url) ? 'page' : undefined}
                  className={cn(
                    'py-3 font-heading text-sm font-semibold transition-colors',
                    isActiveLink(link.url) ? 'text-primary' : 'text-gray-900 hover:text-primary',
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/orders/track"
                className="py-3 font-heading text-sm font-semibold text-gray-900 hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Track Order
              </Link>
            </nav>

            <div className="space-y-2 border-t border-gray-200 pt-4">
              <p className="eyebrow">Theme</p>
              <ThemeModeSwitcher />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <MobileAccount onNavigate={() => setMobileMenuOpen(false)} />
            </div>

            <SocialLinks social={social} className="border-t border-gray-200 pt-4" />
          </div>
        </div>
      )}
    </header>
  );
}
