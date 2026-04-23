import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface SitemapEntry {
  slug: string;
  updatedAt: string;
}

/** Resolve the API base URL for server-to-server calls. */
function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

/**
 * Pull a list of `{ slug, updatedAt }` for a collection. The API may
 * either expose a dedicated `/sitemap` sub-resource or return the full
 * list. In both cases we project to the minimal shape the Next sitemap
 * needs, and we tag the fetch so the revalidate webhook invalidates
 * sitemap.xml whenever the corresponding resource is edited.
 */
async function fetchList(
  path: string,
  tag: string,
  fallback: SitemapEntry[] = [],
): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      next: { tags: [tag, 'sitemap'], revalidate: 3600 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return fallback;
    }
    const raw = (await res.json()) as unknown;
    const list = normaliseList(raw);
    return list.length > 0 ? list : fallback;
  } catch {
    return fallback;
  }
}

function normaliseList(raw: unknown): SitemapEntry[] {
  // Accept `[...]`, `{ data: [...] }`, `{ products: [...] }`, etc.
  let arr: unknown[] | null = null;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) {
        arr = v;
        break;
      }
    }
  }
  if (!arr) {
    return [];
  }
  return arr
    .map((item): SitemapEntry | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const r = item as Record<string, unknown>;
      const slug = typeof r.slug === 'string' ? r.slug : null;
      const updatedAt =
        typeof r.updatedAt === 'string'
          ? r.updatedAt
          : typeof r.createdAt === 'string'
            ? r.createdAt
            : new Date().toISOString();
      if (!slug) {
        return null;
      }
      return { slug, updatedAt };
    })
    .filter((x): x is SitemapEntry => x !== null);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, pages] = await Promise.all([
    fetchList('/products?limit=500', 'products'),
    fetchList('/categories/flat', 'categories'),
    fetchList('/brands?limit=200', 'brands'),
    fetchList('/admin/pages?status=PUBLISHED&limit=200', 'pages'),
  ]);

  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/deals`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ];

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categories/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const brandUrls: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${SITE_URL}/brands/${b.slug}`,
    lastModified: new Date(b.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const pageUrls: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticPages, ...productUrls, ...categoryUrls, ...brandUrls, ...pageUrls];
}
