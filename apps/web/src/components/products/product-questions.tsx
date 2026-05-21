'use client';

import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  askProductQuestion,
  fetchProductQuestions,
  type ProductQuestion,
} from '@/lib/api/product-questions';

interface Props {
  productId: string;
  productSlug?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayName(u: ProductQuestion['user'] | ProductQuestion['answerer']): string {
  if (!u) {
    return 'User';
  }
  const first = u.firstName?.trim() ?? '';
  const last = u.lastName?.trim() ?? '';
  if (!first && !last) {
    return 'User';
  }
  return `${first} ${last}`.trim();
}

function relativeDays(askedAt: string, answeredAt: string): string {
  const diffDays = Math.max(
    1,
    Math.round((new Date(answeredAt).getTime() - new Date(askedAt).getTime()) / 86_400_000),
  );
  return `Answered within ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

export function ProductQuestions({ productId, productSlug }: Props) {
  const { isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProductQuestions(productId, { page, limit: 10 });
      setQuestions(result.questions);
      setTotal(result.pagination.total);
      setPages(result.pagination.pages);
      setAnsweredCount(result.answeredCount);
    } catch {
      // Silent — the section degrades gracefully when the call fails.
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length < 5) {
      toast.error('Question must be at least 5 characters');
      return;
    }
    setSubmitting(true);
    try {
      await askProductQuestion(productId, trimmed);
      setDraft('');
      toast.success('Question submitted');
      setPage(1);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit question'));
    } finally {
      setSubmitting(false);
    }
  };

  const pageNumbers = useMemo(() => {
    if (pages <= 1) {
      return [] as Array<number | '...'>;
    }
    if (pages <= 5) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, pages, page]);
    for (let i = page - 1; i <= page + 1; i++) {
      if (i > 1 && i < pages) {
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
  }, [page, pages]);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 bg-gray-50 px-5 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          Questions about this product ({total})
        </h2>
      </header>

      <div className="px-5 py-4">
        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about this product…"
              rows={3}
              maxLength={1000}
              disabled={submitting}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{draft.length}/1000</span>
              <button
                type="submit"
                disabled={submitting || draft.trim().length < 5}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Posting…' : 'Post question'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-600">
            <Link
              href={`/login?redirect=/products/${productSlug ?? ''}`}
              className="font-medium text-primary hover:underline"
            >
              Login
            </Link>{' '}
            or{' '}
            <Link
              href={`/register?redirect=/products/${productSlug ?? ''}`}
              className="font-medium text-primary hover:underline"
            >
              Register
            </Link>{' '}
            to ask questions
          </p>
        )}
      </div>

      {answeredCount > 0 && (
        <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-700">
          Other questions answered by the store ({answeredCount})
        </p>
      )}

      <div className="divide-y divide-gray-100">
        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-gray-50" />
            ))}
          </>
        ) : questions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No questions yet — be the first to ask!
          </p>
        ) : (
          questions.map((q) => (
            <article key={q.id} className="space-y-3 px-5 py-4 text-sm">
              <div className="flex gap-3">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-teal-600 text-xs font-bold text-white"
                  aria-label="Question"
                >
                  Q
                </span>
                <div className="min-w-0">
                  <p className="whitespace-pre-line text-gray-900">{q.question}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {displayName(q.user)} · {formatDate(q.createdAt)}
                  </p>
                </div>
              </div>

              {q.answer ? (
                <div className="flex gap-3 pl-4">
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-200 text-xs font-bold text-gray-700"
                    aria-label="Answer"
                  >
                    A
                  </span>
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-gray-800">{q.answer}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {displayName(q.answerer)} ·{' '}
                      {q.answeredAt ? relativeDays(q.createdAt, q.answeredAt) : 'Answered'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="pl-10 text-xs italic text-gray-400">
                  <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                  Awaiting reply from the store
                </p>
              )}
            </article>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-5 py-3">
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
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
