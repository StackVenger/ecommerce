import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/bento';
import { getSiteConfig } from '@/lib/config/site-config';

interface CmsPageProps {
  params: { slug: string };
}

/** Shape returned by GET /pages/:slug — the parts we actually render. */
interface ApiPage {
  id: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  content: string;
  contentBn?: string | null;
  excerpt?: string | null;
  featuredImage?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle?: string | null;
  metaDescription?: string | null;
  updatedAt: string;
}

/** Resolve the API base URL for server-to-server calls. */
function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

/**
 * Fetch a CMS page by slug. Uses Next's tagged cache so admin edits
 * invalidate via the /api/revalidate webhook on tag `pages`. DRAFT /
 * ARCHIVED pages resolve to null so we never render them.
 */
async function getCmsPage(slug: string): Promise<ApiPage | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/pages/${slug}`, {
      next: { tags: ['pages', `page:${slug}`], revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return null;
    }
    const payload = (await res.json()) as { data?: ApiPage } | ApiPage;
    const page = 'data' in payload && payload.data ? payload.data : (payload as ApiPage);
    if (!page || page.status !== 'PUBLISHED') {
      return null;
    }
    return page;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const page = await getCmsPage(params.slug);
  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? page.excerpt ?? undefined,
  };
}

/**
 * Catch-all CMS page renderer for /about-us, /privacy-policy,
 * /terms-conditions, and any slug the admin creates in /admin/pages.
 *
 * Content is stored as HTML in the DB, written by the admin's rich-text
 * editor. Rendering via `dangerouslySetInnerHTML` is intentional — the
 * admin is the trusted author. If this ever changes (e.g. multi-tenant
 * authoring), sanitize server-side with isomorphic-dompurify before the
 * render. Consider that a Phase-8 gate.
 */
export default async function CmsPage({ params }: CmsPageProps) {
  const page = await getCmsPage(params.slug);
  if (!page) {
    notFound();
  }

  const { settings } = await getSiteConfig();
  const locale = settings.general.default_language === 'bn' ? 'bn' : 'en';

  const title = locale === 'bn' && page.titleBn ? page.titleBn : page.title;
  const content = locale === 'bn' && page.contentBn ? page.contentBn : page.content;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />
      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="shop-heading sm:text-[1.75rem]">{title}</h1>
            <p className="mt-4 text-[13px] text-gray-500">
              Last updated:{' '}
              {new Date(page.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </header>
          <article
            className="prose max-w-none text-[15px] leading-relaxed prose-headings:font-heading prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-li:text-gray-600 prose-li:marker:text-primary prose-img:rounded-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </>
  );
}
