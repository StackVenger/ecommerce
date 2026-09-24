'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight color picker for the theme editor. Uses the browser's
 * native <input type="color"> for the actual eyedropper UI (every
 * modern browser renders a real picker) plus a hex text input so admins
 * can paste values. Zero dependencies — react-colorful would be nicer
 * but adding a dep for one component isn't worth it.
 *
 * Value is always a "#rrggbb" string. Shorthand "#rgb" input is
 * expanded before calling back. Bad input is rejected (the last valid
 * value is retained) so the theme service never sees garbage.
 */

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  id?: string;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalise(input: string): string | null {
  const m = HEX_RE.exec(input.trim());
  if (!m) {
    return null;
  }
  const digits = m[1] ?? '';
  if (digits.length === 3) {
    return `#${digits
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  return `#${digits.toLowerCase()}`;
}

export function ColorPicker({ value, onChange, label, id }: ColorPickerProps) {
  const normalised = normalise(value) ?? '#000000';
  const [text, setText] = useState(normalised);
  const lastPropValue = useRef(normalised);

  // Keep the text field synced when the parent re-renders with a new
  // value (e.g. loaded from the API).
  useEffect(() => {
    if (normalised !== lastPropValue.current) {
      lastPropValue.current = normalised;
      setText(normalised);
    }
  }, [normalised]);

  const commit = (raw: string) => {
    const next = normalise(raw);
    if (next) {
      setText(next);
      lastPropValue.current = next;
      onChange(next);
    } else {
      // Revert to last valid on blur so the field never shows garbage.
      setText(lastPropValue.current);
    }
  };

  return (
    <label htmlFor={id} className="block text-xs font-bold text-gray-700">
      {label && <span className="mb-1.5 block">{label}</span>}
      <div className="bento-card flex items-center gap-2 border-foreground/[0.06] p-1.5 transition-all focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
        <input
          id={id}
          type="color"
          value={normalised}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
            lastPropValue.current = e.target.value;
          }}
          className="h-8 w-10 cursor-pointer rounded-xl border-0 bg-transparent p-0"
          aria-label={label ? `${label} color picker` : 'Color picker'}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
            }
          }}
          spellCheck={false}
          className="flex-1 border-0 bg-transparent px-1 py-0.5 font-mono text-sm uppercase text-gray-900 outline-none focus:ring-0"
          aria-label={label ? `${label} hex value` : 'Hex value'}
        />
      </div>
    </label>
  );
}
