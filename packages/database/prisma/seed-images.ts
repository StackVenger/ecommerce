import { createHash } from 'crypto';
import * as path from 'path';

import { config as loadEnv } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Seed scripts run with cwd=packages/database. Load the API's env files
// explicitly so CLOUDINARY_* + DATABASE_URL are available without a root .env.
loadEnv({ path: path.resolve(__dirname, '../../../apps/api/.env.local') });
loadEnv({ path: path.resolve(__dirname, '../../../apps/api/.env') });

// ---------------------------------------------------------------------------
// Cloudinary upload helper — idempotent, deterministic public_ids.
//
// Given a source URL (Unsplash or any reachable http(s) URL), uploads it to
// Cloudinary under `ecommerce/<folder>/<sha1-12>` with WebP conversion,
// quality-auto compression, and a 2000px size cap. Returns the Cloudinary
// secure_url, or — on failure — the original source URL so seeding still
// completes. Uses `api.resource` first to avoid re-uploading on re-seed.
// ---------------------------------------------------------------------------

const CLOUDINARY_READY =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_READY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const CLOUDINARY_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce';
const uploadCache = new Map<string, string>();

function publicIdFor(sourceUrl: string, folder: string): string {
  const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12);
  return `${CLOUDINARY_FOLDER}/${folder}/${hash}`;
}

export async function seedImage(sourceUrl: string, folder: string): Promise<string> {
  if (!CLOUDINARY_READY) return sourceUrl;

  const cached = uploadCache.get(sourceUrl);
  if (cached) return cached;

  const publicId = publicIdFor(sourceUrl, folder);
  try {
    // Fast path: the asset already exists from a previous seed run.
    const existing = (await cloudinary.api
      .resource(publicId, { resource_type: 'image' })
      .catch(() => null)) as { secure_url?: string } | null;
    if (existing?.secure_url) {
      uploadCache.set(sourceUrl, existing.secure_url);
      return existing.secure_url;
    }

    const result = await cloudinary.uploader.upload(sourceUrl, {
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
      eager: [
        { width: 150, crop: 'limit', format: 'webp', quality: 80 },
        { width: 600, crop: 'limit', format: 'webp', quality: 85 },
        { width: 1200, crop: 'limit', format: 'webp', quality: 90 },
      ],
    });
    uploadCache.set(sourceUrl, result.secure_url);
    return result.secure_url;
  } catch (err) {
    console.warn(
      `  ✗ Cloudinary upload failed for ${sourceUrl}: ${(err as Error).message}. Using source URL.`,
    );
    uploadCache.set(sourceUrl, sourceUrl);
    return sourceUrl;
  }
}

/** Bulk variant — uploads a list in parallel, preserving order. */
export async function seedImages(sourceUrls: string[], folder: string): Promise<string[]> {
  return Promise.all(sourceUrls.map((u) => seedImage(u, folder)));
}

/**
 * For a Cloudinary `secure_url`, inject a width-limited transformation so the
 * returned URL delivers a ~400px thumbnail. Non-Cloudinary URLs are passed
 * through unchanged (happens when CLOUDINARY_READY is false or upload fails
 * and we fell back to the source URL).
 */
export function toThumbnailUrl(url: string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/w_400,c_limit,f_auto,q_auto/');
}
