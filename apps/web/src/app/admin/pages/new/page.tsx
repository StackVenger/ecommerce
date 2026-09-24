'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { RichTextEditor } from '@/components/admin/ui/rich-text-editor';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

export default function AdminNewPagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'en' | 'bn'>('en');
  const [formData, setFormData] = useState({
    title: '',
    titleBn: '',
    slug: '',
    content: '',
    contentBn: '',
    metaTitle: '',
    metaTitleBn: '',
    metaDescription: '',
    metaDescriptionBn: '',
    status: 'draft' as 'draft' | 'published',
    featuredImage: '',
    template: 'default',
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug || generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await apiClient.post('/admin/pages', formData);
      toast.success('Page created');
      router.push(`/admin/pages/${data.data?.id || data.id}/edit`);
    } catch (error) {
      console.error('Create page error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to create page'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/admin/pages" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
          <h1 className="page-title">Create New Page</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Language Tabs */}
            <div className="bento-card">
              <div className="border-b border-foreground/[0.04]">
                <nav className="flex gap-1 p-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className={`chip ${activeTab === 'en' ? 'chip-active' : ''}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bn')}
                    className={`chip ${activeTab === 'bn' ? 'chip-active' : ''}`}
                  >
                    বাংলা (Bangla)
                  </button>
                </nav>
              </div>

              <div className="p-6 space-y-4">
                {activeTab === 'en' ? (
                  <>
                    <div>
                      <label className="field-label">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Page title"
                        className="field-input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="field-label">Content</label>
                      <RichTextEditor
                        value={formData.content}
                        onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                        placeholder="Write your page content here..."
                        ariaLabel="Page content"
                        minHeight={360}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="field-label">শিরোনাম (Title)</label>
                      <input
                        type="text"
                        value={formData.titleBn}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, titleBn: e.target.value }))
                        }
                        placeholder="পৃষ্ঠার শিরোনাম"
                        className="field-input w-full"
                      />
                    </div>
                    <div>
                      <label className="field-label">বিষয়বস্তু (Content)</label>
                      <RichTextEditor
                        value={formData.contentBn}
                        onChange={(html) => setFormData((prev) => ({ ...prev, contentBn: html }))}
                        placeholder="এখানে আপনার পৃষ্ঠার বিষয়বস্তু লিখুন..."
                        ariaLabel="Page content (Bangla)"
                        minHeight={360}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SEO */}
            <div className="bento-card p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">SEO Settings</h2>
              <div>
                <label className="field-label">Meta Title</label>
                <input
                  type="text"
                  value={activeTab === 'en' ? formData.metaTitle : formData.metaTitleBn}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [activeTab === 'en' ? 'metaTitle' : 'metaTitleBn']: e.target.value,
                    }))
                  }
                  placeholder="Meta title for search engines"
                  className="field-input w-full"
                />
              </div>
              <div>
                <label className="field-label">Meta Description</label>
                <textarea
                  value={activeTab === 'en' ? formData.metaDescription : formData.metaDescriptionBn}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [activeTab === 'en' ? 'metaDescription' : 'metaDescriptionBn']:
                        e.target.value,
                    }))
                  }
                  placeholder="Meta description for search engines"
                  rows={3}
                  className="field-input w-full resize-none rounded-[1.25rem]"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bento-card p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Page Settings</h2>
              <div>
                <label className="field-label">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-1">/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="page-url-slug"
                    className="field-input flex-1 font-mono py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value as any }))
                  }
                  className="field-input w-full"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="field-label">Template</label>
                <select
                  value={formData.template}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template: e.target.value }))}
                  className="field-input w-full"
                >
                  <option value="default">Default</option>
                  <option value="full-width">Full Width</option>
                  <option value="sidebar">With Sidebar</option>
                  <option value="landing">Landing Page</option>
                </select>
              </div>
              <div>
                <label className="field-label">Featured Image URL</label>
                <input
                  type="text"
                  value={formData.featuredImage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))
                  }
                  placeholder="https://..."
                  className="field-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                {loading ? 'Creating...' : 'Create Page'}
              </button>
              <a href="/admin/pages" className="btn btn-secondary">
                Cancel
              </a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
