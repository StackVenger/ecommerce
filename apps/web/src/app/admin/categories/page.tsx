'use client';

import {
  Plus,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  GripVertical,
  Package,
  Search,
  Loader2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { CategoryFormDialog } from '@/components/admin/categories/category-form-dialog';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
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
  sortOrder: number;
  isActive: boolean;
  children: Category[];
  productCount: number;
}

// ──────────────────────────────────────────────────────────
// Category Tree Node
// ──────────────────────────────────────────────────────────

interface CategoryTreeNodeProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (targetId: string) => void;
}

function CategoryTreeNode({
  category,
  level,
  onEdit,
  onDelete,
  onAddChild,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const [showActions, setShowActions] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isDragged = draggedId === category.id;

  return (
    <div className={cn(isDragged && 'opacity-50')}>
      <div
        draggable
        onDragStart={() => onDragStart(category.id)}
        onDragOver={(e) => onDragOver(e, category.id)}
        onDrop={() => onDrop(category.id)}
        className={cn(
          'group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-gray-50',
          level > 0 && 'ml-6',
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300 opacity-0 group-hover:opacity-100" />

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Category Image */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-foreground/[0.04] bg-gray-50">
          {category.image ? (
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
          ) : (
            <FolderTree className="h-4 w-4 text-gray-300" />
          )}
        </div>

        {/* Category Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{category.name}</span>
            {category.nameBn && <span className="text-xs text-gray-500">({category.nameBn})</span>}
            {!category.isActive && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">/{category.slug}</p>
        </div>

        {/* Product Count */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Package className="h-3.5 w-3.5" />
          <span>{category.productCount} products</span>
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            onClick={() => onAddChild(category.id)}
            className="rounded-xl p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
            title="Add subcategory"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(category)}
            className="rounded-xl p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="rounded-xl p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              draggedId={draggedId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Admin Category Management Page
// ──────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ─── Fetch Categories ─────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get('/categories');
      setCategories(data.data ?? data);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error(getApiErrorMessage(err, 'Failed to load categories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowCreateDialog(true);
  };

  const handleAddChild = (parentId: string) => {
    setParentIdForNew(parentId);
    setEditingCategory(null);
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this category?',
      description: 'Products in this category will be uncategorized.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/categories/${id}`);
      fetchCategories();
      toast.success('Category deleted');
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error(getApiErrorMessage(err, 'Failed to delete category'));
    }
  };

  // ─── Drag & Drop Reorder ──────────────────────────────────────────

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, _targetId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    try {
      await apiClient.patch(`/categories/${draggedId}/reorder`, {
        targetId,
      });
      fetchCategories();
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      toast.error(getApiErrorMessage(err, 'Failed to reorder categories'));
    } finally {
      setDraggedId(null);
    }
  };

  // ─── Count totals ─────────────────────────────────────────────────

  function countCategories(cats: Category[]): number {
    return cats.reduce((sum, cat) => sum + 1 + countCategories(cat.children || []), 0);
  }

  const totalCategories = countCategories(categories);

  // ─── Filter categories by search ──────────────────────────────────

  function filterCategories(cats: Category[], query: string): Category[] {
    if (!query) {
      return cats;
    }
    const lowerQuery = query.toLowerCase();

    return cats
      .map((cat) => {
        const matchesThis =
          cat.name.toLowerCase().includes(lowerQuery) ||
          cat.nameBn?.toLowerCase().includes(lowerQuery);
        const filteredChildren = filterCategories(cat.children || [], query);

        if (matchesThis || filteredChildren.length > 0) {
          return { ...cat, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as Category[];
  }

  const displayCategories = filterCategories(categories, searchQuery);

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            Manage your product categories ({totalCategories} categories)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setParentIdForNew(null);
            setShowCreateDialog(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="field-input w-full pl-11 pr-4"
        />
      </div>

      {/* Category Tree */}
      <div className="bento-card">
        <div className="border-b border-foreground/[0.04] px-6 py-4">
          <h2 className="text-lg font-black tracking-tight text-gray-900">Category Hierarchy</h2>
          <p className="text-xs text-gray-500">
            Drag categories to reorder. Click the arrow to expand/collapse.
          </p>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : displayCategories.length === 0 ? (
            <div className="py-12 text-center">
              <FolderTree className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                {searchQuery
                  ? 'No categories match your search.'
                  : 'No categories yet. Create your first category to organize products.'}
              </p>
            </div>
          ) : (
            displayCategories.map((category) => (
              <CategoryTreeNode
                key={category.id}
                category={category}
                level={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                draggedId={draggedId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Category Dialog */}
      <CategoryFormDialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingCategory(null);
          setParentIdForNew(null);
        }}
        onSuccess={fetchCategories}
        editCategory={editingCategory}
        parentId={parentIdForNew}
      />
    </div>
  );
}
