'use client';

import {
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ecommerce/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { forgotPassword } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Watch-theme overrides for the shared form primitives: hairline, square inputs.
const INPUT_CLASS =
  'h-11 border-gray-300 font-normal shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary';
const LABEL_CLASS = 'text-sm font-medium';

// ──────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword({ email: values.email });
      setSubmittedEmail(values.email);
      setIsSubmitted(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Don't reveal whether the email exists — show success anyway
        // unless it's a rate-limit or server error
        if (error.status === 429) {
          setServerError('Too many requests. Please wait a few minutes before trying again.');
        } else if (error.isServerError) {
          setServerError('Something went wrong on our end. Please try again later.');
        } else {
          // For security: show success even if email is not found
          setSubmittedEmail(values.email);
          setIsSubmitted(true);
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ───────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="w-full space-y-6 border border-gray-200 bg-card p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Mail className="h-7 w-7 text-primary" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold text-gray-900 sm:text-[1.75rem]">
            Check your email
          </h1>
          <p className="text-sm text-gray-500">
            We sent a password reset link to{' '}
            <span className="font-medium text-gray-900">{submittedEmail}</span>. Please check your
            inbox and click the link to reset your password.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setIsSubmitted(false);
                form.reset();
              }}
            >
              try again with a different email
            </button>
            .
          </p>

          <Link href="/login" className="btn btn-secondary btn-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ──────────────────────────────────────────

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold text-gray-900 sm:text-[1.75rem]">
          Forgot your password?
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          No worries! Enter the email address associated with your account and we&apos;ll send you a
          link to reset your password.
        </p>
      </div>

      <div className="border border-gray-200 bg-card p-5 sm:p-7">
        {/* Server error */}
        {serverError && (
          <div className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {serverError}
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      className={INPUT_CLASS}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button type="submit" className="btn btn-dark btn-lg w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
            </button>
          </form>
        </Form>

        {/* Back to login */}
        <div className="mt-6 border-t border-gray-200 pt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-700 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
