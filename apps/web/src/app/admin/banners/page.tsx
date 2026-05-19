'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

type BannerPosition = 'HERO' | 'SIDEBAR' | 'FOOTER' | 'POPUP';

const BANNER_POSITIONS: { value: BannerPosition; label: string; hint: string }[] = [
  { value: 'HERO', label: 'Hero (homepage carousel)', hint: 'Top of homepage' },
  { value: 'SIDEBAR', label: 'Sidebar (homepage promo strip)', hint: 'Below hero on home' },
  { value: 'FOOTER', label: 'Footer (above site footer)', hint: 'Every page' },
  { value: 'POPUP', label: 'Popup', hint: 'Modal overlay (not yet rendered)' },
];

interface Banner {
  id: string;
  title: string;
  titleBn: string;
  subtitle: string;
  subtitleBn: string;
  image: string;
  mobileImage: string;
  link: string;
  position: BannerPosition;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface BannerFormData {
  title: string;
  titleBn: string;
  subtitle: string;
  subtitleBn: string;
  image: string;
  imageMobile: string;
  link: string;
  position: BannerPosition;
  isActive: boolean;
  startDate: string;
  endDate: string;
  buttonText: string;
  buttonTextBn: string;
  backgroundColor: string;
  textColor: string;
}

const defaultFormData: BannerFormData = {
  title: '',
  titleBn: '',
  subtitle: '',
  subtitleBn: '',
  image: '',
  imageMobile: '',
  link: '',
  position: 'HERO',
  isActive: true,
  startDate: '',
  endDate: '',
  buttonText: 'Shop Now',
  buttonTextBn: 'এখনই কিনুন',
  backgroundColor: '#ffffff',
  textColor: '#000000',
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | null>(null);
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/banners');
      const result = data.data ?? data;
      setBanners(result.banners ?? result ?? []);
    } catch (error) {
      console.error('Fetch banners error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to load banners'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageUpload = async (file: File, slot: 'desktop' | 'mobile') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(slot);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await apiClient.post('/upload/image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = (data?.data?.url ?? data?.url) as string | undefined;
      if (!url) {
        throw new Error('Upload returned no URL');
      }
      setFormData((prev) =>
        slot === 'desktop' ? { ...prev, image: url } : { ...prev, imageMobile: url },
      );
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to upload image'));
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleCreate = () => {
    setFormData(defaultFormData);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (banner: Banner) => {
    setFormData({
      title: banner.title,
      titleBn: banner.titleBn || '',
      subtitle: banner.subtitle || '',
      subtitleBn: banner.subtitleBn || '',
      image: banner.image || '',
      imageMobile: banner.mobileImage || '',
      link: banner.link || '',
      position: banner.position,
      isActive: banner.isActive,
      startDate: banner.startsAt ? (banner.startsAt.split('T')[0] ?? '') : '',
      endDate: banner.endsAt ? (banner.endsAt.split('T')[0] ?? '') : '',
      buttonText: 'Shop Now',
      buttonTextBn: 'এখনই কিনুন',
      backgroundColor: '#ffffff',
      textColor: '#000000',
    });
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Please upload a desktop image first');
      return;
    }
    setSaving(true);

    try {
      if (editingId) {
        await apiClient.patch(`/admin/banners/${editingId}`, formData);
      } else {
        await apiClient.post('/admin/banners', formData);
      }

      toast.success(editingId ? 'Banner updated' : 'Banner created');
      setShowForm(false);
      fetchBanners();
    } catch (error) {
      console.error('Save banner error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to save banner'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this banner?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.success('Banner deleted');
    } catch (error) {
      console.error('Delete banner error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to delete banner'));
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await apiClient.patch(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)),
      );
      toast.success(banner.isActive ? 'Banner deactivated' : 'Banner activated');
    } catch (error) {
      console.error('Toggle active error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to update banner'));
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      return;
    }

    const draggedIndex = banners.findIndex((b) => b.id === draggedId);
    const targetIndex = banners.findIndex((b) => b.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const newBanners = [...banners];
    const dragged = newBanners.splice(draggedIndex, 1)[0];
    if (!dragged) {
      return;
    }
    newBanners.splice(targetIndex, 0, dragged);
    setBanners(newBanners);
  };

  const handleDragEnd = async () => {
    if (!draggedId) {
      return;
    }
    setDraggedId(null);

    try {
      const positions = banners.map((b, i) => ({ id: b.id, position: i }));
      await apiClient.post('/admin/banners/reorder', { positions });
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to reorder banners'));
      fetchBanners(); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage homepage and promotional banners</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          + Add Banner
        </button>
      </div>

      {/* Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No banners yet. Create your first banner!
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              draggable
              onDragStart={() => handleDragStart(banner.id)}
              onDragOver={(e) => handleDragOver(e, banner.id)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing ${
                draggedId === banner.id ? 'opacity-50' : ''
              }`}
            >
              {/* Banner Preview */}
              <div className="relative aspect-[16/6] bg-gray-100 overflow-hidden">
                {banner.image ? (
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  {banner.isActive ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 h-6 bg-gray-900/70 text-white text-xs flex items-center justify-center rounded">
                    {banner.position}
                  </span>
                </div>
              </div>

              {/* Banner Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900">{banner.title}</h3>
                {banner.titleBn && <p className="text-xs text-gray-500 mt-0.5">{banner.titleBn}</p>}
                {banner.link && (
                  <p className="text-xs text-teal-600 mt-1 truncate">{banner.link}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      {banner.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Banner' : 'Create Banner'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    শিরোনাম (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={formData.titleBn}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleBn: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    সাবটাইটেল (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={formData.subtitleBn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subtitleBn: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      position: e.target.value as BannerPosition,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {BANNER_POSITIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {BANNER_POSITIONS.find((o) => o.value === formData.position)?.hint}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desktop Image
                </label>
                <input
                  ref={desktopFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, 'desktop');
                    }
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-3">
                  {formData.image ? (
                    <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <img
                        src={formData.image}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white shadow"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                      No image
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => desktopFileRef.current?.click()}
                    disabled={uploading === 'desktop'}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading === 'desktop'
                      ? 'Uploading…'
                      : formData.image
                        ? 'Replace image'
                        : 'Upload image'}
                  </button>
                </div>
                {!formData.image && (
                  <p className="mt-1 text-xs text-red-600">A desktop image is required.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Image (optional)
                </label>
                <input
                  ref={mobileFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, 'mobile');
                    }
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-3">
                  {formData.imageMobile ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <img
                        src={formData.imageMobile}
                        alt="Mobile banner preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageMobile: '' }))}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white shadow"
                        aria-label="Remove mobile image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                      None
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => mobileFileRef.current?.click()}
                    disabled={uploading === 'mobile'}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading === 'mobile'
                      ? 'Uploading…'
                      : formData.imageMobile
                        ? 'Replace image'
                        : 'Upload image'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="/collections/summer-sale"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, buttonText: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    বাটন টেক্সট (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={formData.buttonTextBn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, buttonTextBn: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, backgroundColor: e.target.value }))
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, textColor: e.target.value }))
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-teal-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
