import { type ReactNode } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { getSiteConfig } from '@/lib/config/site-config';

interface ShopLayoutProps {
  children: ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
  const config = await getSiteConfig();

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={config.settings.general.site_name} logoUrl={config.theme.logoUrl} />
      <main className="flex-1">{children}</main>
      <Footer
        siteName={config.settings.general.site_name}
        tagline={config.settings.general.site_tagline}
        taglineBn={config.settings.general.site_tagline_bn}
        phone={config.settings.general.phone}
        email={config.settings.general.support_email}
        payments={config.settings.payment}
        social={config.settings.social}
      />
    </div>
  );
}
