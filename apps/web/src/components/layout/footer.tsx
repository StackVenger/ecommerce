import Link from 'next/link';

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
 * Derive the footer "Payments accepted" strip from the admin's payment
 * toggles. Keeps the UI honest: if COD is disabled, it doesn't claim we
 * accept cash on delivery.
 */
function paymentMethodsText(payments?: FooterProps['payments']): string {
  if (!payments) {
    return '';
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
    methods.push('Visa/Mastercard');
  }
  if (payments.enable_cod) {
    methods.push('COD');
  }
  return methods.length > 0 ? `Payments accepted: ${methods.join(', ')}` : '';
}

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
  const paymentsText = paymentMethodsText(payments);
  const columns = (() => {
    const fromMenu = menuToColumns(menu);
    return fromMenu.length > 0 ? fromMenu : DEFAULT_FOOTER_COLUMNS;
  })();
  const socials: Array<{ label: string; href: string }> = [];
  if (social?.facebook_url) {
    socials.push({ label: 'Facebook', href: social.facebook_url });
  }
  if (social?.instagram_url) {
    socials.push({ label: 'Instagram', href: social.instagram_url });
  }
  if (social?.youtube_url) {
    socials.push({ label: 'YouTube', href: social.youtube_url });
  }
  if (social?.twitter_url) {
    socials.push({ label: 'Twitter', href: social.twitter_url });
  }
  if (social?.tiktok_url) {
    socials.push({ label: 'TikTok', href: social.tiktok_url });
  }

  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="text-xl font-bold text-gray-900">
              {siteName}
            </Link>
            {tagline && <p className="mt-4 text-sm text-gray-600">{tagline}</p>}
            {taglineBn && <p className="mt-2 text-sm text-gray-600">{taglineBn}</p>}
            {(phone || email) && (
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                {phone && <p>{phone}</p>}
                {email && (
                  <p>
                    <a href={`mailto:${email}`} className="hover:text-gray-900">
                      {email}
                    </a>
                  </p>
                )}
              </div>
            )}
            {socials.length > 0 && (
              <ul className="mt-4 flex gap-3 text-sm text-gray-600">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-900"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Columns from FOOTER NavigationMenu (or defaults) */}
          {columns.map((column) => (
            <div key={column.id}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link href={link.url} className="text-sm text-gray-600 hover:text-gray-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            {paymentsText && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">{paymentsText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
