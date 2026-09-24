'use client';

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  ImageIcon,
  LayoutGrid,
  List,
  Building2,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { RichTextEditor } from '@/components/admin/ui/rich-text-editor';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface Brand {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  logo: string | null;
  website: string | null;
  isActive: boolean;
  productCount: number;
}

interface BrandFormData {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  logo: string | null;
  website: string;
  isActive: boolean;
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
// Brand Card (Grid View)
// ──────────────────────────────────────────────────────────

interface BrandCardProps {
  brand: Brand;
  onEdit: (brand: Brand) => void;
  onDelete: (id: string) => void;
}

function BrandCard({ brand, onEdit, onDelete }: BrandCardProps) {
  return (
    <div className="bento-card group p-5 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        {/* Logo */}
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[12px] border border-foreground/[0.04] bg-gray-50">
          {brand.logo ? (
            <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain p-1" />
          ) : (
            <Building2 className="h-6 w-6 text-gray-300" />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(brand)}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(brand.id)}
            className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-black tracking-tight text-gray-900">{brand.name}</h3>
      {brand.nameBn && <p className="text-xs text-gray-500">{brand.nameBn}</p>}
      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
        {brand.description || 'No description'}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Package className="h-3.5 w-3.5" />
          {brand.productCount} products
        </div>
        <span
          className={cn(
            'pill',
            brand.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500',
          )}
        >
          {brand.isActive ? 'Active' : 'Draft'}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Brand Row (List View)
// ──────────────────────────────────────────────────────────

function BrandRow({ brand, onEdit, onDelete }: BrandCardProps) {
  return (
    <div className="flex items-center gap-4 border-b border-foreground/[0.04] px-6 py-3 last:border-0 hover:bg-gray-50">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-foreground/[0.04] bg-gray-50">
        {brand.logo ? (
          <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain p-0.5" />
        ) : (
          <Building2 className="h-5 w-5 text-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{brand.name}</span>
          {brand.nameBn && <span className="text-xs text-gray-500">({brand.nameBn})</span>}
        </div>
        <p className="truncate text-xs text-gray-500">
          /{brand.slug}
          {brand.website && (
            <>
              {' · '}
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                website
              </a>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Package className="h-3.5 w-3.5" />
        {brand.productCount}
      </div>

      <span
        className={cn(
          'pill',
          brand.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500',
        )}
      >
        {brand.isActive ? 'Active' : 'Draft'}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(brand)}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(brand.id)}
          className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Brand Form Dialog
// ──────────────────────────────────────────────────────────

interface BrandFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBrand?: Brand | null;
}

function BrandFormDialog({ isOpen, onClose, onSuccess, editBrand }: BrandFormDialogProps) {
  const isEditing = !!editBrand;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    nameBn: '',
    slug: '',
    description: '',
    logo: null,
    website: '',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && editBrand) {
      setFormData({
        name: editBrand.name,
        nameBn: editBrand.nameBn || '',
        slug: editBrand.slug,
        description: editBrand.description || '',
        logo: editBrand.logo,
        website: editBrand.website || '',
        isActive: editBrand.isActive,
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        nameBn: '',
        slug: '',
        description: '',
        logo: null,
        website: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [isOpen, editBrand]);

  const updateField = (field: keyof BrandFormData, value: string | boolean | null) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string') {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data.data ?? data;
      setFormData((prev) => ({ ...prev, logo: result.url }));
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast.error(getApiErrorMessage(err, 'Failed to upload logo'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Brand name is required' });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        nameBn: formData.nameBn || undefined,
        website: formData.website || undefined,
      };

      if (isEditing) {
        await apiClient.patch(`/brands/${editBrand.id}`, payload);
      } else {
        await apiClient.post('/brands', payload);
      }

      toast.success(isEditing ? 'Brand updated' : 'Brand created');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save brand:', err);
      toast.error(getApiErrorMessage(err, 'Failed to save brand'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[2rem] bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            {isEditing ? 'Edit Brand' : 'Create Brand'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] border-2 border-dashed border-gray-300 bg-gray-50">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <ImageIcon className="h-6 w-6 text-gray-300" />
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn btn-secondary btn-sm gap-1.5"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Logo'}
              </button>
              {formData.logo && (
                <button
                  onClick={() => updateField('logo', null)}
                  className="ml-2 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="field-label">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Samsung"
              className={cn(
                'field-input w-full',
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-brand-500',
              )}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          {/* Name Bangla */}
          <div>
            <label className="field-label">Name (বাংলা)</label>
            <input
              type="text"
              value={formData.nameBn}
              onChange={(e) => updateField('nameBn', e.target.value)}
              placeholder="e.g., স্যামসাং"
              className="field-input w-full"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="field-label">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              className="field-input w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="field-label">Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => updateField('description', html)}
              ariaLabel="Brand description"
              minHeight={140}
            />
          </div>

          {/* Website */}
          <div>
            <label className="field-label">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://example.com"
              className="field-input w-full"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-foreground/[0.04] pt-4">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Brand'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Admin Brand Management Page
// ──────────────────────────────────────────────────────────

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDialog, setShowDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get('/brands');
      setBrands(data.data ?? data ?? []);
    } catch (err) {
      console.error('Failed to load brands:', err);
      toast.error('Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this brand?',
      description: 'Products under this brand will be unbranded.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/brands/${id}`);
      fetchBrands();
      toast.success('Brand deleted');
    } catch (err) {
      console.error('Failed to delete brand:', err);
      toast.error(getApiErrorMessage(err, 'Failed to delete brand'));
    }
  };

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nameBn?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">Manage your product brands ({brands.length} brands)</p>
        </div>
        <button
          onClick={() => {
            setEditingBrand(null);
            setShowDialog(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Brand
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input w-full pl-11 pr-4"
          />
        </div>

        <div className="flex rounded-2xl border border-foreground/[0.05] bg-card p-1 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            className={cn(
              'rounded-xl p-2 transition-all',
              viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={cn(
              'rounded-xl p-2 transition-all',
              viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50',
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="bento-card py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {searchQuery ? 'No brands match your search.' : 'No brands yet.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBrands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="bento-card">
          {filteredBrands.map((brand) => (
            <BrandRow key={brand.id} brand={brand} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Brand Form Dialog */}
      <BrandFormDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingBrand(null);
        }}
        onSuccess={fetchBrands}
        editBrand={editingBrand}
      />
    </div>
  );
}
