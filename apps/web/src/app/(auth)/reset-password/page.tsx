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
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPassword } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ──────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // ── Missing token ───────────────────────────────────────

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">Invalid reset link</h1>
        <p className="text-sm font-medium text-gray-500">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button asChild className="w-full max-w-xs">
            <Link href="/forgot-password">Request new reset link</Link>
          </Button>
          <Link href="/login" className="btn btn-soft btn-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Submit handler ──────────────────────────────────────

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await resetPassword({
        token: token!,
        newPassword: values.password,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 400 && error.code === 'TOKEN_EXPIRED') {
          setServerError('This reset link has expired. Please request a new one.');
        } else if (error.details) {
          Object.entries(error.details).forEach(([field, messages]) => {
            form.setError(field as keyof ResetPasswordFormValues, {
              message: messages[0],
            });
          });
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ───────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">
            Password reset successful
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </div>

        <Button className="w-full max-w-xs" onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  // ── Form state ──────────────────────────────────────────

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">Set a new password</h1>
        <p className="mt-2 text-sm font-bold text-gray-500">
          Your new password must be different from previously used passwords.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {serverError}
          {serverError.includes('expired') && (
            <Link
              href="/forgot-password"
              className="mt-1 block font-black text-primary hover:underline"
            >
              Request a new link
            </Link>
          )}
        </div>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* New password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm new password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting password...' : 'Reset password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
