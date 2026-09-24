'use client';

import { useEffect } from 'react';

import { reportError } from '@/lib/error-reporting';

interface AdminErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorPageProps) {
  useEffect(() => {
    reportError(error, {
      component: 'AdminErrorBoundary',
      section: 'admin',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-2 sm:p-6">
      <div className="bento-card w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
          <svg
            className="h-8 w-8 text-rose-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-2xl font-black tracking-tight text-gray-900">Admin Panel Error</h2>
        <p className="mb-6 text-sm font-bold text-gray-500">
          An error occurred in the admin panel. This has been logged and our team will investigate.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-[1.25rem] bg-rose-50 p-4 text-left">
            <p className="break-all font-mono text-sm text-rose-700">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 max-h-40 overflow-auto text-xs text-rose-600">{error.stack}</pre>
            )}
          </div>
        )}

        {error.digest && <p className="eyebrow mb-4">Reference: {error.digest}</p>}

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Retry
          </button>
          <a href="/admin" className="btn btn-soft">
            Admin Home
          </a>
        </div>
      </div>
    </div>
  );
}
