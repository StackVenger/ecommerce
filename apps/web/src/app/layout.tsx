import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';

import type { Metadata, Viewport } from 'next';

import { getSiteConfig } from '@/lib/config/site-config';
import { themeToCssVars } from '@/lib/theme/css-vars';
import { Providers } from '@/providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  display: 'swap',
  variable: '--font-noto-sans-bengali',
  weight: ['400', '500', '600', '700'],
});

const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

/**
 * Metadata is dynamic so site name, description, OG, favicon and robots
 * all reflect the admin-controlled settings without a rebuild. Falls
 * back to sensible defaults (baked into getSiteConfig) when the API is
 * unreachable, so dev is never blocked on the backend being up.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { settings, theme } = await getSiteConfig();
  const g = settings.general;
  const seo = settings.seo;

  const title = seo.meta_title || g.site_name;
  const titleTemplate = `%s | ${g.site_name}`;
  const description = seo.meta_description || g.site_tagline;
  const ogImage = seo.og_image;

  return {
    title: { default: title, template: titleTemplate },
    description,
    keywords: seo.meta_keywords.length > 0 ? seo.meta_keywords : undefined,
    authors: [{ name: g.site_name }],
    creator: g.site_name,
    publisher: g.site_name,
    manifest: '/manifest.json',
    metadataBase,
    openGraph: {
      type: 'website',
      locale: g.default_language === 'bn' ? 'bn_BD' : 'en_US',
      siteName: g.site_name,
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: seo.allow_indexing
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: g.site_name,
    },
    icons: theme.faviconUrl
      ? {
          icon: theme.faviconUrl,
          apple: theme.faviconUrl,
        }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings, theme } = await getSiteConfig();
  const siteName = settings.general.site_name;
  const faviconUrl = theme.faviconUrl;
  const themeCss = themeToCssVars(theme);
  const customCss = theme.customCSS;

  return (
    <html
      lang={settings.general.default_language || 'en'}
      className={`${inter.variable} ${notoSansBengali.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Admin-set theme tokens; emitted server-side so there is no
            flash between the default palette and the configured one. */}
        <style
          id="site-theme-vars"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeCss }}
        />
        {customCss && (
          <style
            id="site-custom-css"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: customCss }}
          />
        )}
        <link rel="manifest" href="/manifest.json" />
        {faviconUrl ? (
          <link rel="apple-touch-icon" href={faviconUrl} />
        ) : (
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        )}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteName} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextTopLoader color="#0d9488" height={3} showSpinner={false} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
