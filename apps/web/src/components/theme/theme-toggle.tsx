'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { type ColorMode, useColorMode } from '@/lib/theme/color-mode';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Theme toggle
// ──────────────────────────────────────────────────────────

/**
 * Square hairline icon button that flips between light and dark mode,
 * matching the header's other icon buttons. The sun/moon glyphs cross-fade.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useColorMode();
  const isDark = resolved === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'btn-icon relative overflow-hidden border border-gray-200 bg-card text-gray-700 hover:bg-gray-100',
        className,
      )}
    >
      <Sun
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <Moon
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}

const OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Segmented Light / Dark / System control for menus and settings panels:
 * flat square segments in a hairline frame, the active one coral.
 */
export function ThemeModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useColorMode();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('flex divide-x divide-gray-200 border border-gray-200 bg-card', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              active ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
