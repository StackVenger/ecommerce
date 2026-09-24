'use client';

import { useEffect } from 'react';

import { reportError } from '@/lib/error-reporting';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Report error to tracking service
    reportError(error, {
      component: 'RootErrorBoundary',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bento-card w-full max-w-md p-8 text-center sm:p-10">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-rose-50">
          <svg
            className="h-10 w-10 text-rose-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <p className="eyebrow mb-3">Unexpected error</p>
        <h1 className="mb-3 text-3xl font-black tracking-tighter text-gray-900">
          Something went wrong!
        </h1>
        <p className="mb-2 font-bold text-gray-600">কিছু একটা সমস্যা হয়েছে!</p>
        <p className="mb-8 text-sm font-medium text-gray-500">
          We apologize for the inconvenience. Our team has been notified and is working on a fix.
        </p>

        {error.digest && (
          <p className="mb-6 inline-block rounded-xl bg-gray-100 px-3 py-1 font-mono text-[11px] font-bold text-gray-500">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className="btn btn-primary">
            Try Again
          </button>
          <a href="/" className="btn btn-soft">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
