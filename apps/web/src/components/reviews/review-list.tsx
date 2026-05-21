'use client';

import { BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, ThumbsUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  createdAt: string;
  isVerified: boolean;
  adminReply: string | null;
  repliedAt: string | null;
  helpfulCount: number;
  viewerHasMarkedHelpful: boolean;
  user: { id: string; firstName: string; lastName: string };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

type SortKey = 'newest' | 'helpful' | 'highest' | 'lowest';

interface Props {
  productId: string;
}

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Most Recent',
  helpful: 'Relevance',
  highest: 'Highest Rating',
  lowest: 'Lowest Rating',
};

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-base';
  return (
    <div className={`flex gap-0.5 leading-none ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

function DistributionRow({
  rating,
  count,
  total,
  active,
  onClick,
}: {
  rating: number;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded px-1 py-0.5 text-left transition-colors ${
        active ? 'bg-yellow-50' : 'hover:bg-gray-50'
      }`}
    >
      <Stars rating={rating} />
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm text-gray-600">{count}</span>
    </button>
  );
}

function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) {
    return 'just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  }
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayName(u: Review['user']): string {
  const first = u.firstName?.trim() ?? '';
  const last = u.lastName?.trim() ?? '';
  if (!first && !last) {
    return 'Anonymous';
  }
  // Mask the surname middle the way the Daraz layout does ("R***a") so
  // the reviewer's full name isn't surfaced publicly.
  const lastMasked = last.length > 1 ? `${last[0]}***${last[last.length - 1]}` : last;
  return `${first} ${lastMasked}`.trim();
}

export function ReviewList({ productId }: Props) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('helpful');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [helpfulBusy, setHelpfulBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiClient
      .get(`/reviews/product/${productId}/stats`)
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, [productId]);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    params.set('sortBy', sortBy);
    if (ratingFilter) {
      params.set('rating', String(ratingFilter));
    }
    apiClient
      .get(`/reviews/product/${productId}?${params.toString()}`)
      .then(({ data }) => {
        setReviews(data.data.reviews);
        setTotalPages(data.data.pagination.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, page, sortBy, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const toggleHelpful = useCallback(
    async (reviewId: string) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to mark reviews helpful');
        return;
      }
      if (helpfulBusy.has(reviewId)) {
        return;
      }
      setHelpfulBusy((prev) => new Set(prev).add(reviewId));

      // Optimistic flip — revert on failure.
      const before = reviews;
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                viewerHasMarkedHelpful: !r.viewerHasMarkedHelpful,
                helpfulCount: r.helpfulCount + (r.viewerHasMarkedHelpful ? -1 : 1),
              }
            : r,
        ),
      );

      try {
        const { data } = await apiClient.post(`/reviews/${reviewId}/helpful`);
        const result = data.data;
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, viewerHasMarkedHelpful: result.marked, helpfulCount: result.helpfulCount }
              : r,
          ),
        );
      } catch (err) {
        setReviews(before);
        toast.error(getApiErrorMessage(err, 'Could not update helpful vote'));
      } finally {
        setHelpfulBusy((prev) => {
          const next = new Set(prev);
          next.delete(reviewId);
          return next;
        });
      }
    },
    [helpfulBusy, isAuthenticated, reviews],
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) {
      return [] as Array<number | '...'>;
    }
    const cap = 5;
    if (totalPages <= cap) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const around = 1;
    const set = new Set<number>([1, totalPages, page]);
    for (let i = page - around; i <= page + around; i++) {
      if (i > 1 && i < totalPages) {
        set.add(i);
      }
    }
    const sorted = [...set].sort((a, b) => a - b);
    const result: Array<number | '...'> = [];
    sorted.forEach((n, idx) => {
      if (idx > 0 && n - (sorted[idx - 1] ?? n) > 1) {
        result.push('...');
      }
      result.push(n);
    });
    return result;
  }, [page, totalPages]);

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center md:pr-8 md:border-r md:border-gray-100">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">
                {stats.averageRating.toFixed(1)}
              </span>
              <span className="text-base text-gray-400">/5</span>
            </div>
            <div className="mt-2">
              <Stars rating={Math.round(stats.averageRating)} size="lg" />
            </div>
            <p className="mt-1 text-sm text-gray-500">{stats.totalReviews} Ratings</p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => (
              <DistributionRow
                key={rating}
                rating={rating}
                count={stats.ratingDistribution[rating] ?? 0}
                total={stats.totalReviews}
                active={ratingFilter === rating}
                onClick={() => {
                  setPage(1);
                  setRatingFilter((prev) => (prev === rating ? null : rating));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">Product Reviews</h3>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortOpen((v) => !v);
                setFilterOpen(false);
              }}
              className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-500">Sort:</span>
              <span className="font-medium">{SORT_LABELS[sortBy]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key);
                      setSortOpen(false);
                      setPage(1);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      sortBy === key ? 'bg-yellow-50 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Star filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setSortOpen(false);
              }}
              className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-500">Filter:</span>
              <span className="font-medium">
                {ratingFilter ? `${ratingFilter} star` : 'All star'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setRatingFilter(null);
                    setFilterOpen(false);
                    setPage(1);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    !ratingFilter ? 'bg-yellow-50 text-gray-900' : 'text-gray-700'
                  }`}
                >
                  All star
                </button>
                {[5, 4, 3, 2, 1].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRatingFilter(r);
                      setFilterOpen(false);
                      setPage(1);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      ratingFilter === r ? 'bg-yellow-50 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {r} star
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            No reviews match the current filter.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <article key={review.id} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Stars rating={review.rating} />
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">{displayName(review.user)}</span>
                      {review.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatRelativeDate(review.createdAt)}
                  </span>
                </div>

                {review.title && <h4 className="mt-3 font-medium text-gray-900">{review.title}</h4>}
                {review.comment && (
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{review.comment}</p>
                )}

                {review.images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {review.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Review image ${idx + 1}`}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}

                {review.adminReply && (
                  <div className="mt-3 rounded-md bg-blue-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-blue-700">Store Response</p>
                      {review.repliedAt && (
                        <span className="text-xs text-blue-500">
                          {formatRelativeDate(review.repliedAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-blue-600">{review.adminReply}</p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleHelpful(review.id)}
                    disabled={helpfulBusy.has(review.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                      review.viewerHasMarkedHelpful
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                    aria-pressed={review.viewerHasMarkedHelpful}
                    aria-label="Mark this review as helpful"
                  >
                    <ThumbsUp
                      className={`h-3.5 w-3.5 ${review.viewerHasMarkedHelpful ? 'fill-current' : ''}`}
                    />
                    <span>{review.helpfulCount}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`gap-${idx}`} className="px-2 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[2rem] rounded px-2 py-1 text-sm transition-colors ${
                    p === page ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
