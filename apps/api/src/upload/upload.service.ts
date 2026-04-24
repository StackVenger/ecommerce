import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';

import { extractCloudinaryPublicId } from './adapters/cloudinary-storage.adapter';
import { ImageProcessingService, ImageProcessingResult } from './image-processing.service';
import {
  StorageAdapter,
  UploadResult,
  UploadOptions,
  STORAGE_ADAPTER,
} from './interfaces/storage-adapter.interface';

/**
 * Allowed MIME types for file uploads.
 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

/**
 * Maximum file sizes (in bytes).
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Extended upload result that includes processed image variants.
 */
export interface ImageUploadResult extends UploadResult {
  variants: {
    thumb: UploadResult;
    medium: UploadResult;
    large: UploadResult;
  };
  blurDataUrl: string | null;
  originalWidth: number;
  originalHeight: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Upload a single file with validation.
   *
   * @param file - File buffer
   * @param originalName - Original filename
   * @param mimeType - MIME type of the file
   * @param options - Upload options (directory, public access, etc.)
   * @returns Upload result with URL and metadata
   */
  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // Validate MIME type
    if (!ALL_ALLOWED_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `File type "${mimeType}" is not allowed. Allowed types: ${ALL_ALLOWED_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    const maxSize = ALLOWED_IMAGE_TYPES.includes(mimeType) ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;

    if (file.length > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      throw new BadRequestException(`File size exceeds the maximum allowed size of ${maxMB} MB`);
    }

    // Sanitize original filename
    const sanitizedName = this.sanitizeFilename(originalName);

    this.logger.log(
      `Uploading file: ${sanitizedName} (${mimeType}, ${this.formatFileSize(file.length)})`,
    );

    const result = await this.storageAdapter.upload(file, sanitizedName, mimeType, options);

    this.logger.log(`File uploaded successfully: ${result.key}`);

    return result;
  }

  /**
   * Upload an image with automatic processing: resize to multiple variants,
   * convert to WebP, and generate a blur hash placeholder.
   *
   * @param file - Original image buffer
   * @param originalName - Original filename
   * @param mimeType - MIME type (must be an image type)
   * @param options - Upload options
   * @returns Upload result including all generated variants
   */
  async uploadImage(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<ImageUploadResult> {
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid image type "${mimeType}". Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    const directory = options?.directory || 'images';

    // Upload original
    const original = await this.uploadFile(file, originalName, mimeType, {
      ...options,
      directory,
    });

    // Fast path: if the active storage adapter natively produced WebP
    // variants (Cloudinary), skip the sharp pipeline and its second-round
    // uploads. Variants live on the same remote asset lifecycle and are
    // served via URL transformations.
    const adapterVariantUrls = original.variantUrls;
    if (adapterVariantUrls?.thumb && adapterVariantUrls.medium && adapterVariantUrls.large) {
      const makeVariant = (name: 'thumb' | 'medium' | 'large', url: string): UploadResult => ({
        key: `${original.key}/${name}`,
        url,
        originalName,
        mimeType: 'image/webp',
        size: 0,
        storage: original.storage,
      });

      this.logger.log(
        `Image uploaded via ${original.storage} with native variant URLs: ${original.key}`,
      );

      return {
        ...original,
        variants: {
          thumb: makeVariant('thumb', adapterVariantUrls.thumb),
          medium: makeVariant('medium', adapterVariantUrls.medium),
          large: makeVariant('large', adapterVariantUrls.large),
        },
        blurDataUrl: original.blurDataUrl ?? null,
        originalWidth: original.originalWidth ?? 0,
        originalHeight: original.originalHeight ?? 0,
      };
    }

    // Fallback path (local / S3): resize with sharp and upload each variant.
    const processed: ImageProcessingResult = await this.imageProcessingService.processImage(file);

    const variantResults: Record<string, UploadResult> = {};

    for (const variant of processed.variants) {
      const variantName = `${this.stripExtension(originalName)}-${variant.name}.webp`;
      const variantResult = await this.storageAdapter.upload(
        variant.buffer,
        variantName,
        'image/webp',
        { ...options, directory: `${directory}/${variant.name}` },
      );
      variantResults[variant.name] = variantResult;
    }

    this.logger.log(`Image uploaded with ${processed.variants.length} variants: ${original.key}`);

    return {
      ...original,
      variants: {
        thumb: variantResults['thumb'],
        medium: variantResults['medium'],
        large: variantResults['large'],
      },
      blurDataUrl: processed.blurDataUrl,
      originalWidth: processed.originalWidth,
      originalHeight: processed.originalHeight,
    };
  }

  /**
   * Delete a file from storage.
   */
  async deleteFile(key: string): Promise<boolean> {
    this.logger.log(`Deleting file: ${key}`);
    const result = await this.storageAdapter.delete(key);

    if (!result) {
      this.logger.warn(`File not found for deletion: ${key}`);
    }

    return result;
  }

  /**
   * Delete multiple files from storage.
   */
  async deleteFiles(keys: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const result = await this.storageAdapter.delete(key);
        if (result) {
          deleted++;
        } else {
          failed++;
        }
      } catch (error) {
        this.logger.error(`Failed to delete file: ${key}`, error);
        failed++;
      }
    }

    this.logger.log(
      `Bulk delete: ${deleted} deleted, ${failed} failed out of ${keys.length} files`,
    );

    return { deleted, failed };
  }

  /**
   * Get the URL for a stored file.
   */
  getFileUrl(key: string): string {
    return this.storageAdapter.getUrl(key);
  }

  /**
   * Best-effort delete by URL — used by services that only know the DB-stored
   * URL (not the storage key). Currently maps Cloudinary URLs → public_id and
   * delegates to the adapter; returns false silently for unrecognised URLs.
   *
   * Never throws — image cleanup is a secondary concern that must not roll
   * back the primary DB mutation if Cloudinary is flaky.
   */
  async deleteByUrl(url: string | null | undefined): Promise<boolean> {
    if (!url) {
      return false;
    }
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) {
      return false;
    }
    try {
      return await this.storageAdapter.delete(publicId);
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset for ${url}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Bulk variant of `deleteByUrl`. Runs in parallel; individual failures are
   * logged but never propagate.
   */
  async deleteByUrls(urls: Array<string | null | undefined>): Promise<void> {
    await Promise.all(urls.map((u) => this.deleteByUrl(u)));
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Sanitize a filename to remove potentially dangerous characters.
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Format file size for human-readable logging.
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Strip the file extension from a filename.
   */
  private stripExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  }
}
