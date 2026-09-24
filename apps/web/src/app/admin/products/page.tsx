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
  Package,
  PackageX,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { BentoCard, PageHeader, SectionHeader, StatCard } from '@/components/ui/bento';
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
    ACTIVE: { bg: 'bg-emerald-50 text-emerald-600', label: 'Active' },
    DRAFT: { bg: 'bg-gray-100 text-gray-600', label: 'Draft' },
    ARCHIVED: { bg: 'bg-amber-50 text-amber-600', label: 'Archived' },
    OUT_OF_STOCK: { bg: 'bg-rose-50 text-rose-600', label: 'Out of Stock' },
  };
  const { bg, label } = config[status] ?? { bg: 'bg-gray-100 text-gray-600', label: 'Draft' };

  return (
    <span className={cn('pill gap-1', bg)}>
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
      (v) => v.quantity > 0 && v.quantity <= v.lowStockThreshold,
    );
    const outVariants = activeVariants.filter((v) => v.quantity <= 0);

    const allOut = activeVariants.every((v) => v.quantity <= 0);
    const anyLow = lowVariants.length > 0;

    let color = 'bg-emerald-50 text-emerald-600';
    let text = `${totalStock} in stock`;

    if (allOut) {
      color = 'bg-rose-50 text-rose-600';
      text = 'Out of stock';
    } else if (anyLow) {
      color = 'bg-amber-50 text-amber-600';
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
          <span className={cn('pill', color)}>{text}</span>
        </div>
        {subParts.length > 0 && (
          <span className="text-[11px] font-bold text-gray-500">{subParts.join(', ')}</span>
        )}
      </div>
    );
  } else {
    // Non-variant products: use product.quantity and inventory.lowStockThreshold ?? 10
    const stock = product.quantity;
    const threshold = product.inventory?.lowStockThreshold ?? 10;

    let color = 'bg-emerald-50 text-emerald-600';
    let text = `${stock} in stock`;

    if (stock <= 0) {
      color = 'bg-rose-50 text-rose-600';
      text = 'Out of stock';
    } else if (stock <= threshold) {
      color = 'bg-amber-50 text-amber-600';
      text = `Low stock — ${stock} left`;
    }

    return <span className={cn('pill', color)}>{text}</span>;
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

  // Refetch when the admin tabs back to this page — stock changes whenever
  // a customer places or cancels an order, and the StockBadge should reflect
  // those decrements without forcing the admin to hit reload.
  useEffect(() => {
    const onFocus = () => {
      fetchProducts();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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

  // Page-level inventory snapshot for the stat hub (current page only).
  const activeOnPage = products.filter((p) => p.status === 'ACTIVE').length;
  const lowStockOnPage = products.filter((p) => p.quantity > 0 && p.quantity <= 10).length;
  const outOfStockOnPage = products.filter((p) => p.quantity <= 0).length;
  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-6">
      {confirmDialog}
      <PageHeader
        title="Products"
        description={`Manage your product catalog (${meta.total} products)`}
        actions={
          <Link href="/admin/products/new" className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add Product
          </Link>
        }
      />

      {/* Inventory stat hub */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-12">
        <BentoCard variant="primary" className="col-span-2 lg:col-span-4">
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Package className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <Link
                href="/admin/products/new"
                className="rounded-xl bg-card px-4 py-2 text-xs font-black text-primary transition-all hover:scale-105 active:scale-95"
              >
                New product
              </Link>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                Catalog size
              </p>
              <p className="text-5xl font-black tabular-nums tracking-tighter">{meta.total}</p>
              <p className="mt-2 text-xs font-bold text-white/80">
                {meta.totalPages} {meta.totalPages === 1 ? 'page' : 'pages'} · {meta.limit} per page
              </p>
            </div>
          </div>
        </BentoCard>
        <StatCard
          className="lg:col-span-2"
          label="Active"
          value={activeOnPage}
          icon={CheckCircle2}
          tone="emerald"
          hint="On this page"
          loading={isLoading}
        />
        <StatCard
          className="lg:col-span-2"
          label="Low stock"
          value={lowStockOnPage}
          icon={AlertTriangle}
          tone="orange"
          hint="On this page"
          loading={isLoading}
        />
        <StatCard
          className="lg:col-span-2"
          label="Out of stock"
          value={outOfStockOnPage}
          icon={PackageX}
          tone="rose"
          hint="On this page"
          loading={isLoading}
        />
        <StatCard
          className="lg:col-span-2"
          label="Selected"
          value={selectedIds.size}
          icon={ListChecks}
          tone="blue"
          hint="For bulk actions"
        />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-foreground/[0.04] bg-card p-3 shadow-bento sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="group/search relative flex-1 sm:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input w-full border-transparent bg-gray-50 py-2.5 pl-11 shadow-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="field-input w-auto py-2.5 font-bold"
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
              <span className="pill pill-brand">{selectedIds.size} selected</span>
              <button onClick={handleBulkDelete} className="btn btn-danger-soft btn-sm">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inventory ledger */}
      <div className="bento-card overflow-hidden p-4 sm:p-6">
        <SectionHeader
          title="Inventory Ledger"
          caption={
            meta.total > 0
              ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
              : 'Your product catalog'
          }
          className="px-2 pt-2"
        />
        <div className="overflow-x-auto">
          <table className="bento-table min-w-full">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all products"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th>Product</th>
                <th className="hidden 2xl:table-cell">SKU</th>
                <th>
                  <button
                    onClick={() => {
                      setSortBy('price');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                    className="inline-flex items-center gap-1 uppercase tracking-[0.2em] transition-colors hover:text-gray-900"
                  >
                    Price
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th>Stock</th>
                <th>Category</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="h-11 animate-pulse rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <Package className="h-7 w-7" strokeWidth={2.25} />
                    </div>
                    <p className="text-sm font-bold text-gray-500">
                      No products found. Create your first product to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const coverImage =
                    product.variants?.find((v) => v.isDefault)?.images?.[0] || product.images?.[0];
                  return (
                    <tr
                      key={product.id}
                      className={cn('group', selectedIds.has(product.id) && 'bg-brand-50/60')}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-foreground/[0.04] bg-gray-50 shadow-sm transition-transform group-hover:scale-105">
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
                          <div className="min-w-0 max-w-[18rem]">
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="block truncate text-sm font-black text-gray-900 transition-colors hover:text-brand-600"
                            >
                              {product.name}
                            </Link>
                            <p className="truncate text-[11px] font-bold text-gray-500">
                              <span className="tracking-wider 2xl:hidden">{product.sku}</span>
                              {product.brand && (
                                <>
                                  <span className="2xl:hidden"> · </span>
                                  {product.brand.name}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap text-xs font-bold tracking-wider text-gray-500 2xl:table-cell">
                        {product.sku}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black tabular-nums tracking-tighter text-gray-900">
                            {formatBDT(Number(product.price))}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-[11px] font-bold text-gray-400 line-through">
                              {formatBDT(Number(product.compareAtPrice))}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <StockBadge product={product} />
                      </td>
                      <td className="whitespace-nowrap">
                        {product.category?.name ? (
                          <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600">
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.slug}`}
                            target="_blank"
                            className="rounded-xl p-2 text-gray-400 transition-all hover:bg-card hover:text-gray-900 hover:shadow-md"
                            title="View on store"
                            aria-label={`View ${product.name} on store`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="rounded-xl p-2 text-gray-400 transition-all hover:bg-card hover:text-gray-900 hover:shadow-md"
                            title="Edit"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteOne(product.id, product.name)}
                            className="rounded-xl p-2 text-gray-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                            aria-label={`Delete ${product.name}`}
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
          <div className="mt-4 flex flex-col gap-4 border-t border-foreground/[0.04] px-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-bold text-gray-500">
              Showing <span className="text-gray-900">{rangeStart}</span> to{' '}
              <span className="text-gray-900">{rangeEnd}</span> of{' '}
              <span className="text-gray-900">{meta.total}</span> products
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="btn btn-soft btn-sm"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    aria-current={pageNum === page ? 'page' : undefined}
                    className={cn(
                      'flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-xs font-black tabular-nums transition-all',
                      pageNum === page
                        ? 'bg-primary text-white shadow-brand-glow'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="btn btn-dark btn-sm"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
