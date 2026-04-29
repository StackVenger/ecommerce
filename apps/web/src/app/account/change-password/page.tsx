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
    { score: 0, label: 'Very Weak', color: 'text-red-600', bg: 'bg-red-500' },
    { score: 1, label: 'Weak', color: 'text-orange-600', bg: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-500' },
    { score: 3, label: 'Strong', color: 'text-primary', bg: 'bg-teal-500' },
    { score: 4, label: 'Very Strong', color: 'text-green-600', bg: 'bg-green-500' },
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
        <h2 className="text-xl font-bold text-gray-900">
          {isSocialUser ? 'Set Password' : 'Change Password'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isSocialUser
            ? 'Create a password so you can also sign in with your email'
            : 'Update your account password'}
        </p>
      </div>

      {/* Social user info banner */}
      {isSocialUser && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Your account was created with a social login (Google, Facebook, etc.). You don&apos;t
            have a password yet — set one below to enable email sign-in.
          </span>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Password Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Password Settings</h3>
        </div>

        <div className="space-y-5 max-w-md">
          {/* Current Password — hidden for social/phone users */}
          {!isSocialUser && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4" />
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
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4" />
              {isSocialUser ? 'Password' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder={isSocialUser ? 'Create a password' : 'Enter new password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Indicator */}
            {formData.newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        passwordStrength.bg,
                      )}
                      style={{ width: `${((passwordStrength.score + 1) / 5) * 100}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium', passwordStrength.color)}>
                    {passwordStrength.label}
                  </span>
                </div>

                <div className="space-y-1">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle
                        className={cn('w-3.5 h-3.5', req.met ? 'text-green-500' : 'text-gray-300')}
                      />
                      <span className={req.met ? 'text-green-700' : 'text-gray-400'}>
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
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4" />
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
                  'w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary',
                  formData.confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-green-300'
                      : 'border-red-300'
                    : 'border-gray-300',
                )}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {formData.confirmPassword.length > 0 && (
              <p className={cn('text-xs mt-1', passwordsMatch ? 'text-green-600' : 'text-red-500')}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
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
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-teal-900 mb-1">Security Tips</h4>
        <ul className="text-xs text-primary space-y-1 list-disc list-inside">
          <li>Use a unique password that you don&apos;t use on other sites</li>
          <li>Mix uppercase, lowercase, numbers, and special characters</li>
          <li>Avoid using personal information like name or birthday</li>
          <li>Consider using a password manager for strong, unique passwords</li>
        </ul>
      </div>
    </div>
  );
}
