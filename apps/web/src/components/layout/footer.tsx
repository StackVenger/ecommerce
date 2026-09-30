import Link from 'next/link';

import { SocialLinks } from '@/components/layout/social-links';

/** Fallback columns when no FOOTER NavigationMenu exists in the DB. */
const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: 'default-shop',
    heading: 'Shop',
    links: [
      { id: 'products', label: 'All Products', url: '/products' },
      { id: 'categories', label: 'Categories', url: '/categories' },
      { id: 'brands', label: 'Brands', url: '/brands' },
      { id: 'new', label: 'New Arrivals', url: '/products?sort=newest' },
      { id: 'sale', label: 'Sale', url: '/deals' },
    ],
  },
  {
    id: 'default-account',
    heading: 'Account',
    links: [
      { id: 'account', label: 'My Account', url: '/account' },
      { id: 'orders', label: 'Order History', url: '/account/orders' },
      { id: 'wishlist', label: 'Wishlist', url: '/account/wishlist' },
      { id: 'track', label: 'Track Order', url: '/orders/track' },
    ],
  },
  {
    id: 'default-info',
    heading: 'Information',
    links: [
      { id: 'about', label: 'About Us', url: '/about-us' },
      { id: 'contact', label: 'Contact Us', url: '/contact-us' },
      { id: 'privacy', label: 'Privacy Policy', url: '/privacy-policy' },
      { id: 'terms', label: 'Terms & Conditions', url: '/terms-conditions' },
      { id: 'refund', label: 'Return Policy', url: '/refund-policy' },
    ],
  },
];

interface FooterLink {
  id: string;
  label: string;
  url: string;
}

interface FooterColumn {
  id: string;
  heading: string;
  links: FooterLink[];
}

/**
 * Convert a raw MenuItem tree into the 3-column footer shape. Top-level
 * items become column headings; their children become the column links.
 * Items with no children render as a column with a single link (which
 * matches how the admin shows flat menus). The server ensures isVisible
 * filtering; we double-check here so stale cached menus don't leak.
 */
function menuToColumns(menu: unknown): FooterColumn[] {
  if (!menu || typeof menu !== 'object') {
    return [];
  }
  const m = menu as {
    items?: Array<{
      id: string;
      label: string;
      url?: string;
      isVisible?: boolean;
      children?: Array<{
        id: string;
        label: string;
        url?: string;
        isVisible?: boolean;
      }>;
    }>;
  };
  if (!Array.isArray(m.items)) {
    return [];
  }

  return m.items
    .filter((top) => top?.label && top.isVisible !== false)
    .map((top) => ({
      id: top.id,
      heading: top.label,
      links: (top.children ?? [])
        .filter((c) => c?.label && c.url && c.isVisible !== false)
        .map((c) => ({ id: c.id, label: c.label, url: c.url ?? '' })),
    }))
    .filter((col) => col.links.length > 0);
}

export interface FooterProps {
  siteName?: string;
  tagline?: string;
  taglineBn?: string;
  phone?: string;
  email?: string;
  payments?: {
    enable_cod: boolean;
    enable_bkash: boolean;
    enable_nagad: boolean;
    enable_rocket: boolean;
    enable_stripe: boolean;
  };
  social?: {
    facebook_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    twitter_url?: string;
    tiktok_url?: string;
    whatsapp_number?: string;
  };
  /** FOOTER NavigationMenu fetched server-side. null → fallback columns. */
  menu?: unknown;
}

/**
 * Derive the footer payment badges from the admin's payment toggles.
 * Keeps the UI honest: if COD is disabled, it doesn't claim we accept
 * cash on delivery.
 */
function paymentMethods(payments?: FooterProps['payments']): string[] {
  if (!payments) {
    return [];
  }
  const methods: string[] = [];
  if (payments.enable_bkash) {
    methods.push('bKash');
  }
  if (payments.enable_nagad) {
    methods.push('Nagad');
  }
  if (payments.enable_rocket) {
    methods.push('Rocket');
  }
  if (payments.enable_stripe) {
    methods.push('Visa / Mastercard');
  }
  if (payments.enable_cod) {
    methods.push('Cash on Delivery');
  }
  return methods;
}

/**
 * Storefront footer: white, hairline-topped. Brand column (logo mark,
 * tagline, contact lines, round social icons) beside the FOOTER menu
 * columns, then a bottom row with the copyright and payment badges.
 */
export function Footer({
  siteName = 'Store',
  tagline = 'Your trusted online shopping destination.',
  taglineBn,
  phone,
  email,
  payments,
  social,
  menu,
}: FooterProps = {}) {
  const methods = paymentMethods(payments);
  const columns = (() => {
    const fromMenu = menuToColumns(menu);
    return fromMenu.length > 0 ? fromMenu : DEFAULT_FOOTER_COLUMNS;
  })();

  return (
    <footer className="border-t border-gray-200 bg-card">
      <div className="site-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-12 sm:py-14 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-heading text-2xl font-semibold text-gray-900"
            >
              <span className="flex h-10 w-10 items-center justify-center border-2 border-gray-900 text-base">
                {siteName.charAt(0).toUpperCase()}
              </span>
              {siteName}
            </Link>
            {tagline && <p className="mt-5 text-sm text-gray-600">{tagline}</p>}
            {taglineBn && <p className="mt-1 text-sm text-gray-500">{taglineBn}</p>}
            {phone && (
              <div className="mt-5">
                <p className="font-heading text-[15px] font-semibold text-gray-900">Need Help?</p>
                <p className="mt-1 text-[13px] text-gray-600">
                  Call:{' '}
                  <a href={`tel:${phone}`} className="transition-colors hover:text-primary">
                    {phone}
                  </a>
                </p>
              </div>
            )}
            {email && (
              <div className="mt-4">
                <p className="font-heading text-[15px] font-semibold text-gray-900">Email</p>
                <a
                  href={`mailto:${email}`}
                  className="mt-1 block text-[13px] text-gray-600 transition-colors hover:text-primary"
                >
                  {email}
                </a>
              </div>
            )}
            <SocialLinks social={social} variant="round" className="mt-6" />
          </div>

          {/* Columns from FOOTER NavigationMenu (or defaults) */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id}>
                <h3 className="font-heading text-base font-semibold text-gray-900">
                  {column.heading}
                </h3>
                <ul className="mt-5 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.url}
                        className="text-[13px] text-gray-600 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 py-5 text-center sm:flex-row sm:text-left">
          <p className="text-[13px] font-light text-gray-500">
            Copyright &copy; {new Date().getFullYear()}{' '}
            <span className="font-medium text-gray-900">{siteName}</span>. All Rights Reserved.
          </p>
          {methods.length > 0 && (
            <ul
              className="flex flex-wrap items-center justify-center gap-1.5"
              aria-label="Payments accepted"
            >
              {methods.map((m) => (
                <li
                  key={m}
                  className="border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
