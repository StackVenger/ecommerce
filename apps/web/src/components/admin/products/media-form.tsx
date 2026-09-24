'use client';

import {
  Upload,
  X,
  GripVertical,
  Star,
  StarOff,
  ImageIcon,
  FileImage,
  Loader2,
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface MediaFormProps {
  images: string[];
  onChange: (images: string[]) => void;
  primaryIndex?: number;
  onPrimaryChange?: (index: number) => void;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  preview: string;
}

// ──────────────────────────────────────────────────────────
// Media Upload Form
// ──────────────────────────────────────────────────────────

/**
 * Product media upload form with drag-and-drop support.
 *
 * Features:
 * - Drag-and-drop file upload
 * - Image gallery with thumbnails
 * - Drag-to-reorder images
 * - Primary image selection
 * - Image removal
 */
export function MediaForm({ images, onChange, primaryIndex = 0, onPrimaryChange }: MediaFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File Upload ──────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string | null> => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create preview
    const preview = URL.createObjectURL(file);
    setUploadingFiles((prev) => [...prev, { id: uploadId, name: file.name, progress: 0, preview }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === uploadId ? { ...f, progress } : f)),
          );
        },
      });

      const result = data.data ?? data;
      return result.url;
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Image upload failed');
      return null;
    } finally {
      setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
      URL.revokeObjectURL(preview);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));

    if (fileArray.length === 0) {
      return;
    }

    const uploadedUrls: string[] = [];
    for (const file of fileArray) {
      const url = await uploadFile(file);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }
  };

  // ─── Drag & Drop Upload ───────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [images],
  );

  // ─── Reorder ──────────────────────────────────────────────────────

  const handleReorderDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleReorderDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...images];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved ?? '');
    onChange(reordered);

    // Update primary index if needed
    if (onPrimaryChange) {
      if (draggedIndex === primaryIndex) {
        onPrimaryChange(targetIndex);
      } else if (draggedIndex < primaryIndex && targetIndex >= primaryIndex) {
        onPrimaryChange(primaryIndex - 1);
      } else if (draggedIndex > primaryIndex && targetIndex <= primaryIndex) {
        onPrimaryChange(primaryIndex + 1);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ─── Remove Image ─────────────────────────────────────────────────

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);

    if (onPrimaryChange && index === primaryIndex) {
      onPrimaryChange(0);
    } else if (onPrimaryChange && index < primaryIndex) {
      onPrimaryChange(primaryIndex - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <FileImage className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Product Images</h2>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
          )}
        >
          <Upload
            className={cn('mx-auto h-10 w-10', isDragging ? 'text-brand-500' : 'text-gray-400')}
          />
          <p className="mt-3 text-sm font-medium text-gray-700">
            {isDragging ? 'Drop images here...' : 'Drag and drop images, or click to browse'}
          </p>
          <p className="field-hint">
            PNG, JPG, WebP up to 5MB each. Recommended: 1000x1000px or larger.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Uploading Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-[1.5rem] border border-foreground/[0.05] p-3"
              >
                <img
                  src={file.preview}
                  alt={file.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{file.name}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              </div>
            ))}
          </div>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-gray-700">
              {images.length} image{images.length !== 1 ? 's' : ''} — drag to reorder
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  draggable
                  onDragStart={() => handleReorderDragStart(index)}
                  onDragOver={(e) => handleReorderDragOver(e, index)}
                  onDrop={() => handleReorderDrop(index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border-2 bg-gray-50 transition-all',
                    dragOverIndex === index
                      ? 'border-brand-400 scale-105'
                      : index === primaryIndex
                        ? 'border-brand-500'
                        : 'border-gray-200',
                    draggedIndex === index && 'opacity-50',
                  )}
                >
                  <img
                    src={url}
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />

                  {/* Primary badge */}
                  {index === primaryIndex && (
                    <span className="pill absolute left-2 top-2 bg-brand-600 text-white">
                      Primary
                    </span>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrimaryChange?.(index);
                      }}
                      className="rounded-xl bg-card/90 p-2 text-gray-700 hover:bg-card transition-all"
                      title={index === primaryIndex ? 'Primary image' : 'Set as primary'}
                    >
                      {index === primaryIndex ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="rounded-xl bg-card/90 p-2 text-red-600 hover:bg-card transition-all"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Drag handle */}
                  <div className="absolute bottom-2 right-2 rounded bg-card/80 p-1 opacity-0 shadow-sm group-hover:opacity-100">
                    <GripVertical className="h-3 w-3 text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && uploadingFiles.length === 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No images uploaded yet. Add images to showcase your product.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
