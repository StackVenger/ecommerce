'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface Props {
  productId: string;
  onSubmitted?: () => void;
}

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
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-700">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>

      {/* Star Rating Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Your Rating</label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="text-2xl transition-colors"
            >
              <span
                className={star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}
              >
                ★
              </span>
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 self-center text-sm text-gray-500">
              {rating === 1
                ? 'Poor'
                : rating === 2
                  ? 'Fair'
                  : rating === 3
                    ? 'Good'
                    : rating === 4
                      ? 'Very Good'
                      : 'Excellent'}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Review Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Summarize your experience"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Your Review</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="What did you like or dislike about this product?"
        />
        <p className="mt-1 text-xs text-gray-400">{comment.length}/2000</p>
      </div>

      {message && (
        <p className={`text-sm ${message.includes('Thank') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>

      <p className="text-xs text-gray-400">
        Your review will be published after moderation. You must have purchased this product to
        leave a review.
      </p>
    </form>
  );
}
