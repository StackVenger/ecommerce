// Server-safe colour-mode constants (no 'use client'), shared by the root
// layout's pre-paint script and the client hooks in ./color-mode.ts.

export const COLOR_MODE_STORAGE_KEY = 'color-mode';

export const COLOR_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Inline script for <head>: applies the stored / system mode before the
 * first paint so dark-mode visitors never see a light flash.
 */
export const COLOR_MODE_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('${COLOR_MODE_STORAGE_KEY}');var d=m==='dark'||((!m||m==='system')&&window.matchMedia('${COLOR_MODE_MEDIA_QUERY}').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
