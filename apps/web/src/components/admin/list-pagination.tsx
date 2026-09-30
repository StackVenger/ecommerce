import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// List pagination — "Showing x–y of n" + "Prev 1 2 3 Next" square boxes;
// the active page is a coral square.
// ──────────────────────────────────────────────────────────

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  /** Plural noun for the summary ("orders", "customers"). */
  noun: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ListPagination({
  page,
  totalPages,
  total,
  limit,
  noun,
  onPageChange,
  className,
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startPage = Math.max(1, page - 2);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => startPage + i).filter(
    (p) => p <= totalPages,
  );

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'mt-2 flex flex-col gap-3 border-t border-gray-200 px-2 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-gray-500">
        Showing{' '}
        <span className="font-medium text-gray-900">
          {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
        </span>{' '}
        of <span className="font-medium text-gray-900">{total}</span> {noun}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-9 border border-gray-200 bg-card px-3 text-sm text-gray-700 transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-[2.25rem] border px-2 text-sm tabular-nums transition-colors',
              p === page
                ? 'border-primary bg-primary font-semibold text-white'
                : 'border-gray-200 bg-card text-gray-700 hover:border-primary hover:text-primary',
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-9 border border-gray-200 bg-card px-3 text-sm text-gray-700 transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
