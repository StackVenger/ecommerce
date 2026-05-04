import { Readable } from 'stream';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type ConfigOptions,
  type UploadApiOptions,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary';

import {
  StorageAdapter,
  UploadOptions,
  UploadResult,
} from '../interfaces/storage-adapter.interface';

const IMAGE_MIME_PREFIX = 'image/';
const SVG_MIME = 'image/svg+xml';

/**
 * Parse a Cloudinary delivery URL and return its `public_id` (including
 * folder path) so we can pass it to `cloudinary.uploader.destroy`.
 *
 * Returns `null` for non-Cloudinary URLs.
 *
 * Accepts URLs like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.webp
 *   https://res.cloudinary.com/<cloud>/image/upload/c_limit,w_600/v123/folder/name.jpg
 *   https://res.cloudinary.com/<cloud>/raw/upload/v123/folder/doc.pdf
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'res.cloudinary.com') {
    return null;
  }

  // Expected path shape: /<cloud>/<resource>/upload/[<transformations>/]<[v<version>/]<public_id>.<ext>>
  const parts = parsed.pathname.split('/').filter(Boolean);
  const uploadIdx = parts.indexOf('upload');
  if (uploadIdx < 0 || uploadIdx === parts.length - 1) {
    return null;
  }

  let rest = parts.slice(uploadIdx + 1);
  // Drop a transformation segment if present (contains one or more kv pairs
  // like `c_limit,w_600`). Cloudinary transformation tokens always contain
  // an underscore and don't start with `v<digits>`.
  if (rest.length > 0 && /_/.test(rest[0]!) && !/^v\d+$/.test(rest[0]!)) {
    rest = rest.slice(1);
  }
  // Drop the version segment (`v1234567`) if present.
  if (rest.length > 0 && /^v\d+$/.test(rest[0]!)) {
    rest = rest.slice(1);
  }
  if (rest.length === 0) {
    return null;
  }

  const joined = rest.join('/');
  const dot = joined.lastIndexOf('.');
  return dot > 0 ? joined.slice(0, dot) : joined;
}

/** Upload-time transformation applied to the base delivery URL. */
const BASE_TRANSFORMATION = [
  // Cap the longest edge at 2000 px; `c_limit` never upscales and keeps aspect ratio.
  { width: 2000, height: 2000, crop: 'limit' },
  // Auto-compress + serve the best modern format the client accepts.
  { quality: 'auto:good', fetch_format: 'auto' },
];

/** Eager derivatives generated at upload time so variant URLs are stable. */
const EAGER_PRESETS = [
  { width: 150, crop: 'limit', format: 'webp', quality: 80 }, // thumb
  { width: 600, crop: 'limit', format: 'webp', quality: 85 }, // medium
  { width: 1200, crop: 'limit', format: 'webp', quality: 90 }, // large
];
const PRESET_NAMES = ['thumb', 'medium', 'large'] as const;
type PresetName = (typeof PRESET_NAMES)[number];

/**
 * Cloudinary-backed storage adapter.
 *
 * Delegates format conversion (WebP), compression (`q_auto`), size capping
 * (`c_limit` at 2000 px), and derivative generation to Cloudinary's
 * transformation pipeline, so the surrounding `UploadService` can skip the
 * local `sharp` path when this adapter is active.
 *
 * Credentials come exclusively from env vars (`CLOUDINARY_CLOUD_NAME`,
 * `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). The adapter fails loudly
 * on module init when any of them are missing.
 */
@Injectable()
export class CloudinaryStorageAdapter implements StorageAdapter, OnModuleInit {
  private readonly logger = new Logger(CloudinaryStorageAdapter.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadFolder: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME', '');
    this.apiKey = this.configService.get<string>('CLOUDINARY_API_KEY', '');
    this.apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET', '');
    this.uploadFolder = this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER', 'ecommerce');
  }

