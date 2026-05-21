'use client';

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  Info,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface OptionType {
  id: string;
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  options: Record<string, string>;
  price: number | null;
  stock: number;
  sku: string;
  isActive: boolean;
  isDefault?: boolean;
  imageUrls?: string[];
}

interface VariantsFormProps {
  options: OptionType[];
  variants: Variant[];
  onOptionsChange: (options: OptionType[]) => void;
  onVariantsChange: (variants: Variant[]) => void;
  basePrice?: number;
  baseSku?: string;
  /** Product-level image URLs (from the Media tab). Variants pick from this list. */
  productImages?: string[];
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Canonical fingerprint for a variant's option tuple — used to match rows
 *  across regenerations so user edits survive. */
function fingerprint(options: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(options).sort(([a], [b]) => a.localeCompare(b))),
  );
}

/**
 * Generate a variant matrix from option types, preserving per-row edits
 * from any `existing` variants whose option fingerprint matches.
 */
function generateVariantMatrix(
  options: OptionType[],
  basePrice: number,
  baseSku: string,
  existing: Variant[],
): Variant[] {
  if (options.length === 0 || options.every((o) => o.values.length === 0)) {
    return [];
  }

  const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);

  const combinations: Record<string, string>[] = validOptions.reduce<Record<string, string>[]>(
    (acc, option) => {
      if (acc.length === 0) {
        return option.values.map((value) => ({ [option.name]: value }));
      }
      const next: Record<string, string>[] = [];
      for (const row of acc) {
        for (const value of option.values) {
          next.push({ ...row, [option.name]: value });
        }
      }
      return next;
    },
    [],
  );

  const existingByFp = new Map<string, Variant>();
  for (const v of existing) {
    existingByFp.set(fingerprint(v.options), v);
  }

  return combinations.map((optionValues) => {
    const fp = fingerprint(optionValues);
    const prior = existingByFp.get(fp);
    if (prior) {
      return { ...prior, options: optionValues };
    }
    return {
      id: generateId(),
      options: optionValues,
      price: basePrice || null,
      stock: 0,
      sku: `${baseSku}-${Object.values(optionValues).join('-').toUpperCase().replace(/\s+/g, '')}`,
      isActive: true,
      isDefault: false,
      imageUrls: [],
    };
  });
}

// ──────────────────────────────────────────────────────────
// Variant Image Picker
// ──────────────────────────────────────────────────────────

interface VariantImagePickerProps {
  value: string[];
  productImages: string[];
  onChange: (urls: string[]) => void;
}

