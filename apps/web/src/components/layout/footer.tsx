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
    <footer className="px-4 pb-6 pt-10 sm:px-6 lg:px-8">
      <div className="bento-dark mx-auto max-w-7xl p-8 sm:p-10 lg:p-12">
        <div className="bento-glow -right-16 -top-16 h-72 w-72 bg-primary/20" aria-hidden />
        <div className="bento-glow -bottom-16 -left-16 h-56 w-56 bg-blue-500/10" aria-hidden />

        <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-2xl font-black tracking-tighter text-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base shadow-brand-glow">
                {siteName.charAt(0).toUpperCase()}
              </span>
              {siteName}
            </Link>
            {tagline && <p className="mt-5 text-sm font-bold text-white/60">{tagline}</p>}
            {taglineBn && <p className="mt-1.5 text-sm font-medium text-white/50">{taglineBn}</p>}
            {(phone || email) && (
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-white/80">
                {phone && <p className="rounded-xl bg-white/10 px-3 py-2">{phone}</p>}
                {email && (
                  <p>
                    <a
                      href={`mailto:${email}`}
                      className="block rounded-xl bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      {email}
                    </a>
                  </p>
                )}
              </div>
            )}
            {socials.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 transition-all hover:border-primary hover:bg-primary hover:text-white"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Columns from FOOTER NavigationMenu (or defaults) */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id}>
                <h3 className="text-[10px] font-black uppercase tracking-eyebrow text-white/40">
                  {column.heading}
                </h3>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.url}
                        className="text-sm font-bold text-white/70 transition-colors hover:text-primary"
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
        <div className="relative z-10 mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-xs font-bold text-white/40">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            {paymentsText && (
              <span className="rounded-xl bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60">
                {paymentsText}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
