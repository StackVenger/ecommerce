'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

/**
 * Reusable admin data table. Every existing list page (products, orders,
 * customers, coupons, reviews) re-implements `<table>` markup with
 * bespoke sort/select state — this component consolidates that into one
 * pattern so future migrations flow through a single, testable surface.
 *
 * Kept headless: no opinions about row actions, filters, pagination or
 * server-vs-client sorting. Callers pass columns with `accessor` +
 * optional `render` + optional `sortKey`. Multi-row selection is opt-in
 * via `enableSelection`. If you need server-side sort, pass `sort` and
 * `onSortChange` and handle it yourself.
 */

export interface DataTableColumn<Row> {
  /** Column header label. */
  header: ReactNode;
  /** Unique id used for sort state and keying. */
  id: string;
  /**
   * Key on the row (for built-in client-side sort) OR a deriver
   * function returning the sort value. Provide `undefined` for a
   * non-sortable column (e.g. an actions column).
   */
  sortKey?: keyof Row | ((row: Row) => string | number | boolean | null);
  /** Cell renderer; defaults to `row[column.id]` when omitted. */
  render?: (row: Row) => ReactNode;
  /** Tailwind class applied to both `<th>` and matching `<td>`. */
  className?: string;
}

export interface DataTableSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<Row> {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  /** Stable identity per row for React keying + selection. */
  rowId: (row: Row) => string;
  /** Optional row-click handler (often used to navigate to detail). */
  onRowClick?: (row: Row) => void;
  /** Empty-state content when `rows` is empty. */
  empty?: ReactNode;
  /** If true, renders a leading checkbox column with select-all. */
  enableSelection?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Controlled sort state; omit to keep sort internal. */
  sort?: DataTableSort;
  onSortChange?: (next: DataTableSort | null) => void;
  /** Loading skeleton rows. */
  loading?: boolean;
  loadingRows?: number;
}

export function DataTable<Row>({
  rows,
  columns,
  rowId,
  onRowClick,
  empty,
  enableSelection,
  selected,
  onSelectedChange,
  sort,
  onSortChange,
  loading,
  loadingRows = 5,
}: DataTableProps<Row>) {
  const [internalSort, setInternalSort] = useState<DataTableSort | null>(null);
  const effectiveSort = sort ?? internalSort;

  const sorted = useMemo(() => {
    if (!effectiveSort) {
      return rows;
    }
    const col = columns.find((c) => c.id === effectiveSort.columnId);
    if (!col || !col.sortKey) {
      return rows;
    }

    const get =
      typeof col.sortKey === 'function'
        ? col.sortKey
        : (row: Row) => row[col.sortKey as keyof Row] as unknown;

    const dir = effectiveSort.direction === 'asc' ? 1 : -1;
    const isNil = (v: unknown) => v === null || v === undefined;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      // Treat null/undefined as larger than any real value so they sort
      // to the bottom on ascending order, to the top on descending.
      if (isNil(va) && isNil(vb)) {
        return 0;
      }
      if (isNil(va)) {
        return 1;
      }
      if (isNil(vb)) {
        return -1;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, columns, effectiveSort]);

  const toggleSort = (columnId: string) => {
    const current = effectiveSort;
    let next: DataTableSort | null;
    if (!current || current.columnId !== columnId) {
      next = { columnId, direction: 'asc' };
    } else if (current.direction === 'asc') {
      next = { columnId, direction: 'desc' };
    } else {
      next = null;
    }
    if (onSortChange) {
      onSortChange(next);
    } else {
      setInternalSort(next);
    }
  };

  const allIds = useMemo(() => new Set(rows.map(rowId)), [rows, rowId]);
  const allSelected =
    enableSelection && selected && allIds.size > 0 && allIds.size === selected.size;
  const someSelected = enableSelection && selected && selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectedChange) {
      return;
    }
    onSelectedChange(allSelected ? new Set<string>() : new Set(allIds));
  };

  const toggleOne = (id: string) => {
    if (!onSelectedChange || !selected) {
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              {enableSelection && (
                <th scope="col" className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(allSelected)}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = Boolean(someSelected);
                      }
                    }}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = effectiveSort?.columnId === col.id;
                const dir = effectiveSort?.direction;
                return (
                  <th key={col.id} scope="col" className={`px-3 py-2 ${col.className ?? ''}`}>
                    {col.sortKey ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                      >
                        {col.header}
                        {isSorted && dir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : isSorted && dir === 'desc' ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`loading-${i}`} className="animate-pulse">
                  {enableSelection && (
                    <td className="px-3 py-3">
                      <div className="h-4 w-4 rounded bg-gray-100" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className={`px-3 py-3 ${col.className ?? ''}`}>
                      <div className="h-4 w-3/4 rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="px-3 py-12 text-center text-sm text-gray-500"
                >
                  {empty ?? 'No rows to display.'}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const id = rowId(row);
                const isSelected = selected?.has(id);
                return (
                  <tr
                    key={id}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={(e) => {
                      // Ignore clicks that originated from form controls.
                      const target = e.target as HTMLElement;
                      if (target.closest('a, button, input, label, [role="button"]')) {
                        return;
                      }
                      onRowClick?.(row);
                    }}
                  >
                    {enableSelection && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(isSelected)}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className={`px-3 py-3 text-gray-700 ${col.className ?? ''}`}>
                        {col.render
                          ? col.render(row)
                          : (() => {
                              const val = (row as Record<string, unknown>)[col.id];
                              return val === null || val === undefined ? '' : String(val);
                            })()}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
