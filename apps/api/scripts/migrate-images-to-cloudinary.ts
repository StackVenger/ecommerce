/**
 * One-shot migration script: moves every non-Cloudinary image URL in the
 * database onto Cloudinary, updates the DB row, and logs successes/failures.
 *
 * Run:
 *   pnpm --filter @ecommerce/api migrate:images
 *   # or directly:
 *   pnpm --filter @ecommerce/api exec tsx scripts/migrate-images-to-cloudinary.ts
 *
 * Accepts:
 *   --dry-run        don't write to Cloudinary or the DB; just print what would happen
 *   --limit=N        stop after migrating N rows per table (sanity check)
 *
 * Env vars required (same as the Cloudinary adapter):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   CLOUDINARY_UPLOAD_FOLDER (optional, default "ecommerce")
 *   DATABASE_URL
 *
 * The script is idempotent — already-migrated URLs (hostname is
 * res.cloudinary.com) are skipped. Source URLs that can't be fetched (404,
 * network errors, local files that no longer exist on this host) are logged
 * and left in place.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { config as loadEnv } from 'dotenv';

// ─── Env bootstrap ────────────────────────────────────────────────────────────

// Load .env.local first (takes precedence), then .env as fallback.
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce';

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    'Missing Cloudinary env vars. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local or .env.',
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

// ─── Flags ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const LIMIT_ARG = argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.slice('--limit='.length), 10) : Infinity;

const prisma = new PrismaClient();

const BASE_TRANSFORMATION = [
  { width: 2000, height: 2000, crop: 'limit' },
  { quality: 'auto:good', fetch_format: 'auto' },
];
const EAGER_PRESETS = [
  { width: 150, crop: 'limit', format: 'webp', quality: 80 },
  { width: 600, crop: 'limit', format: 'webp', quality: 85 },
  { width: 1200, crop: 'limit', format: 'webp', quality: 90 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    return new URL(url).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

function isLocalFileRef(url: string): boolean {
  return (
    url.startsWith('/uploads/') ||
    url.startsWith('uploads/') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  );
}

/**
 * Load image bytes from wherever the URL points:
 *   - absolute http(s) URLs → fetch
 *   - /uploads/... or http://localhost/uploads/... → read from disk
 */
