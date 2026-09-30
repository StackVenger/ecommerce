'use client';

import { Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bg: string;
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) {
    score++;
  }
  if (password.length >= 12) {
    score++;
  }
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score++;
  }
  if (/\d/.test(password)) {
    score++;
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  }
  score = Math.min(4, score);

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Very Weak', color: 'text-rose-600', bg: 'bg-rose-500' },
    { score: 1, label: 'Weak', color: 'text-orange-600', bg: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-400' },
    { score: 3, label: 'Strong', color: 'text-primary', bg: 'bg-brand-500' },
    { score: 4, label: 'Very Strong', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  ];

  return levels[score]!;
}

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const isSocialUser = user?.hasPassword === false;

  useEffect(() => {
    refreshUser();
  }, []);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(formData.newPassword),
    [formData.newPassword],
  );

  const requirements = useMemo(() => {
    const pw = formData.newPassword;
    return [
      { label: 'At least 8 characters', met: pw.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(pw) },
      { label: 'One lowercase letter', met: /[a-z]/.test(pw) },
      { label: 'One number', met: /\d/.test(pw) },
      { label: 'One special character', met: /[^A-Za-z0-9]/.test(pw) },
    ];
  }, [formData.newPassword]);

  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword;

  const canSubmit =
    (isSocialUser || formData.currentPassword.length > 0) &&
    formData.newPassword.length >= 8 &&
    passwordsMatch &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (!isSocialUser && formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const body: Record<string, string> = { newPassword: formData.newPassword };
      if (!isSocialUser) {
        body.currentPassword = formData.currentPassword;
      }

      await apiClient.patch('/auth/change-password', body);

      setSuccessMessage(
        isSocialUser ? 'Password set successfully' : 'Password changed successfully',
      );
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">{isSocialUser ? 'Set Password' : 'Change Password'}</h1>
        <p className="page-subtitle mt-1">
          {isSocialUser
            ? 'Create a password so you can also sign in with your email'
            : 'Update your account password'}
        </p>
      </div>

      {/* Social user info banner */}
      {isSocialUser && (
        <div className="flex items-start gap-3 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Your account was created with a social login (Google, Facebook, etc.). You don&apos;t
            have a password yet — set one below to enable email sign-in.
          </span>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Password Form */}
        <form onSubmit={handleSubmit} className="bento-card p-5 sm:p-6 xl:col-span-8">
          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center bg-brand-50 text-primary">
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="section-title">Password Settings</h3>
              <p className="mt-0.5 text-sm text-gray-500">Keep your account secure</p>
            </div>
          </div>

          <div className="max-w-md space-y-5">
            {/* Current Password — hidden for social/phone users */}
            {!isSocialUser && (
              <div>
                <label className="field-label flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    placeholder="Enter current password"
                    className="field-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('current')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="field-label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                {isSocialUser ? 'Password' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder={isSocialUser ? 'Create a password' : 'Enter new password'}
                  className="field-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('new')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Indicator */}
              {formData.newPassword.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-1 flex-1 overflow-hidden bg-gray-200">
                      <div
                        className={cn('h-full transition-all duration-300', passwordStrength.bg)}
                        style={{ width: `${((passwordStrength.score + 1) / 5) * 100}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-semibold', passwordStrength.color)}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {requirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle
                          className={cn(
                            'w-3.5 h-3.5',
                            req.met ? 'text-emerald-500' : 'text-gray-300',
                          )}
                        />
                        <span
                          className={req.met ? 'font-medium text-emerald-700' : 'text-gray-500'}
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="field-label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                Confirm {isSocialUser ? 'Password' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="Confirm password"
                  className={cn(
                    'field-input pr-11',
                    formData.confirmPassword.length > 0 &&
                      (passwordsMatch
                        ? 'border-emerald-300'
                        : 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10'),
                  )}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('confirm')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {formData.confirmPassword.length > 0 && (
                <p
                  className={cn(
                    'mt-1.5 text-xs font-bold',
                    passwordsMatch ? 'text-emerald-600' : 'text-rose-500',
                  )}
                >
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
            <button type="submit" disabled={!canSubmit} className="btn btn-primary">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {isLoading
                ? isSocialUser
                  ? 'Setting...'
                  : 'Updating...'
                : isSocialUser
                  ? 'Set Password'
                  : 'Update Password'}
            </button>
          </div>
        </form>

        {/* Security Tips */}
        <aside className="self-start border border-gray-200 bg-gray-50 p-5 sm:p-6 xl:col-span-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Shield className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Security tips
          </div>
          <h4 className="mt-3 font-heading text-lg font-semibold text-gray-900">
            Stronger passwords, safer account.
          </h4>
          <ul className="mt-4 space-y-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
            {[
              <>Use a unique password that you don&apos;t use on other sites</>,
              <>Mix uppercase, lowercase, numbers, and special characters</>,
              <>Avoid using personal information like name or birthday</>,
              <>Consider using a password manager for strong, unique passwords</>,
            ].map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
