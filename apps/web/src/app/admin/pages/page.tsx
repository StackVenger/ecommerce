'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface CMSPage {
  id: string;
  title: string;
  titleBn: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  author: string;
  updatedAt: string;
  createdAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    async function fetchPages() {
      try {
        const params = new URLSearchParams();
        if (search) {
          params.set('search', search);
        }
        if (statusFilter) {
          params.set('status', statusFilter);
        }

        const { data } = await apiClient.get(`/admin/pages?${params.toString()}`);
        setPages(data.data?.pages ?? data.data ?? []);
      } catch (error) {
        console.error('Error fetching pages:', error);
        toast.error(getApiErrorMessage(err, 'Failed to load pages'));
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, [search, statusFilter]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this page?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/pages/${id}`);
      setPages((prev) => prev.filter((p) => p.id !== id));
      toast.success('Page deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to delete page'));
    }
  };

  const handleTogglePublish = async (page: CMSPage) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      await apiClient.patch(`/admin/pages/${page.id}`, { status: newStatus });
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, status: newStatus } : p)));
      toast.success(newStatus === 'published' ? 'Page published' : 'Page unpublished');
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to update page status'));
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-sm text-gray-500 mt-1">Manage static content pages for your store</p>
        </div>
        <a
          href="/admin/pages/new"
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          + Create Page
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : pages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No pages found. Create your first page!
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{page.title}</div>
                    <div className="text-xs text-gray-500">{page.titleBn}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">/{page.slug}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        page.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : page.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{page.author}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(page.updatedAt).toLocaleDateString('en-BD')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <a
                      href={`/admin/pages/${page.id}/edit`}
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleTogglePublish(page)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {page.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