async function loadBytes(url: string): Promise<Buffer | null> {
  try {
    if (isLocalFileRef(url)) {
      const relative = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
      const onDisk = path.resolve(process.cwd(), relative);
      return await fs.readFile(onDisk);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`  ✗ fetch ${url} → HTTP ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } catch (err) {
    console.warn(`  ✗ fetch ${url} → ${(err as Error).message}`);
    return null;
  }
}

function streamUpload(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) {
        reject(err ?? new Error('Cloudinary returned no result'));
        return;
      }
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Upload a buffer to Cloudinary under the given folder and return the
 * delivered secure URL.
 */
async function uploadBuffer(
  buffer: Buffer,
  directory: string,
  originalName: string,
): Promise<string | null> {
  try {
    const res = await streamUpload(buffer, {
      folder: `${UPLOAD_FOLDER}/${directory}`,
      resource_type: 'image',
      transformation: BASE_TRANSFORMATION,
      eager: EAGER_PRESETS,
      format: 'webp',
      use_filename: true,
      filename_override: sanitizeName(originalName),
      overwrite: false,
    });
    return res.secure_url;
  } catch (err) {
    console.warn(`  ✗ upload → ${(err as Error).message}`);
    return null;
  }
}

function sanitizeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return (
    base
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'file'
  );
}

function basenameFromUrl(url: string): string {
  try {
    const u = new URL(url, 'http://x');
    return path.basename(u.pathname) || 'image';
  } catch {
    return path.basename(url) || 'image';
  }
}

// ─── Migration routines ───────────────────────────────────────────────────────

interface Counter {
  scanned: number;
  migrated: number;
  skipped: number;
  failed: number;
}

async function migrateUrl(
  url: string,
  directory: string,
  counter: Counter,
): Promise<string | null> {
  counter.scanned++;
  if (counter.scanned > LIMIT) {
    return null;
  }
  if (isCloudinaryUrl(url)) {
    counter.skipped++;
    return null;
  }
  console.log(`  → ${url}`);
  if (DRY_RUN) {
    counter.migrated++;
    return null;
  }
  const buf = await loadBytes(url);
  if (!buf) {
    counter.failed++;
    return null;
  }
  const newUrl = await uploadBuffer(buf, directory, basenameFromUrl(url));
  if (!newUrl) {
    counter.failed++;
    return null;
  }
  counter.migrated++;
  console.log(`  ✓ ${newUrl}`);
  return newUrl;
}

async function migrateProductImages() {
  console.log('\n— product images —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.productImage.findMany({
    select: { id: true, url: true, thumbnailUrl: true },
  });
  for (const row of rows) {
    const newUrl = await migrateUrl(row.url, 'products', counter);
    let newThumb: string | null | undefined;
    if (row.thumbnailUrl) {
      newThumb = await migrateUrl(row.thumbnailUrl, 'products/thumb', counter);
    }
    if (!DRY_RUN && (newUrl || newThumb)) {
      await prisma.productImage.update({
        where: { id: row.id },
        data: {
          ...(newUrl ? { url: newUrl } : {}),
          ...(newThumb ? { thumbnailUrl: newThumb } : {}),
        },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateBrands() {
  console.log('\n— brands —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.brand.findMany({
    select: { id: true, logo: true, coverImage: true },
  });
  for (const row of rows) {
    let newLogo: string | null | undefined;
    let newCover: string | null | undefined;
    if (row.logo) {
      newLogo = await migrateUrl(row.logo, 'brands', counter);
    }
    if (row.coverImage) {
      newCover = await migrateUrl(row.coverImage, 'brands', counter);
    }
    if (!DRY_RUN && (newLogo || newCover)) {
      await prisma.brand.update({
        where: { id: row.id },
        data: {
          ...(newLogo ? { logo: newLogo } : {}),
          ...(newCover ? { coverImage: newCover } : {}),
        },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateCategories() {
  console.log('\n— categories —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.category.findMany({
    select: { id: true, image: true },
  });
  for (const row of rows) {
    if (!row.image) {
      continue;
    }
    const newUrl = await migrateUrl(row.image, 'categories', counter);
    if (!DRY_RUN && newUrl) {
      await prisma.category.update({
        where: { id: row.id },
        data: { image: newUrl },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateBanners() {
  console.log('\n— banners —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.banner.findMany({
    select: { id: true, image: true, mobileImage: true },
  });
  for (const row of rows) {
    const newImage = await migrateUrl(row.image, 'banners', counter);
    let newMobile: string | null | undefined;
    if (row.mobileImage) {
      newMobile = await migrateUrl(row.mobileImage, 'banners', counter);
    }
    if (!DRY_RUN && (newImage || newMobile)) {
      await prisma.banner.update({
        where: { id: row.id },
        data: {
          ...(newImage ? { image: newImage } : {}),
          ...(newMobile ? { mobileImage: newMobile } : {}),
        },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateUsers() {
  console.log('\n— user avatars —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.user.findMany({
    select: { id: true, avatar: true },
    where: { avatar: { not: null } },
  });
  for (const row of rows) {
    if (!row.avatar) {
      continue;
    }
    const newUrl = await migrateUrl(row.avatar, 'avatars', counter);
    if (!DRY_RUN && newUrl) {
      await prisma.user.update({
        where: { id: row.id },
        data: { avatar: newUrl },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateReviews() {
  console.log('\n— review photos —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const rows = await prisma.review.findMany({
    select: { id: true, images: true },
    where: { images: { isEmpty: false } },
  });
  for (const row of rows) {
    const newImages: string[] = [];
    let changed = false;
    for (const img of row.images ?? []) {
      const nu = await migrateUrl(img, 'reviews', counter);
      if (nu) {
        newImages.push(nu);
        changed = true;
      } else {
        newImages.push(img);
      }
    }
    if (!DRY_RUN && changed) {
      await prisma.review.update({
        where: { id: row.id },
        data: { images: newImages },
      });
    }
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

async function migrateThemeSettings() {
  console.log('\n— theme settings (logoUrl / faviconUrl) —');
  const counter: Counter = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  const settings = await prisma.settings.findUnique({
    where: { group_key: { group: 'THEME', key: 'config' } },
  });
  if (!settings) {
    console.log('  no theme settings row; nothing to do');
    return;
  }
  let theme: Record<string, unknown>;
  try {
    theme = JSON.parse(settings.value) as Record<string, unknown>;
  } catch {
    console.warn('  theme settings JSON malformed; skipping');
    return;
  }
  let changed = false;
  for (const key of ['logoUrl', 'faviconUrl'] as const) {
    const current = theme[key];
    if (typeof current !== 'string' || !current) {
      continue;
    }
    const newUrl = await migrateUrl(current, 'theme', counter);
    if (newUrl) {
      theme[key] = newUrl;
      changed = true;
    }
  }
  if (!DRY_RUN && changed) {
    await prisma.settings.update({
      where: { group_key: { group: 'THEME', key: 'config' } },
      data: { value: JSON.stringify(theme) },
    });
  }
  console.log(`  done: ${JSON.stringify(counter)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `Cloudinary migration starting ${DRY_RUN ? '(DRY RUN) ' : ''}→ folder "${UPLOAD_FOLDER}"`,
  );

  await migrateProductImages();
  await migrateBrands();
  await migrateCategories();
  await migrateBanners();
  await migrateUsers();
  await migrateReviews();
  await migrateThemeSettings();

  console.log('\nMigration complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
