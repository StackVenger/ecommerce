/**
 * Result returned after a successful file upload.
 */
export interface UploadResult {
  /** Unique key/path identifying the file in storage */
  key: string;

  /** Full URL to access the file */
  url: string;

  /** Original filename */
  originalName: string;

  /** MIME type of the file */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Storage adapter that handled the upload */
  storage: string;

  /**
   * Per-preset derivative URLs produced natively by the adapter
   * (e.g. Cloudinary eager transformations). When populated, the
   * upload service skips its local sharp + per-variant upload path.
   */
  variantUrls?: Partial<Record<'thumb' | 'medium' | 'large', string>>;

  /** Original image width in pixels, when the adapter has it. */
  originalWidth?: number;

  /** Original image height in pixels, when the adapter has it. */
  originalHeight?: number;

  /**
   * Base64 `data:image/webp;base64,…` blur placeholder, when the
   * adapter can generate one cheaply (e.g. Cloudinary LQIP).
   */
  blurDataUrl?: string | null;
}

/**
 * Options for file upload operations.
 */
export interface UploadOptions {
  /** Subdirectory/prefix for organizing files (e.g., "products", "categories") */
  directory?: string;

  /** Whether the file should be publicly accessible */
  isPublic?: boolean;

  /** Custom filename (without extension) */
  filename?: string;

  /** Content-Type override */
  contentType?: string;

  /** Additional metadata to store with the file */
  metadata?: Record<string, string>;
}

/**
 * Abstraction for file storage backends.
 * Implement this interface to support different storage providers
 * (local filesystem, AWS S3, Google Cloud Storage, etc.).
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage.
   *
   * @param file - The file buffer to upload
   * @param originalName - Original filename from the upload
   * @param mimeType - MIME type of the file
   * @param options - Additional upload options
   * @returns Upload result with file key and URL
   */
  upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage.
   *
   * @param key - The storage key of the file to delete
   * @returns true if the file was deleted, false if not found
   */
  delete(key: string): Promise<boolean>;

  /**
   * Get the public URL for a stored file.
   *
   * @param key - The storage key of the file
   * @returns The public URL to access the file
   */
  getUrl(key: string): string;
}

/**
 * Injection token for the storage adapter.
 */
export const STORAGE_ADAPTER = 'STORAGE_ADAPTER';
