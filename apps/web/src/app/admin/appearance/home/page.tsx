'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

/**
 * Admin-controlled layout of the public home page.
 *
 * Stored as `Settings.general.home_sections` (JSON). Each entry has an
 * id, a type (picked from the known section renderers), a visible flag,
 * a sortOrder, and an optional props bag for per-section knobs (headings,
 * item limits, trust-badge list, ...).
 *
 * The public home page iterates this list and renders one component per
 * `type`. Unknown types are skipped, so adding a new section renderer
 * later is backwards-compatible — just add the type to SECTION_TYPES,
 * ship the renderer, and admins can immediately reorder it in.
 */

type SectionType =
  | 'hero'
  | 'categories'
  | 'featured_products'
  | 'promo_strip'
  | 'new_arrivals'
  | 'trust_badges'
  | 'newsletter';

interface HomeSection {
  id: string;
  type: SectionType;
  visible: boolean;
  sortOrder: number;
  props?: Record<string, unknown>;
}

const SECTION_LABELS: Record<SectionType, { label: string; description: string }> = {
  hero: {
    label: 'Hero carousel',
    description: 'Rotating banners at the top (driven by /admin/banners, position=HERO).',
  },
  categories: {
    label: 'Shop by Category',
    description: 'Grid of top-level categories with product counts.',
  },
  featured_products: {
    label: 'Featured Products',
    description: 'Products flagged with isFeatured in the catalog.',
  },
  promo_strip: {
    label: 'Promo strip',
    description: 'Mid-page promotional cards (driven by /admin/banners, position=SIDEBAR).',
  },
  new_arrivals: {
    label: 'New Arrivals',
    description: 'Most recently created products.',
  },
  trust_badges: {
    label: 'Trust badges',
    description: '"Free delivery", "Secure payment", etc. Editable below.',
  },
  newsletter: {
    label: 'Newsletter signup',
    description: 'Email capture strip near the bottom of the page.',
  },
};

const DEFAULT_SECTIONS: HomeSection[] = [
  { id: 'hero', type: 'hero', visible: true, sortOrder: 0, props: {} },
  {
    id: 'categories',
    type: 'categories',
    visible: true,
    sortOrder: 1,
    props: { heading: 'Shop by Category', limit: 8 },
  },
  {
    id: 'featured',
    type: 'featured_products',
    visible: true,
    sortOrder: 2,
    props: { heading: 'Featured Products', limit: 8 },
  },
  { id: 'promo', type: 'promo_strip', visible: true, sortOrder: 3, props: {} },
  {
    id: 'new',
    type: 'new_arrivals',
    visible: true,
    sortOrder: 4,
    props: { heading: 'New Arrivals', limit: 8 },
  },
  { id: 'trust', type: 'trust_badges', visible: true, sortOrder: 5, props: {} },
  { id: 'newsletter', type: 'newsletter', visible: true, sortOrder: 6, props: {} },
];

function parseSections(raw: unknown): HomeSection[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_SECTIONS;
  }
  const valid = raw
    .filter(
      (s): s is HomeSection =>
        s !== null &&
        typeof s === 'object' &&
        typeof (s as HomeSection).id === 'string' &&
        typeof (s as HomeSection).type === 'string' &&
        (s as HomeSection).type in SECTION_LABELS,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return valid.length > 0 ? valid : DEFAULT_SECTIONS;
}

export default function AdminHomeSectionsPage() {
  const [sections, setSections] = useState<HomeSection[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{
        data?: Record<string, string>;
        home_sections?: string;
      }>('/admin/settings/general');
      const raw = res.data?.data?.home_sections ?? res.data?.home_sections;
      if (typeof raw === 'string' && raw.length > 0) {
        try {
          setSections(parseSections(JSON.parse(raw) as unknown));
        } catch (err) {
          setSections(DEFAULT_SECTIONS);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load home sections:', err);
      toast.error(getApiErrorMessage(err, 'Failed to load home sections'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      // Persist as part of the GENERAL settings group; the group PUT
      // endpoint upserts per-key, so we only need to send the one we
      // care about.
      const normalized = sections.map((s, i) => ({ ...s, sortOrder: i }));
      await apiClient.put('/admin/settings/general', {
        home_sections: JSON.stringify(normalized),
      });
      setSections(normalized);
      setDirty(false);
      toast.success('Home sections saved');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save failed:', err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSections(DEFAULT_SECTIONS);
    setDirty(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) {
      return;
    }
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
    setSections(next);
    setDirty(true);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) {
      return;
    }
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
    setSections(next);
    setDirty(true);
  };

  const toggleVisible = (index: number) => {
    const next = [...sections];
    const current = next[index];
    if (!current) {
      return;
    }
    next[index] = { ...current, visible: !current.visible };
    setSections(next);
    setDirty(true);
  };

  const updateProp = (index: number, key: string, value: unknown) => {
    const next = [...sections];
    const current = next[index];
    if (!current) {
      return;
    }
    next[index] = { ...current, props: { ...(current.props ?? {}), [key]: value } };
    setSections(next);
    setDirty(true);
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Home page layout</h1>
          <p className="page-subtitle">
            Reorder, hide, or tweak the storefront home sections. Changes take effect on the next
            request once saved.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="btn btn-secondary">
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {sections.map((section, index) => {
          const meta = SECTION_LABELS[section.type];
          return (
            <li
              key={section.id}
              className={`bento-card p-5 transition-opacity ${section.visible ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-gray-900">
                      {meta.label}
                    </h3>
                    {!section.visible && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        hidden
                      </span>
                    )}
                  </div>
                  <p className="field-hint">{meta.description}</p>

                  {section.type === 'categories' ||
                  section.type === 'featured_products' ||
                  section.type === 'new_arrivals' ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="text-xs text-gray-600">
                        Heading
                        <input
                          type="text"
                          value={(section.props?.heading as string | undefined) ?? ''}
                          onChange={(e) => updateProp(index, 'heading', e.target.value)}
                          placeholder={meta.label}
                          className="field-input block w-full"
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Max items
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={(section.props?.limit as number | undefined) ?? 8}
                          onChange={(e) =>
                            updateProp(
                              index,
                              'limit',
                              Math.max(1, Math.min(24, Number(e.target.value) || 1)),
                            )
                          }
                          className="field-input block w-full"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 transition-all"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === sections.length - 1}
                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 transition-all"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisible(index)}
                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
                    aria-label={section.visible ? 'Hide section' : 'Show section'}
                  >
                    {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
