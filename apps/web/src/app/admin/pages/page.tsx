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
        toast.error(getApiErrorMessage(error, 'Failed to load pages'));
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
      toast.error(getApiErrorMessage(error, 'Failed to delete page'));
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
      toast.error(getApiErrorMessage(error, 'Failed to update page status'));
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Pages</h1>
          <p className="page-subtitle">Manage static content pages for your store</p>
        </div>
        <a href="/admin/pages/new" className="btn btn-primary">
          + Create Page
        </a>
      </div>

      <div className="bento-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input w-full pl-11 pr-4"
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
            className="field-input w-auto py-2.5"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <table className="min-w-full">
          <thead className="border-b border-foreground/[0.04]">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Title
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Slug
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Status
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Author
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Updated
              </th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.03]">
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
                          ? 'bg-emerald-50 text-emerald-600'
                          : page.status === 'draft'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-600'
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
                      className="text-sm text-brand-600 hover:text-brand-800"
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
