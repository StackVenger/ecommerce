'use client';

import {
  Save,
  ArrowLeft,
  Info,
  DollarSign,
  ImageIcon,
  Layers,
  Tag,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CategorizationForm } from '@/components/admin/products/categorization-form';
import { MediaForm } from '@/components/admin/products/media-form';
import { PricingForm } from '@/components/admin/products/pricing-form';
import { SeoForm } from '@/components/admin/products/seo-form';
import { VariantsForm } from '@/components/admin/products/variants-form';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { RichTextEditor } from '@/components/admin/ui/rich-text-editor';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface ProductFormData {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  descriptionBn: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  quantity: number;
  lowStockThreshold: number;
  weight: number | null;
  categoryId: string;
  brandId: string;
  tags: string[];
  images: string[];
  status: string;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  options: OptionType[];
  variants: Variant[];
}

interface OptionType {
  id: string;
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  options: Record<string, string>;
  price: number | null;
  stock: number;
  sku: string;
  isActive: boolean;
  isDefault?: boolean;
  imageUrls?: string[];
}

// ──────────────────────────────────────────────────────────
// Tabs
// ──────────────────────────────────────────────────────────

type TabId = 'basic' | 'pricing' | 'media' | 'variants' | 'categorization' | 'seo';

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'basic', label: 'Basic Info', icon: Info },
  { id: 'pricing', label: 'Pricing & Inventory', icon: DollarSign },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'categorization', label: 'Categories & SEO', icon: Tag },
];

// ──────────────────────────────────────────────────────────
// Slug generator
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
// Variant hydration
// ──────────────────────────────────────────────────────────

interface ApiVariantAttributeValue {
  attribute: { id: string; name: string };
  value: string;
}
interface ApiVariantImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
}
interface ApiVariant {
  id: string;
  sku: string;
  price: number | string | null;
  quantity: number;
  isActive: boolean;
  isDefault?: boolean;
  attributeValues?: ApiVariantAttributeValue[];
  images?: ApiVariantImage[];
}

/**
 * Convert the API variant shape (attributeValues → attribute.name) into the
 * admin-form shape (flat options map per variant + distinct options list).
 */
function hydrateVariants(raw: unknown): { options: OptionType[]; variants: Variant[] } {
  if (!Array.isArray(raw)) {
    return { options: [], variants: [] };
  }

  const valuesByName = new Map<string, Set<string>>();
  const variants: Variant[] = (raw as ApiVariant[]).map((v) => {
    const options: Record<string, string> = {};
    for (const av of v.attributeValues ?? []) {
      options[av.attribute.name] = av.value;
      if (!valuesByName.has(av.attribute.name)) {
        valuesByName.set(av.attribute.name, new Set());
      }
      valuesByName.get(av.attribute.name)!.add(av.value);
    }
    return {
      id: v.id,
      options,
      price: v.price !== null && v.price !== undefined ? Number(v.price) : null,
      stock: v.quantity ?? 0,
      sku: v.sku ?? '',
      isActive: v.isActive ?? true,
      isDefault: v.isDefault ?? false,
      imageUrls: Array.isArray(v.images) ? v.images.map((img) => img.url) : [],
    };
  });

  const options: OptionType[] = Array.from(valuesByName.entries()).map(([name, vals]) => ({
    id: `opt-${name}`,
    name,
    values: Array.from(vals).sort(),
  }));

  return { options, variants };
}

// ──────────────────────────────────────────────────────────
// Product Edit Page
// ──────────────────────────────────────────────────────────

/**
 * Admin product edit page.
 *
 * Reuses all form components from the product creation flow but
 * pre-populates fields with existing product data. All prices in BDT (৳).
 */
