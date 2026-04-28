'use client';

import { Button, Input } from '@ecommerce/ui';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { resendVerificationEmail, verifyEmail } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

// ──────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const { user, refreshUser } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoVerified = useRef(false);

  // ── Auto-verify from URL token ──────────────────────────

  const handleVerify = useCallback(
    async (token: string) => {
      setIsVerifying(true);
      setErrorMessage(null);

      try {
        await verifyEmail(token);
        setStatus('success');
        await refreshUser();

        // Redirect to home after a brief delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        setStatus('error');
        if (error instanceof ApiClientError) {
          if (error.status === 400) {
            setErrorMessage(
              'This verification link is invalid or has expired. Please request a new one.',
            );
          } else {
            setErrorMessage(error.message);
          }
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [refreshUser, router],
  );

  useEffect(() => {
    if (tokenFromUrl && !hasAutoVerified.current) {
      hasAutoVerified.current = true;
      void handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl, handleVerify]);

  // ── Resend countdown timer ──────────────────────────────

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // ── OTP input handlers ──────────────────────────────────

  function handleOtpChange(index: number, value: string) {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullToken = newOtp.join('');
      if (fullToken.length === OTP_LENGTH) {
        void handleVerify(fullToken);
      }
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pasted.length === OTP_LENGTH) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      void handleVerify(pasted);
    }
  }

  // ── Resend handler ──────────────────────────────────────

  async function handleResend() {
    if (!user?.email) {
      setErrorMessage('We could not determine which email to resend to. Please sign in again.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      await resendVerificationEmail(user.email);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 429) {
          setErrorMessage('Too many requests. Please wait before trying again.');
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Failed to resend verification email.');
      }
    } finally {
      setIsResending(false);
    }
  }

  // ── Auto-verifying from link ────────────────────────────

  if (tokenFromUrl && isVerifying) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Verifying your email...</h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────

  if (status === 'success') {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Email verified!</h1>
          <p className="text-sm text-muted-foreground">
            Your email has been successfully verified. You&apos;ll be redirected to the homepage
            shortly.
          </p>
        </div>
        <Button asChild className="w-full max-w-xs">
          <Link href="/">Continue to homepage</Link>
        </Button>
      </div>
    );
  }

  // ── Error state (from URL token) ────────────────────────

  if (status === 'error' && tokenFromUrl) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Verification failed</h1>
          <p className="text-sm text-muted-foreground">
            {errorMessage ?? 'We could not verify your email address.'}
          </p>
        </div>
        <div className="space-y-3">
          <Button
            className="w-full max-w-xs"
            onClick={handleResend}
            disabled={isResending || resendCountdown > 0}
          >
            {isResending
              ? 'Sending...'
              : resendCountdown > 0
                ? `Resend in ${resendCountdown}s`
                : 'Resend verification email'}
          </Button>
          <Link href="/login" className="block text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Default OTP input state ─────────────────────────────

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification code to{' '}
          {user?.email ? (
            <span className="font-medium text-foreground">{user.email}</span>
          ) : (
            'your email'
          )}
          . Enter the 6-digit code below.
        </p>
      </div>

      {/* Error */}
      {errorMessage && !tokenFromUrl && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* OTP inputs */}
      <div className="flex justify-center gap-3">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            onPaste={index === 0 ? handleOtpPaste : undefined}
            className="h-14 w-12 text-center text-xl font-semibold"
            disabled={isVerifying}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Verify button */}
      <Button
        className="w-full"
        onClick={() => handleVerify(otp.join(''))}
        disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
      >
        {isVerifying ? 'Verifying...' : 'Verify email'}
      </Button>

      {/* Resend */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleResend}
            disabled={isResending || resendCountdown > 0}
          >
            {isResending
              ? 'Sending...'
              : resendCountdown > 0
                ? `Resend in ${resendCountdown}s`
                : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
