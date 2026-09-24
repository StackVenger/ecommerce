'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface NewsletterSignupProps {
  variant?: 'inline' | 'card' | 'footer';
  className?: string;
}

export function NewsletterSignup({ variant = 'card', className = '' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to subscribe');
      }

      setStatus('success');
      setEmail('');
      toast.success('Subscribed! Check your inbox for confirmation.');
    } catch (error) {
      setStatus('error');
      const msg =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  if (variant === 'inline') {
    return (
      <form
        onSubmit={handleSubmit}
        className={`flex gap-2 ${className}`}
        aria-label="Newsletter subscription"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="field-input flex-1"
          required
          disabled={status === 'loading' || status === 'success'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="btn btn-primary"
        >
          {status === 'loading'
            ? 'Subscribing...'
            : status === 'success'
              ? 'Subscribed!'
              : 'Subscribe'}
        </button>
      </form>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`${className}`}>
        <h3 className="mb-1 text-lg font-black tracking-tight text-white">
          Subscribe to our newsletter
        </h3>
        <p className="mb-1 text-sm font-medium text-white/50 font-bengali">
          আমাদের নিউজলেটারে সাবস্ক্রাইব করুন
        </p>
        <p className="mb-4 text-sm font-bold text-white/60">
          Get the latest deals and new arrivals delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-bold">
              Thank you for subscribing! / সাবস্ক্রাইব করার জন্য ধন্যবাদ!
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white outline-none backdrop-blur-md transition-all placeholder:text-white/40 focus:border-white/30 focus:ring-4 focus:ring-primary/20"
              required
              disabled={status === 'loading'}
            />
            <button type="submit" disabled={status === 'loading'} className="btn btn-primary">
              {status === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && errorMessage && (
          <p className="mt-2 text-xs font-bold text-rose-400">{errorMessage}</p>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`bento-primary p-8 sm:p-10 ${className}`}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/10 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-3xl font-black tracking-tighter">Stay in the Loop</h2>
        <p className="mb-1 text-sm font-medium text-white/70 font-bengali">
          সর্বশেষ আপডেট পেতে সাবস্ক্রাইব করুন
        </p>
        <p className="mb-6 text-sm font-bold text-white/80">
          Subscribe for exclusive deals, new arrivals, and special offers delivered straight to your
          inbox.
        </p>

        {status === 'success' ? (
          <div className="rounded-[1.5rem] bg-white/15 p-6 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-lg font-black tracking-tight">You&apos;re subscribed!</span>
            </div>
            <p className="text-sm font-bold text-white/80">
              Thank you! Check your inbox for a confirmation email.
            </p>
            <p className="mt-1 text-sm font-medium text-white/70 font-bengali">
              ধন্যবাদ! নিশ্চিতকরণ ইমেইল পরীক্ষা করুন।
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/15 px-5 py-3 text-sm font-medium text-white outline-none backdrop-blur-md transition-all placeholder:text-white/60 focus:border-white/40 focus:ring-4 focus:ring-white/20"
                required
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn bg-card px-8 py-3 text-primary shadow-xl shadow-black/10 hover:scale-[1.02]"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Subscribing...
                  </span>
                ) : (
                  'Subscribe'
                )}
              </button>
            </form>

            {status === 'error' && errorMessage && (
              <p className="mt-3 text-xs font-bold text-white">{errorMessage}</p>
            )}

            <p className="mt-4 text-[11px] font-bold text-white/60">
              No spam, unsubscribe anytime. By subscribing you agree to our Privacy Policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
