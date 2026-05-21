import { AccountShell } from './account-shell';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { getSiteConfig } from '@/lib/config/site-config';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Load admin-controlled branding so the account header/footer match the
  // rest of the storefront instead of falling back to the "ShopBD" default.
  const config = await getSiteConfig();
  const g = config.settings.general;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header siteName={g.site_name} logoUrl={config.theme.logoUrl} menu={config.menus.header} />
      <AccountShell>{children}</AccountShell>
      <Footer
        siteName={g.site_name}
        tagline={g.site_tagline}
        taglineBn={g.site_tagline_bn}
        phone={g.phone}
        email={g.support_email}
        payments={config.settings.payment}
        menu={config.menus.footer}
        social={config.settings.social}
      />
    </div>
  );
}
