import type { MetadataRoute } from 'next';

import { getSiteConfig } from '@/lib/config/site-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * robots.txt is admin-gated via Settings.seo.allow_indexing. Turning
 * that off in /admin/settings/seo replies with a universal disallow so
 * crawlers stay out of staging / pre-launch environments.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { settings } = await getSiteConfig();

  if (!settings.seo.allow_indexing) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    };
  }

  const privateRoutes = [
    '/admin/',
    '/api/',
    '/account/',
    '/cart',
    '/checkout/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/_next/',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: privateRoutes },
      { userAgent: 'Googlebot', allow: '/', disallow: privateRoutes },
      { userAgent: 'Bingbot', allow: '/', disallow: privateRoutes },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