function VariantImagePicker({ value, productImages, onChange }: VariantImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Position the popover relative to the viewport so it escapes the table's
  // `overflow-x-auto` ancestor. Anchored to the trigger's bottom-right,
  // flipped above when there isn't enough room below.
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const POPOVER_W = 288;
    const POPOVER_H = 360;
    const GAP = 6;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= POPOVER_H + GAP ? rect.bottom + GAP : rect.top - POPOVER_H - GAP;
    let left = rect.right - POPOVER_W;
    if (left < 8) {
      left = 8;
    }
    if (left + POPOVER_W > window.innerWidth - 8) {
      left = window.innerWidth - POPOVER_W - 8;
    }
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    // Outer scroll/resize moves the trigger, so the fixed-positioned
    // popover would drift. Close in that case — but ignore scrolls that
    // originate inside the popover itself (e.g. scrolling the product-
    // images grid), otherwise the popover dismisses the moment the user
    // touches its scrollbar.
    const handleOuterScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleResize = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleOuterScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleOuterScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const handleFiles = async (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) {
      toast.error('Please choose image files');
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of valid) {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const result = data.data ?? data;
        if (result?.url) {
          uploaded.push(result.url);
        }
      }
      if (uploaded.length > 0) {
        const seen = new Set(value);
        const next = [...value];
        for (const u of uploaded) {
          if (!seen.has(u)) {
            seen.add(u);
            next.push(u);
          }
        }
        onChange(next);
      }
    } catch (err) {
      console.error('Variant image upload failed:', err);
      toast.error('Variant image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const togglePick = (url: string) => {
    if (value.includes(url)) {
      onChange(value.filter((u) => u !== url));
    } else {
      onChange([...value, url]);
    }
  };

  const previewUrl = value[0];

  const popover =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: 288 }}
            className="z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                Variant images ({value.length})
              </span>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {value.length > 0 && (
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                {value.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-0.5 top-0.5 rounded-sm bg-teal-600 px-1 text-[9px] font-medium text-white">
                        1st
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(i);
                      }}
                      className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-teal-400 px-2 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Upload images
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFiles(e.target.files);
                }
              }}
            />

            {productImages.length > 0 && (
              <>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Or toggle from product images
                </p>
                <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto">
                  {productImages.map((url) => {
                    const picked = value.includes(url);
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => togglePick(url)}
                        className={`aspect-square overflow-hidden rounded-md border-2 ${
                          picked ? 'border-teal-500' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={
          value.length > 0
            ? `${value.length} image${value.length !== 1 ? 's' : ''} — click to manage`
            : 'Assign images to this variant'
        }
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 hover:border-teal-400"
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Variant" className="h-full w-full object-cover" />
            {value.length > 1 && (
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-teal-600 px-1.5 text-[9px] font-medium text-white">
                +{value.length - 1}
              </span>
            )}
          </>
        ) : (
          <ImageIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {popover}
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Option Type Editor
// ──────────────────────────────────────────────────────────

interface OptionTypeEditorProps {
  option: OptionType;
  onChange: (option: OptionType) => void;
  onRemove: () => void;
  index: number;
}

function OptionTypeEditor({ option, onChange, onRemove, index }: OptionTypeEditorProps) {
  const [newValue, setNewValue] = useState('');

  const addValue = () => {
    const trimmed = newValue.trim();
    if (trimmed && !option.values.includes(trimmed)) {
      onChange({ ...option, values: [...option.values, trimmed] });
      setNewValue('');
    }
  };

  const removeValue = (valueIndex: number) => {
    onChange({
      ...option,
      values: option.values.filter((_, i) => i !== valueIndex),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Option {index + 1}</span>
        </div>
        <button
          onClick={onRemove}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Option Name */}
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">Option Name</label>
        <input
          type="text"
          value={option.name}
          onChange={(e) => onChange({ ...option, name: e.target.value })}
          placeholder="e.g., Color, Size, Weight"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Option Values */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Values</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {option.values.map((value, valueIndex) => (
            <span
              key={valueIndex}
              className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-sm text-teal-700"
            >
              {value}
              <button
                onClick={() => removeValue(valueIndex)}
                className="rounded-full p-0.5 hover:bg-teal-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a value and press Enter"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            onClick={addValue}
            disabled={!newValue.trim()}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Variants Form
// ──────────────────────────────────────────────────────────

/**
 * Product variants form for managing option types and variant matrix.
 *
 * Allows defining option types (e.g., Color, Size) with values,
 * then auto-generates a variant matrix with price/stock/SKU per variant.
 * All prices in BDT (৳).
 */
export function VariantsForm({
  options,
  variants,
  onOptionsChange,
  onVariantsChange,
  basePrice = 0,
  baseSku = '',
  productImages = [],
}: VariantsFormProps) {
  const [showVariants, setShowVariants] = useState(variants.length > 0);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ─── Option Handlers ──────────────────────────────────────────────

  const addOption = () => {
    onOptionsChange([...options, { id: generateId(), name: '', values: [] }]);
  };

  const updateOption = (index: number, option: OptionType) => {
    const updated = [...options];
    updated[index] = option;
    onOptionsChange(updated);
  };

  const removeOption = (index: number) => {
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  // ─── Generate Variants ────────────────────────────────────────────

  const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);
  const canGenerate = validOptions.length > 0;

  const handleGenerateVariants = () => {
    if (!canGenerate) {
      return;
    }
    const generated = generateVariantMatrix(validOptions, basePrice, baseSku, variants);
    onVariantsChange(generated);
    setShowVariants(true);
  };

  // ─── Update Variant ───────────────────────────────────────────────

  const updateVariant = (index: number, field: keyof Variant, value: unknown) => {
    const updated = [...variants];
    const existing = updated[index];
    if (!existing) {
      return;
    }
    updated[index] = { ...existing, [field]: value };
    onVariantsChange(updated);
  };

  const deleteVariant = async (index: number) => {
    const target = variants[index];
    if (!target) {
      return;
    }
    const label = Object.values(target.options).join(' / ') || 'this variant';
    const ok = await confirm({
      title: 'Delete variant?',
      description: `Remove "${label}"? This takes effect when you click Save Changes.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    onVariantsChange(variants.filter((_, i) => i !== index));
  };

  const totalVariants = canGenerate ? validOptions.reduce((acc, o) => acc * o.values.length, 1) : 0;

  // Daraz-style "one image per colour value": detect the colour option (if
  // any), and only expose an editable image picker on the first matrix row
  // for each colour value. Size/material-only rows of the same colour
  // inherit that image. When there's no colour option at all, the IMAGE
  // column disappears completely — uploading per size makes no sense.
  const colorOptionName = options.find((o) => /^(color|colour)$/i.test(o.name.trim()))?.name;
  const colorOwnerIndex: Record<string, number> = {};
  if (colorOptionName) {
    variants.forEach((v, i) => {
      const c = v.options[colorOptionName];
      if (c && !(c in colorOwnerIndex)) {
        colorOwnerIndex[c] = i;
      }
    });
  }

  /** Apply an image URL list to every variant row sharing a colour value,
   *  so the saved data stays internally consistent regardless of which
   *  combination the customer ends up selecting. */
  const setImagesForColor = (colorValue: string, urls: string[]) => {
    if (!colorOptionName) {
      return;
    }
    onVariantsChange(
      variants.map((v) =>
        v.options[colorOptionName] === colorValue ? { ...v, imageUrls: urls } : v,
      ),
    );
  };

  /** Mark a single variant as the default. Clears the flag on all others
   *  so the invariant (at most one default per product) holds locally. */
  const setDefaultVariant = (index: number) => {
    onVariantsChange(variants.map((v, i) => ({ ...v, isDefault: i === index })));
  };

  // Surface the "Default" radio only when there's more than one variant.
  // With a single variant it's effectively the default already.
  const showDefaultColumn = variants.length > 1;

  return (
    <div className="space-y-6">
      {confirmDialog}

      {/* Explainer */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <div>
          <p>
            Variants let you sell a product in several versions — like Small / Medium / Large or Red
            / Blue. Add the options first, then generate the variant grid and set a price and stock
            for each combination.
          </p>
          <p className="mt-2 text-blue-800">
            <strong>Tip:</strong> name a Colour option exactly <code>Color</code> (or{' '}
            <code>Colour</code>) — the storefront renders it as image swatches and you can attach
            multiple images per colour. Mark one variant as <em>Default</em> to control which image
            and price the product details page shows on first load.
          </p>
        </div>
      </div>

      {/* Option Types */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Step 1 — Define options</h2>
          </div>
          <button
            onClick={addOption}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Option
          </button>
        </div>

        {options.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <Layers className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No options defined. Add options like Color, Size, or Weight to create product
              variants.
            </p>
            <button
              onClick={addOption}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Add First Option
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {options.map((option, index) => (
              <OptionTypeEditor
                key={option.id}
                option={option}
                onChange={(updated) => updateOption(index, updated)}
                onRemove={() => removeOption(index)}
                index={index}
              />
            ))}

            {/* Generate Variants Button */}
            <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
              <p className="text-sm text-teal-700">
                {canGenerate ? (
                  <>
                    This will generate <span className="font-semibold">{totalVariants}</span>{' '}
                    variant{totalVariants !== 1 ? 's' : ''}. Existing edits are preserved when you
                    regenerate.
                  </>
                ) : (
                  <>Add at least one option with a name and a value.</>
                )}
              </p>
              <button
                onClick={handleGenerateVariants}
                disabled={!canGenerate}
                title={
                  canGenerate
                    ? 'Generate the variant grid'
                    : 'Add at least one option with a name and a value first'
                }
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate Variants
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Variant Matrix Table */}
      {showVariants && variants.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Step 2 — Set price and stock ({variants.length})
            </h3>
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showVariants ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {colorOptionName && (
                    <th className="w-14 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Image
                    </th>
                  )}
                  {options
                    .filter((o) => o.name.trim())
                    .map((option) => (
                      <th
                        key={option.id}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {option.name}
                      </th>
                    ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Price (৳)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Active
                  </th>
                  {showDefaultColumn && (
                    <th
                      className="w-16 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                      title="Storefront shows this variant's image and price on initial load"
                    >
                      Default
                    </th>
                  )}
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((variant, index) => {
                  const colorValue = colorOptionName ? variant.options[colorOptionName] : undefined;
                  const ownerIdx = colorValue ? colorOwnerIndex[colorValue] : undefined;
                  const isImageOwner = ownerIdx === index;
                  const inheritedUrls =
                    colorValue && ownerIdx !== undefined
                      ? (variants[ownerIdx]?.imageUrls ?? [])
                      : [];

                  return (
                    <tr key={variant.id} className="hover:bg-gray-50">
                      {colorOptionName && (
                        <td className="px-4 py-2">
                          {isImageOwner && colorValue ? (
                            <VariantImagePicker
                              value={variant.imageUrls ?? []}
                              productImages={productImages}
                              onChange={(urls) => setImagesForColor(colorValue, urls)}
                            />
                          ) : inheritedUrls.length > 0 ? (
                            <div
                              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 opacity-70"
                              title={`Images inherited from the ${colorValue} colour (${inheritedUrls.length})`}
                            >
                              <img
                                src={inheritedUrls[0]}
                                alt={`${colorValue} variant`}
                                className="h-full w-full object-cover"
                              />
                              {inheritedUrls.length > 1 && (
                                <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-gray-500 px-1.5 text-[9px] font-medium text-white">
                                  +{inheritedUrls.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-[10px] text-gray-400"
                              title={`Set images on the first ${colorValue ?? 'colour'} row`}
                            >
                              —
                            </div>
                          )}
                        </td>
                      )}
                      {options
                        .filter((o) => o.name.trim())
                        .map((option) => (
                          <td
                            key={option.id}
                            className="whitespace-nowrap px-4 py-2 text-sm text-gray-700"
                          >
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                              {variant.options[option.name] ?? '—'}
                            </span>
                          </td>
                        ))}
                      <td className="px-4 py-2">
                        <div className="flex rounded border border-gray-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                          <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-2 text-xs text-gray-500">
                            ৳
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price ?? ''}
                            onChange={(e) =>
                              updateVariant(
                                index,
                                'price',
                                e.target.value ? parseFloat(e.target.value) : null,
                              )
                            }
                            className="w-24 rounded-r px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(index, 'stock', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(e) => updateVariant(index, 'isActive', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      {showDefaultColumn && (
                        <td className="px-4 py-2 text-center">
                          <input
                            type="radio"
                            name="variant-default"
                            checked={variant.isDefault === true}
                            onChange={() => setDefaultVariant(index)}
                            className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                            title="Show this variant's image and price on initial PDP load"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => deleteVariant(index)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete variant"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
