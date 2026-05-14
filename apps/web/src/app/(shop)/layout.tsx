import { type ReactNode } from 'react';

import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { FooterBanners } from '@/components/layout/footer-banners';
import { Header } from '@/components/layout/header';
import { getSiteConfig } from '@/lib/config/site-config';

interface ShopLayoutProps {
  children: ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
  const config = await getSiteConfig();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar
        enabled={config.settings.general.announcement_enabled}
        text={config.settings.general.announcement_text}
        textBn={config.settings.general.announcement_text_bn}
      />
      <Header
        siteName={config.settings.general.site_name}
        logoUrl={config.theme.logoUrl}
        menu={config.menus.header}
      />
      <main className="flex-1">{children}</main>
      <FooterBanners banners={config.banners.footer} />
      <Footer
        siteName={config.settings.general.site_name}
        tagline={config.settings.general.site_tagline}
        taglineBn={config.settings.general.site_tagline_bn}
        phone={config.settings.general.phone}
        email={config.settings.general.support_email}
        payments={config.settings.payment}
        menu={config.menus.footer}
        social={config.settings.social}
      />
    </div>
  );
}