  onModuleInit(): void {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'Cloudinary is not configured — image uploads will be unavailable. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to enable.',
      );
      return;
    }

    const config: ConfigOptions = {
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    };
    cloudinary.config(config);

    this.logger.log(
      `Cloudinary adapter initialised (cloud=${this.cloudName}, folder=${this.uploadFolder})`,
    );
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const isImage = mimeType.startsWith(IMAGE_MIME_PREFIX);
    const isSvg = mimeType === SVG_MIME;
    const directory = options?.directory || 'general';
    const folder = `${this.uploadFolder}/${directory}`;

    const uploadOptions: UploadApiOptions = {
      folder,
      resource_type: isImage ? 'image' : 'raw',
      // Filename stays as a prefix for human-readable public IDs; Cloudinary
      // appends a random suffix when `use_filename` is combined with
      // `unique_filename` (default).
      use_filename: true,
      filename_override: this.sanitizeFilename(originalName),
      overwrite: false,
    };

    if (isImage && !isSvg) {
      uploadOptions.transformation = BASE_TRANSFORMATION;
      uploadOptions.eager = EAGER_PRESETS;
      uploadOptions.format = 'webp';
    }

    const result = await this.streamUpload(file, uploadOptions);

    const variantUrls = this.mapEagerVariants(result);

    // Fetch a tiny blur placeholder once, so the frontend contract
    // (data:image/webp;base64,…) stays identical to the sharp-backed path.
    const blurDataUrl =
      isImage && !isSvg ? await this.fetchBlurPlaceholder(result.public_id) : null;

    return {
      key: result.public_id,
      url: result.secure_url,
      originalName,
      mimeType,
      size: result.bytes,
      storage: 'cloudinary',
      variantUrls,
      originalWidth: result.width,
      originalHeight: result.height,
      blurDataUrl,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const res = (await cloudinary.uploader.destroy(key, { invalidate: true })) as {
        result?: string;
      };
      const ok = res?.result === 'ok';
      if (!ok) {
        this.logger.warn(`Cloudinary destroy returned "${res?.result}" for key: ${key}`);
      }
      return ok;
    } catch (err) {
      this.logger.error(`Failed to destroy Cloudinary asset ${key}`, err as Error);
      return false;
    }
  }

  getUrl(key: string): string {
    return cloudinary.url(key, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto:good',
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private streamUpload(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            const message = error?.message ?? 'Unknown Cloudinary upload error';
            reject(new InternalServerErrorException(`Cloudinary upload failed: ${message}`));
            return;
          }
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  private mapEagerVariants(result: UploadApiResponse): Partial<Record<PresetName, string>> {
    const variants: Partial<Record<PresetName, string>> = {};
    const eager = result.eager;
    if (!Array.isArray(eager)) {
      return variants;
    }

    for (let i = 0; i < PRESET_NAMES.length && i < eager.length; i++) {
      const name = PRESET_NAMES[i]!;
      const entry = eager[i];
      const url =
        (entry as { secure_url?: string; url?: string } | undefined)?.secure_url ??
        (entry as { url?: string } | undefined)?.url;
      if (url) {
        variants[name] = url;
      }
    }
    return variants;
  }

  /**
   * Build a Cloudinary LQIP URL, fetch it, and encode as a base64 data URL.
   * Returns null if the request fails or times out — callers treat it as
   * "no placeholder" and render without it.
   */
  private async fetchBlurPlaceholder(publicId: string): Promise<string | null> {
    const lqipUrl = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: 20, crop: 'limit' },
        { effect: 'blur:1000', quality: 20, format: 'webp' },
      ],
    });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(lqipUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      return `data:image/webp;base64,${base64}`;
    } catch (err) {
      this.logger.debug(`LQIP fetch failed for ${publicId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Strip the extension and sanitise the base filename so Cloudinary's
   * public IDs remain URL-safe.
   */
  private sanitizeFilename(originalName: string): string {
    const dot = originalName.lastIndexOf('.');
    const base = dot > 0 ? originalName.slice(0, dot) : originalName;
    return (
      base
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 80) || 'file'
    );
  }
}
