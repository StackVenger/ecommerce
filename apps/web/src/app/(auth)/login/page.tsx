'use client';

import {
  Button,
  Checkbox,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ecommerce/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { SocialLoginButtons } from '@/components/auth/social-login-buttons';
import { useAuth } from '@/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ──────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const { login, isSubmitting } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      toast.success('Welcome back!');
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          toast.error('Invalid email or password');
          setServerError('Invalid email or password. Please try again.');
        } else if (error.status === 403) {
          toast.error('Account suspended');
          setServerError('Your account has been suspended. Please contact support.');
        } else if (error.details) {
          Object.entries(error.details).forEach(([field, messages]) => {
            form.setError(field as keyof LoginFormValues, {
              message: messages[0],
            });
          });
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow mb-3">Sign in</p>
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm font-bold text-gray-500">
          Sign in to your account to continue shopping.
        </p>
      </div>

      {/* Social login buttons */}
      <SocialLoginButtons mode="login" />

      {/* Server error */}
      {serverError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {serverError}
        </div>
      )}

      {/* Email/Password Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-black text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
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

          {/* Remember me */}
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal">Remember me for 30 days</FormLabel>
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>

      {/* Register link */}
      <p className="text-center text-sm font-medium text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-black text-primary hover:underline">
          Create one now
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <LoginContent />
    </Suspense>
  );
}
