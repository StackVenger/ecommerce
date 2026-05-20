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
      toast.error(getApiErrorMessage(err, 'Failed to create page'));
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Page</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Language Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'en'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bn')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'bn'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    বাংলা (Bangla)
                  </button>
                </nav>
              </div>

              <div className="p-6 space-y-4">
                {activeTab === 'en' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Page title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        শিরোনাম (Title)
                      </label>
                      <input
                        type="text"
                        value={formData.titleBn}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, titleBn: e.target.value }))
                        }
                        placeholder="পৃষ্ঠার শিরোনাম"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        বিষয়বস্তু (Content)
                      </label>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Page Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-1">/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="page-url-slug"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value as any }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={formData.template}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="default">Default</option>
                  <option value="full-width">Full Width</option>
                  <option value="sidebar">With Sidebar</option>
                  <option value="landing">Landing Page</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={formData.featuredImage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Page'}
              </button>
              <a
                href="/admin/pages"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
