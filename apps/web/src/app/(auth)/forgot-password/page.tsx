'use client';

import {
  Button,
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
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">Check your email</h1>
          <p className="text-sm font-medium text-gray-500">
            We sent a password reset link to{' '}
            <span className="font-black text-gray-900">{submittedEmail}</span>. Please check your
            inbox and click the link to reset your password.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              type="button"
              className="font-black text-primary hover:underline"
              onClick={() => {
                setIsSubmitted(false);
                form.reset();
              }}
            >
              try again with a different email
            </button>
            .
          </p>

          <Link href="/login" className="btn btn-soft btn-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ──────────────────────────────────────────

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm font-bold text-gray-500">
          No worries! Enter the email address associated with your account and we&apos;ll send you a
          link to reset your password.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
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
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
          </Button>
        </form>
      </Form>

      {/* Back to login */}
      <div className="text-center">
        <Link href="/login" className="btn btn-soft btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
