'use client';

import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface AdminQuestion {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  answerer: { id: string; firstName: string; lastName: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'answered', label: 'Answered' },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]['key'];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState<StatusKey>('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('status', status);
      const { data } = await apiClient.get(`/product-questions/admin?${params}`);
      const result = data.data ?? data;
      setQuestions(result.questions ?? []);
      setPagination(result.pagination ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load questions'));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const submitAnswer = async (id: string) => {
    const text = (drafts[id] ?? '').trim();
    if (text.length < 2) {
      toast.error('Answer must not be empty');
      return;
    }
    setBusyId(id);
    try {
      await apiClient.post(`/product-questions/${id}/answer`, { answer: text });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setRespondingId(null);
      toast.success('Answer posted');
      await fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to post answer'));
    } finally {
      setBusyId(null);
    }
  };

  const removeQuestion = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this question?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    setBusyId(id);
    try {
      await apiClient.delete(`/product-questions/${id}`);
      toast.success('Question deleted');
      await fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete question'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Questions</h1>
        <p className="text-sm text-gray-500">Answer customer questions on product pages</p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatus(tab.key);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              status === tab.key
                ? 'bg-teal-600 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            No questions found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((q) => (
              <article key={q.id} className="space-y-3 px-5 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${q.product.slug}`}
                      className="text-xs font-medium text-primary hover:underline"
                      target="_blank"
                    >
                      {q.product.name}
                    </Link>
                    <p className="mt-1 whitespace-pre-line text-gray-900">{q.question}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Asked by {q.user ? `${q.user.firstName} ${q.user.lastName}` : 'User'}
                      {q.user?.email ? ` (${q.user.email})` : ''} ·{' '}
                      {new Date(q.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    disabled={busyId === q.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>

                {q.answer ? (
                  <div className="rounded-lg bg-teal-50 px-3 py-2">
                    <p className="whitespace-pre-line text-sm text-gray-800">{q.answer}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Answered by{' '}
                      {q.answerer ? `${q.answerer.firstName} ${q.answerer.lastName}` : 'Admin'}
                      {q.answeredAt
                        ? ` · ${new Date(q.answeredAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRespondingId(q.id);
                        setDrafts((prev) => ({ ...prev, [q.id]: q.answer ?? '' }));
                      }}
                      className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      Edit response
                    </button>
                  </div>
                ) : null}

                {(respondingId === q.id || !q.answer) && (
                  <div className="space-y-2">
                    <textarea
                      value={drafts[q.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write a public answer…"
                      rows={3}
                      maxLength={2000}
                      disabled={busyId === q.id}
                      className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
                    />
                    <div className="flex justify-end gap-2">
                      {respondingId === q.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setRespondingId(null);
                            setDrafts((prev) => {
                              const next = { ...prev };
                              delete next[q.id];
                              return next;
                            });
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => submitAnswer(q.id)}
                        disabled={busyId === q.id || (drafts[q.id] ?? '').trim().length < 2}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {busyId === q.id ? 'Posting…' : q.answer ? 'Update answer' : 'Post answer'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
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
            <span className="px-3 text-sm text-gray-600">
              Page {pagination.page} / {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
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
