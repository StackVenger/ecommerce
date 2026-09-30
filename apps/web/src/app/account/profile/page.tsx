'use client';

import {
  User,
  Camera,
  Save,
  Phone,
  Mail,
  Loader2,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/ui/bento';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile as updateProfileApi } from '@/lib/api/auth';
import { apiClient, ApiClientError } from '@/lib/api/client';

export default function ProfilePage() {
  const { user, refreshUser, deleteAccount } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE in capital letters to confirm.');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword || undefined);
      toast.success('Your account has been deleted.');
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message || 'Could not delete account.');
      } else {
        setDeleteError('Could not delete account. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', file);

      await apiClient.post('/users/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMessage('Avatar updated successfully');
      refreshUser?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      // Backend DTO takes firstName/lastName separately and `forbidNonWhitelisted`
      // rejects unknowns, so split the single "Full name" field on the first
      // space. Empty trailing token => empty lastName, which the DTO accepts.
      const trimmed = formData.name.trim().replace(/\s+/g, ' ');
      const spaceIdx = trimmed.indexOf(' ');
      const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);

      const payload: { firstName?: string; lastName?: string; phone?: string } = {};
      if (firstName) {
        payload.firstName = firstName;
      }
      if (lastName) {
        payload.lastName = lastName;
      }
      if (formData.phone.trim()) {
        payload.phone = formData.phone.trim();
      }

      await updateProfileApi(payload);

      setSuccessMessage('Profile updated successfully');
      refreshUser?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to update profile');
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSrc = avatarPreview || user?.avatar;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Profile"
        description="Update your personal information"
        className="mb-0 sm:mb-0"
      />

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle className="h-5 w-5" strokeWidth={1.75} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Avatar Section */}
        <section className="bento-card flex flex-col items-center p-5 text-center sm:p-6 xl:col-span-4">
          <h3 className="section-title mb-6 w-full border-b border-gray-200 pb-3 text-left">
            Profile Photo
          </h3>

          {/* Avatar Preview */}
          <div className="relative">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.fullName || 'Profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-50">
                  <User className="h-10 w-10 text-primary" strokeWidth={1.5} />
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Camera Button */}
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-primary text-white transition-colors hover:bg-brand-700"
              aria-label="Change profile photo"
            >
              <Camera className="h-4 w-4" strokeWidth={2} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <p className="mt-5 font-heading text-base font-semibold text-gray-900">
            {user?.fullName || 'Your profile'}
          </p>
          <p className="mt-1 max-w-[16rem] text-xs text-gray-500">
            JPG, PNG, or WebP. Max 5MB. Will be resized to 200x200 and 50x50.
          </p>
          <button
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="btn btn-secondary btn-sm mt-5"
          >
            {isUploading ? 'Uploading...' : 'Choose file'}
          </button>
        </section>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="bento-card p-5 sm:p-6 xl:col-span-8">
          <div className="mb-6 border-b border-gray-200 pb-3">
            <h3 className="section-title">Personal Information</h3>
            <p className="text-sm text-gray-500">How we reach you</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Name */}
            <div className="md:col-span-2">
              <label htmlFor="profile-name" className="field-label flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" strokeWidth={2} />
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="field-input"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label htmlFor="profile-email" className="field-label flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="field-input"
              />
              <p className="field-hint">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="profile-phone" className="field-label flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+8801XXXXXXXXX"
                className="field-input"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={2} />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <section className="flex flex-col gap-5 border border-rose-200 bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-rose-500">Danger zone</p>
          <h3 className="mt-0.5 font-heading text-base font-semibold text-gray-900">
            Delete account
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Permanently delete your account and personal data. Past orders are kept for our records
            but will no longer be linked to you. This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowDeleteDialog(true);
            setDeletePassword('');
            setDeleteConfirmation('');
            setDeleteError('');
          }}
          className="btn btn-danger-soft shrink-0"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Delete my account
        </button>
      </section>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isDeleting && setShowDeleteDialog(false)}
        >
          <div
            className="w-full max-w-md border border-gray-200 bg-card p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h3
              id="delete-account-title"
              className="font-heading text-xl font-semibold text-gray-900"
            >
              Delete account permanently?
            </h3>
            <p className="mb-5 mt-2 text-sm text-gray-500">
              This will remove your profile, addresses, cart, wishlist, reviews and notifications.
              Orders you placed will be kept but disconnected from your account.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="delete-password" className="field-label">
                  Current password{' '}
                  <span className="font-normal text-gray-400">
                    (leave blank if you signed up with Google)
                  </span>
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="field-input focus:border-rose-300 focus:ring-rose-500/10"
                  disabled={isDeleting}
                />
              </div>
              <div>
                <label htmlFor="delete-confirm" className="field-label">
                  Type <span className="font-mono font-semibold text-rose-600">DELETE</span> to
                  confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="field-input focus:border-rose-300 focus:ring-rose-500/10"
                  disabled={isDeleting}
                  autoComplete="off"
                />
              </div>
            </div>

            {deleteError && <p className="field-error mt-3">{deleteError}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                className="btn btn-danger"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                )}
                {isDeleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
