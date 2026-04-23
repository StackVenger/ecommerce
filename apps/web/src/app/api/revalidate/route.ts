import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Admin-triggered cache invalidation webhook.
 *
 * The NestJS API calls this whenever an admin mutation (Settings, Theme,
 * Banner, Page, Menu, Category, Brand, Product) lands, so the storefront
 * picks up the change on the next request instead of waiting for the
 * background revalidation window to tick. Using tags lets us invalidate
 * many routes at once — e.g. flipping `site-config` re-renders every page
 * that calls `getSiteConfig()`.
 *
 * Body (either or both fields may be present):
 *   { tags?: string[]; paths?: string[] }
 *
 * Auth: `x-revalidate-secret` header must match `REVALIDATE_SECRET`.
 * Without the env var set, the endpoint refuses all requests — we do not
 * want a public cache-purger in production.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET is not configured' }, { status: 500 });
  }

  const provided = request.headers.get('x-revalidate-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string')
    : [];
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string')
    : [];

  for (const tag of tags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    revalidated: true,
    tags,
    paths,
    now: Date.now(),
  });
}
