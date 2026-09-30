import { HomePage } from '@/components/home/home-page';
import { getSiteConfig } from '@/lib/config/site-config';

/**
 * Storefront home. The hero / promo banners come from the server-side site
 * config (cached, revalidated on admin edits) so the first paint shows the
 * configured slides; products and categories still load client-side.
 */
export default async function Page() {
  const { banners } = await getSiteConfig();
  return <HomePage heroBanners={banners.hero} sidebarBanners={banners.sidebar} />;
}
