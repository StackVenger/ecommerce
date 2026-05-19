'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  adminReply: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  product: { id: string; name: string; slug: string; images: string[] };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (status !== 'ALL') {
        params.set('status', status);
      }

      const { data } = await apiClient.get(`/admin/reviews?${params}`);
      const result = data.data ?? data;
      setReviews(result.reviews ?? result ?? []);
      setPagination(result.pagination ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, status]);

  const moderate = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.patch(`/admin/reviews/${id}/moderate`, { status: newStatus });
      fetchReviews();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update review status'));
    }
  };

  const submitResponse = async (id: string) => {
    if (!responseText.trim()) {
      return;
    }
    try {
      await apiClient.post(`/admin/reviews/${id}/respond`, { response: responseText });
      setRespondingId(null);
      setResponseText('');
      fetchReviews();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit response'));
    }
  };

  const deleteReview = async (id: string) => {
    const ok = await confirm({
      title: 'Permanently delete this review?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/reviews/${id}`);
      fetchReviews();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete review'));
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
        <p className="text-sm text-gray-500">
          {pagination ? `${pagination.total} reviews` : 'Loading...'}
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              status === tab
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-12 text-center text-gray-400">No reviews found</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  {review.product.images?.[0] && (
                    <img
                      src={review.product.images[0]}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{review.product.name}</p>
                    <p className="text-xs text-gray-500">
                      by {review.user.firstName} {review.user.lastName} ({review.user.email})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(review.status)}`}
                  >
                    {review.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex gap-0.5 text-sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= review.rating ? 'text-yellow-400' : 'text-gray-300'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {review.title && <p className="mt-1 font-medium text-gray-800">{review.title}</p>}
                {review.comment && <p className="mt-1 text-sm text-gray-600">{review.comment}</p>}
              </div>

              {review.adminReply && (
                <div className="mt-3 rounded-md bg-teal-50 p-3">
                  <p className="text-xs font-medium text-teal-700">Your Response</p>
                  <p className="text-sm text-teal-600">{review.adminReply}</p>
                </div>
              )}

              {/* Response Form */}
              {respondingId === review.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write a response..."
                    className="flex-1 rounded-md border-gray-300 text-sm shadow-sm"
                  />
                  <button
                    onClick={() => submitResponse(review.id)}
                    className="rounded-md bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setRespondingId(null)}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2 border-t pt-3">
                {review.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => moderate(review.id, 'APPROVED')}
                      className="rounded-md bg-green-50 px-3 py-1 text-sm text-green-600 hover:bg-green-100"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => moderate(review.id, 'REJECTED')}
                      className="rounded-md bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setRespondingId(review.id)}
                  className="rounded-md bg-gray-50 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Respond
                </button>
                <button
                  onClick={() => deleteReview(review.id)}
                  className="ml-auto rounded-md px-3 py-1 text-sm text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
