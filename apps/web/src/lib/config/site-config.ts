import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * Server-side loader for everything the storefront shell needs to render
 * a page: public settings (site identity, currency, feature flags), the
 * active theme (colors, fonts, logo, favicon), and the header/footer
 * menus. We fetch in parallel and cache with tags so admin mutations can
 * purge precisely.
 *
 * Consumers are server components and server-only helpers (sitemap,
 * robots, generateMetadata). Do not import from a client component —
 * that will break the `server-only` barrier.
 */

export interface PublicSettings {
  general: {
    site_name: string;
    site_name_bn: string;
    site_tagline: string;
    site_tagline_bn: string;
    currency: string;
    currency_symbol: string;
    currency_position: 'before' | 'after';
    default_language: string;
    supported_languages: string[];
    timezone: string;
    date_format: string;
    phone: string;
    support_email: string;
    address: string;
    return_policy_days: number;
    announcement_text: string;
    announcement_text_bn: string;
    announcement_enabled: boolean;
    home_sections: unknown;
  };
  shipping: {
    free_shipping_threshold: number;
    enable_free_shipping: boolean;
  };
  tax: {
    vat_percentage: number;
    vat_included_in_price: boolean;
    enable_tax: boolean;
  };
  payment: {
    enable_cod: boolean;
    enable_bkash: boolean;
    enable_nagad: boolean;
    enable_rocket: boolean;
    enable_stripe: boolean;
    cod_extra_charge: number;
    min_order_amount: number;
    max_cod_amount: number;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string[];
    og_image: string;
    google_analytics_id: string;
    facebook_pixel_id: string;
    allow_indexing: boolean;
  };
  social: {
    facebook_url: string;
    instagram_url: string;
    youtube_url: string;
    twitter_url: string;
    tiktok_url: string;
    whatsapp_number: string;
  };
}

export interface ThemeConfig {
  colors: Record<string, string>;
  typography: Record<string, string>;
  borders: Record<string, string>;
  layout: Record<string, string>;
  customCSS?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  labelBn?: string | null;
  url: string;
  icon?: string;
  target?: string;
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  name: string;
  location: string;
  items: MenuItem[];
}

export interface Banner {
  id: string;
  title: string;
  titleBn?: string | null;
  image: string;
  mobileImage?: string | null;
  link?: string | null;
  position: string;
  sortOrder: number;
}

export interface SiteConfig {
  settings: PublicSettings;
  theme: ThemeConfig;
  menus: {
    header: Menu | null;
    footer: Menu | null;
    mobile: Menu | null;
  };
  banners: {
    hero: Banner[];
    sidebar: Banner[];
    announcement: Banner[];
  };
}

// ---------------------------------------------------------------------
// Env + URL helpers
// ---------------------------------------------------------------------

/**
 * Resolve the API base URL for server-to-server calls. Prefer `API_URL`
 * (private, can point at localhost in dev), fall back to
 * `NEXT_PUBLIC_API_URL` so one env works for both sides.
 */
function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

async function fetchJson<T>(path: string, tag: string): Promise<T | null> {
  const url = `${apiBaseUrl()}${path}`;
  try {
    const res = await fetch(url, {
      next: { tags: [tag], revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Defaults — used when the API is unreachable or a key is missing.
// Keeps SSR working during dev startup before the API comes up.
// ---------------------------------------------------------------------

const DEFAULT_SETTINGS: PublicSettings = {
  general: {
    site_name: 'ShopBD',
    site_name_bn: 'শপবিডি',
    site_tagline: "Bangladesh's Trusted Online Shop",
    site_tagline_bn: 'বাংলাদেশের বিশ্বস্ত অনলাইন শপ',
    currency: 'BDT',
    currency_symbol: '৳',
    currency_position: 'before',
    default_language: 'en',
    supported_languages: ['en', 'bn'],
    timezone: 'Asia/Dhaka',
    date_format: 'DD/MM/YYYY',
    phone: '',
    support_email: '',
    address: '',
    return_policy_days: 7,
    announcement_text: '',
    announcement_text_bn: '',
    announcement_enabled: false,
    home_sections: null,
  },
  shipping: { free_shipping_threshold: 2000, enable_free_shipping: true },
  tax: { vat_percentage: 15, vat_included_in_price: true, enable_tax: false },
  payment: {
    enable_cod: true,
    enable_bkash: true,
    enable_nagad: true,
    enable_rocket: true,
    enable_stripe: false,
    cod_extra_charge: 0,
    min_order_amount: 0,
    max_cod_amount: 50000,
  },
  seo: {
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    og_image: '',
    google_analytics_id: '',
    facebook_pixel_id: '',
    allow_indexing: true,
  },
  social: {
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
    twitter_url: '',
    tiktok_url: '',
    whatsapp_number: '',
  },
};

const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: '#0f766e',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#0f172a',
  },
  typography: { bodyFont: 'Inter', banglaFont: 'Noto Sans Bengali' },
  borders: { radius: '0.5rem' },
  layout: {},
};

// ---------------------------------------------------------------------
// Cached getters — each keyed so admin can invalidate one without the rest.
// ---------------------------------------------------------------------

export const getPublicSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    const payload = await fetchJson<{ data: PublicSettings }>('/settings/public', 'settings');
    return payload?.data ?? DEFAULT_SETTINGS;
  },
  ['public-settings'],
  { tags: ['site-config', 'settings'], revalidate: 300 },
);

export const getTheme = unstable_cache(
  async (): Promise<ThemeConfig> => {
    const payload = await fetchJson<ThemeConfig>('/theme', 'theme');
    return payload ?? DEFAULT_THEME;
  },
  ['theme-config'],
  { tags: ['site-config', 'theme'], revalidate: 300 },
);

export const getMenuByLocation = unstable_cache(
  async (location: 'HEADER' | 'FOOTER' | 'MOBILE'): Promise<Menu | null> => {
    const payload = await fetchJson<{ data: Menu }>(`/menus/${location}`, 'menus');
    return payload?.data ?? null;
  },
  ['menu-by-location'],
  { tags: ['site-config', 'menus'], revalidate: 300 },
);

export const getBannersByPosition = unstable_cache(
  async (position: 'HERO' | 'SIDEBAR' | 'FOOTER' | 'POPUP' | 'ANNOUNCEMENT'): Promise<Banner[]> => {
    const payload = await fetchJson<{ data: Banner[] }>(`/banners?position=${position}`, 'banners');
    return payload?.data ?? [];
  },
  ['banners-by-position'],
  { tags: ['site-config', 'banners'], revalidate: 300 },
);

/**
 * Fetch everything the shell needs in one go. Anything that fails
 * individually degrades to its default; a missing API does not take down
 * the storefront.
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  const [
    settings,
    theme,
    headerMenu,
    footerMenu,
    mobileMenu,
    heroBanners,
    sidebarBanners,
    announcementBanners,
  ] = await Promise.all([
    getPublicSettings(),
    getTheme(),
    getMenuByLocation('HEADER'),
    getMenuByLocation('FOOTER'),
    getMenuByLocation('MOBILE'),
    getBannersByPosition('HERO'),
    getBannersByPosition('SIDEBAR'),
    getBannersByPosition('ANNOUNCEMENT'),
  ]);

  return {
    settings,
    theme,
    menus: { header: headerMenu, footer: footerMenu, mobile: mobileMenu },
    banners: {
      hero: heroBanners,
      sidebar: sidebarBanners,
      announcement: announcementBanners,
    },
  };
}
