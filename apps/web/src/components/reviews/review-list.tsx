'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  createdAt: string;
  // The API mirrors the DB column name. Older code referenced
  // `adminResponse` which never matched — the block stayed hidden.
  adminReply: string | null;
  repliedAt: string | null;
  user: { id: string; firstName: string; lastName: string };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

interface Props {
  productId: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-sm';
  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-gray-600">{label}</span>
      <span className="text-yellow-400">★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
    </div>
  );
}

export function ReviewList({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/reviews/product/${productId}/stats`)
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/reviews/product/${productId}?page=${page}&limit=10&sortBy=${sortBy}`)
      .then(({ data }) => {
        setReviews(data.data.reviews);
        setTotalPages(data.data.pagination.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, page, sortBy]);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="flex flex-col gap-6 rounded-lg border p-6 md:flex-row">
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{stats.averageRating}</span>
            <StarRating rating={Math.round(stats.averageRating)} size="lg" />
            <span className="mt-1 text-sm text-gray-500">{stats.totalReviews} reviews</span>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => (
              <RatingBar
                key={rating}
                label={rating}
                count={stats.ratingDistribution[rating] ?? 0}
                total={stats.totalReviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            setPage(1);
          }}
          className="rounded-md border-gray-300 text-sm shadow-sm"
        >
          <option value="newest">Most Recent</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-gray-400">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <StarRating rating={review.rating} />
                  {review.title && (
                    <h4 className="mt-1 font-medium text-gray-900">{review.title}</h4>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>

              {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}

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

              <p className="mt-2 text-xs text-gray-400">
                By {review.user.firstName} {review.user.lastName}
              </p>

              {review.adminReply && (
                <div className="mt-3 rounded-md bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-700">Store Response</p>
                    {review.repliedAt && (
                      <span className="text-xs text-blue-500">
                        {new Date(review.repliedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-blue-600">{review.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center px-2 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
