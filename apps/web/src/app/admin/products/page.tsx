'use client';

import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  ImageIcon,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { formatBDT } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  status: string;
  images: ProductImage[];
  category: { name: string } | null;
  brand: { name: string } | null;
  createdAt: string;
  variants?: {
    id: string;
    isActive: boolean;
    isDefault: boolean;
    quantity: number;
    lowStockThreshold: number;
    price: number;
    images: { url: string; thumbnailUrl: string | null; alt: string | null }[];
  }[];
  inventory?: {
    lowStockThreshold: number;
    quantity: number;
  } | null;
  _count?: {
    variants: number;
    reviews: number;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ──────────────────────────────────────────────────────────
// Status Badge
// ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100 text-green-700', label: 'Active' },
    DRAFT: { bg: 'bg-gray-100 text-gray-600', label: 'Draft' },
    ARCHIVED: { bg: 'bg-yellow-100 text-yellow-700', label: 'Archived' },
    OUT_OF_STOCK: { bg: 'bg-red-100 text-red-700', label: 'Out of Stock' },
  };
  const { bg, label } = config[status] ?? { bg: 'bg-gray-100 text-gray-600', label: 'Draft' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        bg,
      )}
    >
      {status === 'ACTIVE' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// Stock Badge
// ──────────────────────────────────────────────────────────

function StockBadge({ product }: { product: Product }) {
  const activeVariants = product.variants ?? [];
  const hasActiveVariants = activeVariants.length > 0;

  if (hasActiveVariants) {
    const totalStock = activeVariants.reduce((sum, v) => sum + v.quantity, 0);
    const lowVariants = activeVariants.filter(
      (v) => v.quantity > 0 && v.quantity <= v.lowStockThreshold
    );
    const outVariants = activeVariants.filter((v) => v.quantity <= 0);

    const allOut = activeVariants.every((v) => v.quantity <= 0);
    const anyLow = lowVariants.length > 0;

    let color = 'bg-green-100 text-green-700';
    let text = `${totalStock} in stock`;

    if (allOut) {
      color = 'bg-red-100 text-red-700';
      text = 'Out of stock';
    } else if (anyLow) {
      color = 'bg-yellow-100 text-yellow-700';
      text = `Low stock — ${totalStock} left`;
    }

    // Build subtext
    const subParts: string[] = [];
    if (lowVariants.length > 0) {
      subParts.push(`${lowVariants.length} of ${activeVariants.length} variants low`);
    }
    if (outVariants.length > 0) {
      subParts.push(`${outVariants.length} out`);
    }

    return (
      <div className="flex flex-col gap-1">
        <div>
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', color)}>
            {text}
          </span>
        </div>
        {subParts.length > 0 && (
          <span className="text-[11px] text-gray-500 font-normal">
            {subParts.join(', ')}
          </span>
        )}
      </div>
    );
  } else {
    // Non-variant products: use product.quantity and inventory.lowStockThreshold ?? 10
    const stock = product.quantity;
    const threshold = product.inventory?.lowStockThreshold ?? 10;

    let color = 'bg-green-100 text-green-700';
    let text = `${stock} in stock`;

    if (stock <= 0) {
      color = 'bg-red-100 text-red-700';
      text = 'Out of stock';
    } else if (stock <= threshold) {
      color = 'bg-yellow-100 text-yellow-700';
      text = `Low stock — ${stock} left`;
    }

    return (
      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', color)}>
        {text}
      </span>
    );
  }
}

// ──────────────────────────────────────────────────────────
// Admin Product Listing Page
// ──────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { confirm, dialog: confirmDialog } = useConfirm();

  const page = parseInt(searchParams.get('page') ?? '1', 10);

  // ─── Fetch Products ───────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      // "low-stock" and "out-of-stock" are inventory conditions, not enum
      // values. Route them to the dedicated boolean filters; leave the
      // status enum for actual statuses (active, draft, archived).
      if (statusFilter === 'low-stock') {
        params.set('lowStock', 'true');
      } else if (statusFilter === 'out-of-stock') {
        params.set('outOfStock', 'true');
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter.toUpperCase());
      }
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const { data: res } = await apiClient.get(`/products?${params.toString()}`);
      setProducts(res.data ?? res ?? []);
      setMeta(res.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error(getApiErrorMessage(err, 'Failed to load products'));
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ─── Selection Handlers ───────────────────────────────────────────

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // ─── Bulk Actions ─────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: `Delete ${selectedIds.size} selected products?`,
      description:
        'Products with order history will be archived; the rest will be permanently removed.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.post('/products/bulk/delete', {
        productIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      fetchProducts();
      toast.success('Products deleted');
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error(getApiErrorMessage(err, 'Failed to delete products'));
    }
  };

  const handleDeleteOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: 'Products with order history will be archived instead.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      const { data } = await apiClient.delete(`/products/${id}`);
      const result = data?.data ?? data ?? {};
      if (result.archived) {
        toast.success(`"${name}" archived — kept because it has order history`);
      } else {
        toast.success(`"${name}" deleted`);
      }
      fetchProducts();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(getApiErrorMessage(err, 'Failed to delete product'));
    }
  };

  // ─── Search Handler ───────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`/admin/products?${params.toString()}`);
  };

  // ─── Pagination ───────────────────────────────────────────────────

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/products?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">
            Manage your product catalog ({meta.total} products)
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    onClick={() => {
                      setSortBy('price');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                    className="flex items-center gap-1"
                  >
                    Price
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-10 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    No products found. Create your first product to get started.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const coverImage = product.variants?.find(v => v.isDefault)?.images?.[0] || product.images?.[0];
                  return (
                    <tr
                      key={product.id}
                      className={cn('hover:bg-gray-50', selectedIds.has(product.id) && 'bg-teal-50')}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                           onChange={() => toggleSelect(product.id)}
                           className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                         />
                       </td>
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-3">
                           <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                             {coverImage?.url ? (
                               <img
                                 src={coverImage.url}
                                 alt={coverImage.alt || product.name}
                                 className="h-full w-full object-cover"
                               />
                             ) : (
                               <ImageIcon className="h-5 w-5 text-gray-300" />
                             )}
                           </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="truncate text-sm font-medium text-gray-900 hover:text-teal-600"
                          >
                            {product.name}
                          </Link>
                          {product.brand && (
                            <p className="text-xs text-gray-500">{product.brand.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {product.sku}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatBDT(Number(product.price))}
                        </span>
                        {product.compareAtPrice && (
                          <span className="ml-1 text-xs text-gray-400 line-through">
                            {formatBDT(Number(product.compareAtPrice))}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StockBadge product={product} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {product.category?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="View on store"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteOne(product.id, product.name)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {(meta.page - 1) * meta.limit + 1} to{' '}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} products
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 p-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium',
                      pageNum === page
                        ? 'bg-teal-600 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="rounded-lg border border-gray-300 p-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
