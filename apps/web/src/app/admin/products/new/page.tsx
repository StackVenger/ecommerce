'use client';

import { Save, ArrowLeft, Info, DollarSign, ImageIcon, Layers, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { CategorizationForm } from '@/components/admin/products/categorization-form';
import { MediaForm } from '@/components/admin/products/media-form';
import { PricingForm } from '@/components/admin/products/pricing-form';
import { SeoForm } from '@/components/admin/products/seo-form';
import { VariantsForm } from '@/components/admin/products/variants-form';
import { RichTextEditor } from '@/components/admin/ui/rich-text-editor';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

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
  compareAtPrice?: number | null;
  costPrice?: number | null;
  stock: number;
  lowStockThreshold: number;
  sku: string;
  isActive: boolean;
  isDefault?: boolean;
  imageUrls?: string[];
}

// ──────────────────────────────────────────────────────────
// Tabs configuration
// ──────────────────────────────────────────────────────────

type TabId = 'basic' | 'pricing' | 'media' | 'variants' | 'categorization' | 'seo';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
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
// Product Creation Page
// ──────────────────────────────────────────────────────────

export default function AdminProductCreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // ─── Form Handlers ────────────────────────────────────────────────

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-generate slug from name
      if (field === 'name' && typeof value === 'string') {
        next.slug = generateSlug(value);
      }

      return next;
    });

    // Clear error for field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── Validation ───────────────────────────────────────────────────

  const validate = (): { ok: boolean; firstTab: TabId | null } => {
    const newErrors: Record<string, string> = {};
    let firstTab: TabId | null = null;
    const fail = (field: string, msg: string, tab: TabId) => {
      newErrors[field] = msg;
      if (!firstTab) {
        firstTab = tab;
      }
    };

    if (!formData.name.trim()) {
      fail('name', 'Product name is required', 'basic');
    } else if (formData.name.trim().length < 2) {
      fail('name', 'Name must be at least 2 characters', 'basic');
    }
    if (!formData.description.trim()) {
      fail('description', 'Description is required', 'basic');
    } else if (formData.description.trim().length < 10) {
      fail('description', 'Description must be at least 10 characters', 'basic');
    }
    if (!formData.price || formData.price <= 0) {
      fail('price', 'Selling price is required', 'pricing');
    }
    if (!formData.categoryId) {
      fail('categoryId', 'Please select a category', 'categorization');
    }

    setErrors(newErrors);
    return { ok: Object.keys(newErrors).length === 0, firstTab };
  };

  // ─── Save Handler ─────────────────────────────────────────────────

  const handleSave = async (publish = false) => {
    const { ok, firstTab } = validate();
    if (!ok) {
      if (firstTab) {
        setActiveTab(firstTab);
      }
      toast.error(
        errors.categoryId && !formData.categoryId
          ? 'Please select a category before saving'
          : 'Please fix the errors before saving',
      );
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim() || undefined,
        description: formData.description.trim(),
        descriptionBn: formData.descriptionBn.trim() || undefined,
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
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined,
        status: publish ? 'ACTIVE' : 'DRAFT',
      };

      const { data } = await apiClient.post('/products', payload);
      const product = data.data ?? data;

      if (formData.images.length > 0) {
        await Promise.all(
          formData.images.map((url, index) =>
            apiClient
              .post(`/products/${product.id}/images`, {
                url,
                isPrimary: index === 0,
              })
              .catch((err) => {
                console.error(`Failed to attach image ${url}:`, err);
              }),
          ),
        );
      }

      // Sync variants if the user defined any. Mirrors the cleaning the edit
      // page does so the API gets a consistent shape from both flows.
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
            compareAtPrice: v.compareAtPrice ?? null,
            costPrice: v.costPrice ?? null,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold ?? 10,
            sku: v.sku.trim() || undefined,
            isActive: v.isActive,
            isDefault: v.isDefault === true,
            imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
          };
        })
        .filter((v) => Object.keys(v.options).length > 0);

      if (cleanVariants.length > 0) {
        await apiClient
          .put(`/products/${product.id}/variants/replace`, {
            variants: cleanVariants,
            options: formData.options.map((o) => ({
              name: o.name,
              values: o.values,
            })),
          })
          .catch((err) => {
            console.error('Failed to sync variants:', err);
            toast.error('Product saved, but variant sync failed — open Edit to retry');
          });
      }

      toast.success('Product created');
      router.push(`/admin/products/${product.id}/edit`);
    } catch (err) {
      console.error('Failed to create product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create product';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="page-title">Create Product</h1>
            <p className="page-subtitle">Add a new product to your catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="btn btn-secondary"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="btn btn-primary gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-[1.5rem] border border-foreground/[0.04] bg-card p-2 shadow-bento scrollbar-none"
        aria-label="Product sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn('chip', activeTab === tab.id && 'chip-active')}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content: Basic Info */}
      {activeTab === 'basic' && (
        <div className="bento-card p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-black text-gray-900 tracking-tight">
            Basic Information
          </h2>

          <div className="space-y-6">
            {/* Product Name (English) */}
            <div>
              <label htmlFor="name" className="field-label">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Organic Basmati Rice Premium"
                className={cn(
                  'field-input w-full',
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500',
                )}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            {/* Product Name (Bangla) */}
            <div>
              <label htmlFor="nameBn" className="field-label">
                Product Name (বাংলা)
              </label>
              <input
                id="nameBn"
                type="text"
                value={formData.nameBn}
                onChange={(e) => updateField('nameBn', e.target.value)}
                placeholder="e.g., অর্গানিক বাসমতী চাল প্রিমিয়াম"
                className="field-input w-full"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="field-label">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex min-w-0 overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card shadow-sm transition-all focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
                <span className="inline-flex shrink-0 items-center border-r border-foreground/[0.06] bg-gray-50 px-4 text-sm font-bold text-gray-500">
                  /products/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none"
                />
              </div>
              {errors.slug && <p className="field-error">{errors.slug}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="field-label">Description</label>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => updateField('description', html)}
                placeholder="Describe the product in detail..."
                ariaLabel="Product description"
              />
            </div>

            {/* Description (Bangla) */}
            <div>
              <label className="field-label">Description (বাংলা)</label>
              <RichTextEditor
                value={formData.descriptionBn}
                onChange={(html) => updateField('descriptionBn', html)}
                placeholder="পণ্যের বিস্তারিত বিবরণ..."
                ariaLabel="Product description (Bangla)"
              />
            </div>

            {/* SKU */}
            <div className="sm:max-w-xs">
              <label htmlFor="sku" className="field-label">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                onBlur={(e) => updateField('sku', e.target.value.toUpperCase())}
                placeholder="e.g., RICE-BAS-001"
                className={cn(
                  'field-input w-full uppercase',
                  errors.sku
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500',
                )}
              />
              {errors.sku && <p className="field-error">{errors.sku}</p>}
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
