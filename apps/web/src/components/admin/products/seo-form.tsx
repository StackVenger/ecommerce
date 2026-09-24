'use client';

import { Search, Globe, Eye } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface SeoFormProps {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  productName: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
}

// ──────────────────────────────────────────────────────────
// Character Count Helper
// ──────────────────────────────────────────────────────────

function CharacterCount({
  current,
  max,
  recommended,
}: {
  current: number;
  max: number;
  recommended: number;
}) {
  let color = 'text-gray-400';
  if (current > max) {
    color = 'text-red-500';
  } else if (current >= recommended) {
    color = 'text-green-500';
  } else if (current > 0) {
    color = 'text-yellow-500';
  }

  return (
    <span className={cn('text-xs', color)}>
      {current}/{max}
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// SEO Form
// ──────────────────────────────────────────────────────────

/**
 * SEO form for product meta title, description, and search preview.
 *
 * Provides character count indicators and a Google search preview
 * to help admins optimize product pages for search engines.
 */
export function SeoForm({
  metaTitle,
  metaDescription,
  slug,
  productName,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: SeoFormProps) {
  const [showPreview, setShowPreview] = useState(true);

  // Auto-fill meta title from product name if empty
  const displayTitle = metaTitle || productName || 'Product Title';
  const displayDescription =
    metaDescription || 'Add a meta description to improve search engine visibility...';
  const displayUrl = `https://store.example.com/products/${slug || 'product-slug'}`;

  return (
    <div className="space-y-6">
      {/* SEO Fields */}
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Search Engine Optimization
          </h2>
        </div>

        <div className="space-y-5">
          {/* Meta Title */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="metaTitle" className="field-label">
                Meta Title
              </label>
              <CharacterCount current={metaTitle.length} max={70} recommended={50} />
            </div>
            <input
              id="metaTitle"
              type="text"
              value={metaTitle}
              onChange={(e) => onMetaTitleChange(e.target.value)}
              placeholder={productName || 'Enter a SEO-friendly title'}
              maxLength={70}
              className="field-input w-full"
            />
            <p className="field-hint">
              Recommended: 50-60 characters. Leave empty to use the product name.
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="metaDescription" className="field-label">
                Meta Description
              </label>
              <CharacterCount current={metaDescription.length} max={160} recommended={120} />
            </div>
            <textarea
              id="metaDescription"
              rows={3}
              value={metaDescription}
              onChange={(e) => onMetaDescriptionChange(e.target.value)}
              placeholder="Write a compelling description that summarizes this product for search results..."
              maxLength={160}
              className="field-input w-full rounded-[1.25rem]"
            />
            <p className="field-hint">
              Recommended: 120-155 characters for optimal display in search results.
            </p>
          </div>
        </div>
      </div>

      {/* Search Preview */}
      <div className="bento-card p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Search Preview</h3>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPreview && (
          <div className="bento-card p-4">
            {/* Google-style preview */}
            <div className="space-y-1">
              <p className="truncate text-sm text-green-700">{displayUrl}</p>
              <h4 className="truncate text-xl text-brand-800 hover:underline">{displayTitle}</h4>
              <p className="line-clamp-2 text-sm text-gray-600">{displayDescription}</p>
            </div>
          </div>
        )}

        {/* SEO Score */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">SEO Checklist</h4>
          <ul className="space-y-1.5">
            {[
              {
                label: 'Meta title is set',
                ok: metaTitle.length > 0,
              },
              {
                label: 'Meta title is 50-60 characters',
                ok: metaTitle.length >= 50 && metaTitle.length <= 60,
              },
              {
                label: 'Meta description is set',
                ok: metaDescription.length > 0,
              },
              {
                label: 'Meta description is 120-155 characters',
                ok: metaDescription.length >= 120 && metaDescription.length <= 155,
              },
              {
                label: 'URL slug is readable',
                ok: slug.length > 0 && !slug.includes(' '),
              },
            ].map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-xs',
                    item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400',
                  )}
                >
                  {item.ok ? '✓' : '○'}
                </span>
                <span className={cn(item.ok ? 'text-green-700' : 'text-gray-500')}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
