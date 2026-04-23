import Link from 'next/link';

// Static link groups — these are the storefront's universal navigation
// columns. Phase 3 will replace these with menu items fetched from the
// NavigationMenu admin, at which point this component can accept the
// menu data as a prop instead of hardcoding.
const footerLinks = {
  shop: [
    { label: 'All Products', href: '/products' },
    { label: 'Categories', href: '/categories' },
    { label: 'Brands', href: '/brands' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Sale', href: '/products?sale=true' },
  ],
  account: [
    { label: 'My Account', href: '/account' },
    { label: 'Order History', href: '/account/orders' },
    { label: 'Wishlist', href: '/account/wishlist' },
    { label: 'Track Order', href: '/orders/track' },
  ],
  info: [
    { label: 'About Us', href: '/about-us' },
    { label: 'Contact Us', href: '/contact-us' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms-conditions' },
    { label: 'Return Policy', href: '/refund-policy' },
  ],
};

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
  siteName = 'ShopBD',
  tagline = 'Your trusted online shopping destination.',
  taglineBn,
  phone,
  email,
  payments,
  social,
}: FooterProps = {}) {
  const paymentsText = paymentMethodsText(payments);
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

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Shop</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Account
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Information
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.info.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
