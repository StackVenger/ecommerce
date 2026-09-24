import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// List pagination — "Showing x–y of n" + soft Prev / numbered / dark Next
// pills, matching the reference ledger footer.
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
        'mt-2 flex flex-col gap-3 border-t border-foreground/[0.04] px-2 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-[11px] font-bold text-gray-500">
        Showing{' '}
        <span className="text-gray-900">
          {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
        </span>{' '}
        of <span className="text-gray-900">{total}</span> {noun}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-soft btn-sm"
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
              'h-9 min-w-[2.25rem] rounded-xl px-3 text-xs font-black tabular-nums transition-all',
              p === page
                ? 'bg-primary text-white shadow-brand-glow'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-dark btn-sm"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