export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    nameBn: '',
    slug: '',
    description: '',
    descriptionBn: '',
    sku: '',
    price: 0,
    compareAtPrice: null,
    costPrice: null,
    quantity: 0,
    lowStockThreshold: 10,
    weight: null,
    categoryId: '',
    brandId: '',
    tags: [],
    images: [],
    status: 'DRAFT',
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    options: [],
    variants: [],
  });

  // ─── Load Product Data ────────────────────────────────────────────

  useEffect(() => {
    async function loadProduct() {
      try {
        setIsLoading(true);
        const { data } = await apiClient.get(`/products/by-id/${productId}`);
        const product = data.data ?? data;
        const images: ProductImage[] = Array.isArray(product.images) ? product.images : [];
        const { options, variants } = hydrateVariants(product.variants);

        setExistingImages(images);
        setFormData({
          name: product.name ?? '',
          nameBn: product.nameBn ?? '',
          slug: product.slug ?? '',
          description: product.description ?? '',
          descriptionBn: product.descriptionBn ?? '',
          sku: product.sku ?? '',
          price: Number(product.price ?? 0),
          compareAtPrice:
            product.compareAtPrice !== null && product.compareAtPrice !== undefined
              ? Number(product.compareAtPrice)
              : null,
          costPrice:
            product.costPrice !== null && product.costPrice !== undefined
              ? Number(product.costPrice)
              : null,
          quantity: product.quantity ?? 0,
          lowStockThreshold:
            product.inventory?.lowStockThreshold ?? product.lowStockThreshold ?? 10,
          weight:
            product.weight !== null && product.weight !== undefined ? Number(product.weight) : null,
          categoryId: product.categoryId ?? product.category?.id ?? '',
          brandId: product.brandId ?? product.brand?.id ?? '',
          tags: product.tags ?? [],
          images: images.map((img) => img.url),
          status: product.status ?? 'DRAFT',
          isFeatured: product.isFeatured ?? false,
          metaTitle: product.metaTitle ?? '',
          metaDescription: product.metaDescription ?? '',
          options,
          variants,
        });
      } catch (err) {
        console.error('Failed to load product:', err);
        setErrors({ _form: 'Failed to load product data.' });
        toast.error(getApiErrorMessage(err, 'Failed to load product'));
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  // ─── Form Update Handler ──────────────────────────────────────────

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string') {
        next.slug = generateSlug(value);
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── Save Handler ─────────────────────────────────────────────────

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Selling price is required';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name || newErrors.description) {
        setActiveTab('basic');
      } else if (newErrors.price) {
        setActiveTab('pricing');
      } else if (newErrors.categoryId) {
        setActiveTab('categorization');
      }
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        descriptionBn: formData.descriptionBn.trim() || undefined,
        slug: formData.slug.trim().toLowerCase() || undefined,
        sku: formData.sku.trim().toUpperCase() || undefined,
        price: formData.price,
        compareAtPrice: formData.compareAtPrice ?? undefined,
        costPrice: formData.costPrice ?? undefined,
        quantity: formData.quantity,
        lowStockThreshold: formData.lowStockThreshold,
        weight: formData.weight ?? undefined,
        categoryId: formData.categoryId,
        brandId: formData.brandId || undefined,
        tags: formData.tags,
        isFeatured: formData.isFeatured,
        status: formData.status,
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined,
      };
      const { data: patchResponse } = await apiClient.patch(`/products/${productId}`, payload);
      const updated = patchResponse?.data ?? patchResponse;

      if (updated) {
        setFormData((prev) => ({
          ...prev,
          name: updated.name ?? prev.name,
          slug: updated.slug ?? prev.slug,
          sku: updated.sku ?? prev.sku,
        }));
      }

      const existingUrls = new Set(existingImages.map((img) => img.url));
      const currentUrls = new Set(formData.images);

      const toRemove = existingImages.filter((img) => !currentUrls.has(img.url));
      const toAdd = formData.images.filter((url) => !existingUrls.has(url));

      await Promise.all([
        ...toRemove.map((img) =>
          apiClient
            .delete(`/products/${productId}/images/${img.id}`)
            .catch((err) => console.error(`Failed to remove image ${img.id}:`, err)),
        ),
        ...toAdd.map((url) =>
          apiClient
            .post(`/products/${productId}/images`, { url })
            .catch((err) => console.error(`Failed to add image ${url}:`, err)),
        ),
      ]);

      // Persist image order. Diffing by URL above ignores positional changes,
      // so the server keeps its original sortOrder unless we PATCH explicitly.
      let postMutationImages: ProductImage[] = existingImages;
      if (toAdd.length > 0 || toRemove.length > 0) {
        const { data: postMutation } = await apiClient.get(`/products/by-id/${productId}`);
        const postProduct = postMutation?.data ?? postMutation;
        postMutationImages = Array.isArray(postProduct?.images) ? postProduct.images : [];
      }

      const idsByUrl = new Map<string, string[]>();
      for (const img of postMutationImages) {
        if (!idsByUrl.has(img.url)) {
          idsByUrl.set(img.url, []);
        }
        idsByUrl.get(img.url)!.push(img.id);
      }
      const desiredIds: string[] = [];
      for (const url of formData.images) {
        const queue = idsByUrl.get(url);
        if (queue && queue.length > 0) {
          desiredIds.push(queue.shift()!);
        }
      }
      const currentIds = [...postMutationImages]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((img) => img.id);
      const orderChanged =
        desiredIds.length === currentIds.length && desiredIds.some((id, i) => id !== currentIds[i]);

      if (orderChanged) {
        await apiClient
          .patch(`/products/${productId}/images/reorder`, { imageIds: desiredIds })
          .catch((err) => {
            console.error('Failed to reorder images:', err);
            toast.error('Image reorder failed — other changes were saved');
          });
      }

      // Bulk-replace variants. The API matches existing rows by option-tuple
      // fingerprint, so we just send the cleaned current list and skip any
      // half-entered rows whose options map is empty.
      const cleanVariants = formData.variants
        .map((v) => {
          const cleanOptions: Record<string, string> = {};
          for (const [k, val] of Object.entries(v.options)) {
            const key = k.trim();
            const value = typeof val === 'string' ? val.trim() : '';
            if (key && value) {
              cleanOptions[key] = value;
            }
          }
          return {
            options: cleanOptions,
            price: v.price,
            stock: v.stock,
            sku: v.sku.trim() || undefined,
            isActive: v.isActive,
            isDefault: v.isDefault === true,
            imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
          };
        })
        .filter((v) => Object.keys(v.options).length > 0);

      await apiClient
        .put(`/products/${productId}/variants/replace`, { variants: cleanVariants })
        .catch((err) => {
          console.error('Failed to replace variants:', err);
          toast.error('Variant sync failed — other changes were saved');
          throw err;
        });

      // Refetch so new variant IDs, images, and any server-normalised fields
      // flow back into local state.
      const { data } = await apiClient.get(`/products/by-id/${productId}`);
      const fresh = data.data ?? data;
      const images: ProductImage[] = Array.isArray(fresh.images) ? fresh.images : [];
      const hydrated = hydrateVariants(fresh.variants);
      setExistingImages(images);
      setFormData((prev) => ({
        ...prev,
        images: images.map((img) => img.url),
        options: hydrated.options,
        variants: hydrated.variants,
        slug: fresh.slug ?? prev.slug,
        sku: fresh.sku ?? prev.sku,
        name: fresh.name ?? prev.name,
      }));

      setLastSaved(new Date());
      toast.success('Product saved');
    } catch (err) {
      console.error('Failed to save product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete Handler ───────────────────────────────────────────────

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this product?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }

    try {
      setIsDeleting(true);
      await apiClient.delete(`/products/${productId}`);
      toast.success('Product deleted');
      router.push('/admin/products');
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error(getApiErrorMessage(err, 'Failed to delete product'));
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="mt-3 text-sm text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-sm text-gray-500">
              {formData.name || 'Untitled Product'}
              {lastSaved && (
                <span className="ml-2 text-green-600">
                  · Last saved{' '}
                  {lastSaved.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/products/${formData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Status Toggle */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <label className="flex items-center gap-3">
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </label>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            formData.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : formData.status === 'ARCHIVED'
                ? 'bg-gray-100 text-gray-700'
                : formData.status === 'OUT_OF_STOCK'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700',
          )}
        >
          {formData.status === 'ACTIVE'
            ? 'This product is visible on the store.'
            : formData.status === 'ARCHIVED'
              ? 'This product is archived and hidden.'
              : formData.status === 'OUT_OF_STOCK'
                ? 'This product is out of stock.'
                : 'This product is hidden from customers.'}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1',
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500',
                )}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="edit-slug" className="mb-1.5 block text-sm font-medium text-gray-700">
                URL Slug
              </label>
              <div className="flex rounded-lg border border-gray-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  /products/
                </span>
                <input
                  id="edit-slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    updateField(
                      'slug',
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-')
                        .replace(/-+/g, '-'),
                    )
                  }
                  className="flex-1 rounded-r-lg px-4 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-xs text-amber-700">
                ⚠️ Changing the URL will break existing links to this product.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => updateField('description', html)}
                placeholder="Describe the product in detail..."
                ariaLabel="Product description"
                invalid={Boolean(errors.description)}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description (বাংলা)
              </label>
              <RichTextEditor
                value={formData.descriptionBn}
                onChange={(html) => updateField('descriptionBn', html)}
                placeholder="পণ্যের বিস্তারিত বিবরণ..."
                ariaLabel="Product description (Bangla)"
              />
            </div>

            <div className="sm:max-w-xs">
              <label htmlFor="edit-sku" className="mb-1.5 block text-sm font-medium text-gray-700">
                SKU
              </label>
              <input
                id="edit-sku"
                type="text"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                onBlur={(e) => updateField('sku', e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <PricingForm
          data={{
            price: formData.price,
            compareAtPrice: formData.compareAtPrice,
            costPrice: formData.costPrice,
            quantity: formData.quantity,
            lowStockThreshold: formData.lowStockThreshold,
            weight: formData.weight,
          }}
          onChange={(field, value) => updateField(field as keyof ProductFormData, value as never)}
          errors={errors}
          hasVariants={formData.variants.length > 0}
        />
      )}

      {activeTab === 'media' && (
        <MediaForm images={formData.images} onChange={(images) => updateField('images', images)} />
      )}

      {activeTab === 'variants' && (
        <VariantsForm
          options={formData.options}
          variants={formData.variants}
          onOptionsChange={(options) => updateField('options', options)}
          onVariantsChange={(variants) => updateField('variants', variants)}
          basePrice={formData.price}
          baseSku={formData.sku}
          productImages={formData.images}
        />
      )}

      {activeTab === 'categorization' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CategorizationForm
            categoryId={formData.categoryId}
            brandId={formData.brandId}
            tags={formData.tags}
            isFeatured={formData.isFeatured}
            onCategoryChange={(id) => updateField('categoryId', id)}
            onBrandChange={(id) => updateField('brandId', id)}
            onTagsChange={(tags) => updateField('tags', tags)}
            onFeaturedChange={(featured) => updateField('isFeatured', featured)}
          />
          <SeoForm
            metaTitle={formData.metaTitle}
            metaDescription={formData.metaDescription}
            slug={formData.slug}
            productName={formData.name}
            onMetaTitleChange={(val) => updateField('metaTitle', val)}
            onMetaDescriptionChange={(val) => updateField('metaDescription', val)}
          />
        </div>
      )}
    </div>
  );
}
