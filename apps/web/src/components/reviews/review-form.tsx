'use client';

import { CheckCircle2, Loader2, PenSquare, Send, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Props {
  productId: string;
  onSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

const TITLE_MAX = 100;
const COMMENT_MAX = 2000;

export function ReviewForm({ productId, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setMessage('Please select a rating');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await apiClient.post('/reviews', {
        productId,
        rating,
        title: title || undefined,
        comment: comment || undefined,
      });

      setSuccess(true);
      setMessage('Thank you! Your review has been submitted for moderation.');
      toast.success('Review submitted successfully');
      setRating(0);
      setTitle('');
      setComment('');
      onSubmitted?.();
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Failed to submit review. Please try again.');
      setMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Review submitted</h3>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
      </div>
    );
  }

  const activeRating = hoverRating || rating;
  const titleNearMax = title.length >= TITLE_MAX * 0.9;
  const commentNearMax = comment.length >= COMMENT_MAX * 0.9;

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]"
    >
      {/* Header strip */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-teal-50/60 via-white to-white px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PenSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Write a review</h3>
          <p className="text-xs text-gray-500">Share your honest experience with other shoppers.</p>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {/* Star Rating Input */}
        <div>
          <label className="block text-sm font-medium text-gray-800">
            Your rating <span className="text-rose-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  className="group rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= activeRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-gray-300 group-hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span
              className={`ml-2 inline-flex min-w-[5.5rem] items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeRating ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400'
              }`}
            >
              {activeRating ? RATING_LABELS[activeRating] : 'Tap a star'}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-800">
            Headline <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="relative mt-2">
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Sum up your review in a few words"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 pr-16 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span
              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums ${
                titleNearMax ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {title.length}/{TITLE_MAX}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="review-comment" className="block text-sm font-medium text-gray-800">
            Your review <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="relative mt-2">
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={COMMENT_MAX}
              rows={5}
              placeholder="What did you like or dislike? How did it perform?"
              className="block w-full resize-y rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span
              className={`pointer-events-none absolute bottom-3 right-4 text-[11px] tabular-nums ${
                commentNearMax ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {comment.length}/{COMMENT_MAX}
            </span>
          </div>
        </div>

        {message && !success && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
            <span aria-hidden className="mt-0.5">
              ⚠
            </span>
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Footer / submit row */}
      <div className="flex flex-col items-stretch gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          Reviews are published after moderation. Only verified purchasers can post.
        </p>
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit review
            </>
          )}
        </button>
      </div>
    </form>
  );
}
