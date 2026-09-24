'use client';

import { FolderTree, Tag, Building2, Search, Check, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

interface CategorizationFormProps {
  categoryId: string;
  brandId: string;
  tags: string[];
  isFeatured: boolean;
  onCategoryChange: (id: string) => void;
  onBrandChange: (id: string) => void;
  onTagsChange: (tags: string[]) => void;
  onFeaturedChange: (featured: boolean) => void;
}

// ──────────────────────────────────────────────────────────
// Category Tree Item
// ──────────────────────────────────────────────────────────

interface CategoryTreeItemProps {
  category: Category;
  selectedId: string;
  onSelect: (id: string) => void;
  level: number;
}

function CategoryTreeItem({ category, selectedId, onSelect, level }: CategoryTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = category.id === selectedId;

  return (
    <div>
      <button
        onClick={() => onSelect(category.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          isSelected ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50',
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex-shrink-0"
          >
            <ChevronRight
              className={cn('h-4 w-4 text-gray-400 transition-transform', expanded && 'rotate-90')}
            />
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="flex-1 text-left">{category.name}</span>
        {isSelected && <Check className="h-4 w-4 text-brand-600" />}
        {category._count && (
          <span className="text-xs text-gray-400">{category._count.products}</span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Categorization Form
// ──────────────────────────────────────────────────────────

/**
 * Product categorization form with category tree selection,
 * brand selection, and tags management.
 */
export function CategorizationForm({
  categoryId,
  brandId,
  tags,
  isFeatured,
  onCategoryChange,
  onBrandChange,
  onTagsChange,
  onFeaturedChange,
}: CategorizationFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  // ─── Load Categories ──────────────────────────────────────────────

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await apiClient.get('/categories');
        setCategories(data.data ?? data ?? []);
      } catch (err) {
        console.error('Failed to load categories:', err);
        toast.error(getApiErrorMessage(err, 'Failed to load categories'));
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // ─── Load Brands ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadBrands() {
      try {
        const { data } = await apiClient.get('/brands');
        setBrands(data.data ?? data ?? []);
      } catch (err) {
        console.error('Failed to load brands:', err);
        toast.error(getApiErrorMessage(err, 'Failed to load brands'));
      } finally {
        setIsLoadingBrands(false);
      }
    }
    loadBrands();
  }, []);

  // ─── Tag Handlers ─────────────────────────────────────────────────

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  // ─── Filter ───────────────────────────────────────────────────────

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Category</h2>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Search categories..."
            className="field-input w-full pl-11 pr-4"
          />
        </div>

        {/* Category Tree */}
        <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-[1.25rem] border border-foreground/[0.06] bg-card p-1.5">
          {isLoadingCategories ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No categories found.</div>
          ) : (
            categories.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                selectedId={categoryId}
                onSelect={onCategoryChange}
                level={0}
              />
            ))
          )}
        </div>
      </div>

      {/* Brand Selection */}
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Brand</h2>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Search brands..."
            className="field-input w-full pl-11 pr-4"
          />
        </div>

        <div className="scrollbar-thin max-h-48 overflow-y-auto rounded-[1.25rem] border border-foreground/[0.06] bg-card p-1.5">
          {isLoadingBrands ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading brands...</div>
          ) : (
            filteredBrands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => onBrandChange(brand.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                  brand.id === brandId
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-6 w-6 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-500">
                    {brand.name.charAt(0)}
                  </div>
                )}
                <span className="flex-1 text-left">{brand.name}</span>
                {brand.id === brandId && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Tags</h2>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag..."
            className="field-input flex-1 py-2.5"
          />
          <button onClick={addTag} disabled={!newTag.trim()} className="btn btn-soft btn-sm">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Featured Toggle */}
      <div className="bento-card p-6 sm:p-8">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Featured Product</p>
            <p className="text-xs text-gray-500">
              Display this product in the featured section on the homepage
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
