'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { COLOR_MODE_MEDIA_QUERY, COLOR_MODE_STORAGE_KEY } from './color-mode-script';

// ──────────────────────────────────────────────────────────
// Light / dark colour mode
//
// The palette is CSS-variable driven (packages/ui/tailwind.palette.ts), so
// the whole UI re-themes when `dark` is toggled on <html>. The user's
// explicit choice is persisted in localStorage; without one we follow the
// OS `prefers-color-scheme` and keep following it live.
// ──────────────────────────────────────────────────────────

export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';

const MEDIA_QUERY = COLOR_MODE_MEDIA_QUERY;
const CHANGE_EVENT = 'color-mode-change';

function readStoredMode(): ColorMode {
  try {
    const value = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches;
}

function resolve(mode: ColorMode): ResolvedColorMode {
  if (mode === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return mode;
}

function applyResolved(resolved: ResolvedColorMode, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    // Cross-fade colours for the switch only (see `.theme-transition` in globals.css).
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function setColorMode(mode: ColorMode) {
  try {
    if (mode === 'system') {
      window.localStorage.removeItem(COLOR_MODE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // Storage can be unavailable (private mode); the class still applies for this page.
  }
  applyResolved(resolve(mode), true);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// ─── Subscription (mode + resolved state) ─────────────────

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MEDIA_QUERY);
  const onSystemChange = () => {
    if (readStoredMode() === 'system') {
      applyResolved(resolve('system'), true);
    }
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === COLOR_MODE_STORAGE_KEY) {
      applyResolved(resolve(readStoredMode()), false);
      onChange();
    }
  };
  // Also react to anything else flipping the class on <html>.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getModeSnapshot = () => readStoredMode();
const getResolvedSnapshot = (): ResolvedColorMode =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';
// The server can't know the visitor's preference; render the light variant
// and let the client snapshot take over after hydration.
const getServerMode = (): ColorMode => 'system';
const getServerResolved = (): ResolvedColorMode => 'light';

/** Current preference (`light` / `dark` / `system`) plus the mode actually shown. */
export function useColorMode() {
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getServerMode);
  const resolved = useSyncExternalStore(subscribe, getResolvedSnapshot, getServerResolved);

  const toggle = useCallback(() => {
    setColorMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  return { mode, resolved, setMode: setColorMode, toggle };
}

/** `true` while dark mode is showing — for JS-coloured UI such as charts. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getResolvedSnapshot, getServerResolved) === 'dark';
}
