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
    <section className="bento-card overflow-hidden">
      <header className="flex items-center gap-3 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="icon-tile h-10 w-10 rounded-xl bg-brand-50 text-brand-600">
          <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Questions about this product ({total})</h2>
          <p className="eyebrow mt-1">Ask the store · community answers</p>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-8">
        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="bento-tile space-y-3 p-3 sm:p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about this product…"
              rows={3}
              maxLength={1000}
              disabled={submitting}
              className="field-input resize-none rounded-[1.25rem]"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold tabular-nums text-gray-400">
                {draft.length}/1000
              </span>
              <button
                type="submit"
                disabled={submitting || draft.trim().length < 5}
                className="btn btn-primary btn-sm"
              >
                {submitting ? 'Posting…' : 'Post question'}
              </button>
            </div>
          </form>
        ) : (
          <p className="bento-tile px-5 py-4 text-sm font-bold text-gray-600">
            <Link
              href={`/login?redirect=/products/${productSlug ?? ''}`}
              className="font-black text-brand-700 hover:underline"
            >
              Login
            </Link>{' '}
            or{' '}
            <Link
              href={`/register?redirect=/products/${productSlug ?? ''}`}
              className="font-black text-brand-700 hover:underline"
            >
              Register
            </Link>{' '}
            to ask questions
          </p>
        )}
      </div>

      {answeredCount > 0 && (
        <p className="eyebrow border-t border-foreground/[0.04] px-5 py-4 sm:px-8">
          Other questions answered by the store ({answeredCount})
        </p>
      )}

      <div className="divide-y divide-foreground/[0.04] border-t border-foreground/[0.04]">
        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="px-5 py-4 sm:px-8">
                <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
              </div>
            ))}
          </>
        ) : questions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm font-bold text-gray-400">
            No questions yet — be the first to ask!
          </p>
        ) : (
          questions.map((q) => (
            <article
              key={q.id}
              className="space-y-3 px-5 py-5 text-sm transition-colors hover:bg-gray-50/60 sm:px-8"
            >
              <div className="flex gap-3">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-white shadow-brand-glow"
                  aria-label="Question"
                >
                  Q
                </span>
                <div className="min-w-0">
                  <p className="whitespace-pre-line font-bold text-gray-900">{q.question}</p>
                  <p className="mt-1 text-[11px] font-bold text-gray-400">
                    {displayName(q.user)} · {formatDate(q.createdAt)}
                  </p>
                </div>
              </div>

              {q.answer ? (
                <div className="bento-tile ml-4 flex gap-3 p-4 sm:ml-11">
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-ink text-xs font-black text-white"
                    aria-label="Answer"
                  >
                    A
                  </span>
                  <div className="min-w-0">
                    <p className="whitespace-pre-line font-medium text-gray-800">{q.answer}</p>
                    <p className="mt-1 text-[11px] font-bold text-gray-400">
                      {displayName(q.answerer)} ·{' '}
                      {q.answeredAt ? relativeDays(q.createdAt, q.answeredAt) : 'Answered'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="pl-11 text-[11px] font-bold italic text-gray-400">
                  <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                  Awaiting reply from the store
                </p>
              )}
            </article>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-foreground/[0.04] px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-icon h-9 w-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((p, idx) =>
            p === '...' ? (
              <span key={`gap-${idx}`} className="px-2 text-sm font-bold text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`h-9 min-w-[2.25rem] rounded-xl px-2 text-xs font-black tabular-nums transition-all ${
                  p === page
                    ? 'bg-ink text-white shadow-lg shadow-black/10'
                    : 'text-gray-600 hover:bg-gray-100'
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
            className="btn-icon h-9 w-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
