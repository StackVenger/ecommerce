'use client';

import { X, Upload, ImageIcon, Loader2, FolderTree } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCategory?: Category | null;
  parentId?: string | null;
}

// ──────────────────────────────────────────────────────────
// Slug Generator
// ──────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ──────────────────────────────────────────────────────────
// Category Form Dialog
// ──────────────────────────────────────────────────────────

/**
 * Dialog for creating or editing a category.
 *
 * Supports:
 * - Name (English and Bangla)
 * - Slug auto-generation
 * - Parent category selection
 * - Description
 * - Image upload
 * - Active/Draft toggle
 */
export function CategoryFormDialog({
  isOpen,
  onClose,
  onSuccess,
  editCategory,
  parentId,
}: CategoryFormDialogProps) {
  const isEditing = !!editCategory;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Form State ───────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parentOptions, setParentOptions] = useState<CategoryOption[]>([]);

  // ─── Initialize Form ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      if (editCategory) {
        setName(editCategory.name);
        setNameBn(editCategory.nameBn || '');
        setSlug(editCategory.slug);
        setDescription(editCategory.description || '');
        setImage(editCategory.image);
        setSelectedParentId(editCategory.parentId);
        setIsActive(editCategory.isActive);
        setSortOrder(editCategory.sortOrder);
      } else {
        setName('');
        setNameBn('');
        setSlug('');
        setDescription('');
        setImage(null);
        setSelectedParentId(parentId ?? null);
        setIsActive(true);
        setSortOrder(0);
      }
      setErrors({});
    }
  }, [isOpen, editCategory, parentId]);

  // ─── Load Parent Options ──────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadParents() {
      try {
        const { data } = await apiClient.get('/categories/flat');
        const flat = data.data ?? data ?? [];
        const options: CategoryOption[] = flat.map(
          (cat: { id: string; name: string; depth: number }) => ({
            id: cat.id,
            name: cat.name,
            depth: cat.depth || 0,
          }),
        );
        // Exclude self and children when editing
        if (editCategory) {
          setParentOptions(options.filter((o) => o.id !== editCategory.id));
        } else {
          setParentOptions(options);
        }
      } catch (err) {
        console.error('Failed to load parent categories:', err);
      }
    }
    loadParents();
  }, [isOpen, editCategory]);

  // ─── Image Upload ─────────────────────────────────────────────────

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = data.data ?? data;
      setImage(result.url);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Name Change Handler ──────────────────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  // ─── Validation ───────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Category name is required';
    }
    if (!slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Save Handler ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name,
        nameBn: nameBn || undefined,
        slug,
        description: description || undefined,
        image,
        parentId: selectedParentId,
        isActive,
        sortOrder,
      };

      if (isEditing) {
        await apiClient.patch(`/categories/${editCategory.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save category:', err);
      setErrors({ _form: 'Failed to save category. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
              <FolderTree className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Category' : 'Create Category'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Update category details' : 'Add a new product category'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Error */}
        {errors._form && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors._form}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Category Name (English) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Electronics"
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1',
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500',
              )}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Category Name (Bangla) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name (বাংলা)</label>
            <input
              type="text"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="e.g., ইলেকট্রনিক্স"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Parent Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Parent Category
            </label>
            <select
              value={selectedParentId ?? ''}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">None (Top Level)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {'—'.repeat(option.depth)} {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Category Image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Image</label>
            <div className="flex items-center gap-4">
              {image ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                  <img src={image} alt="Category" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                  <ImageIcon className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
