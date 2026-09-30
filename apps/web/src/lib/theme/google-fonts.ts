import type { ThemeConfig } from '@/lib/config/site-config';

/**
 * Build a Google Fonts stylesheet URL covering the admin-selected
 * heading, body and Bangla families. Returns an empty string when the
 * theme uses only the default Inter / Noto Sans Bengali already loaded
 * by next/font, so we don't fire an extra request in the common case.
 *
 * Skipped families:
 *  - "Inter", "Montserrat", "IBM Plex Sans": already loaded via next/font
 *    in the root layout.
 *  - "Noto Sans Bengali": ditto.
 */
const PRELOADED = new Set(['Inter', 'Montserrat', 'IBM Plex Sans', 'Noto Sans Bengali']);

export function getGoogleFontsUrl(typography: ThemeConfig['typography'] | undefined): string {
  if (!typography) {
    return '';
  }

  const families = new Map<string, Set<string>>();
  const add = (family: string | undefined, weight: string) => {
    if (!family || PRELOADED.has(family)) {
      return;
    }
    const w = families.get(family) ?? new Set<string>();
    w.add(weight);
    families.set(family, w);
  };

  const headingWeight = typography.headingWeight || '700';
  const bodyWeight = typography.bodyWeight || '400';

  add(typography.headingFont, headingWeight);
  add(typography.bodyFont, bodyWeight);
  add(typography.bodyFont, '700'); // body bold
  add(typography.banglaFont, '400');
  add(typography.banglaFont, '700');

  if (families.size === 0) {
    return '';
  }

  const params = Array.from(families.entries())
    .map(([family, weights]) => {
      const sorted = Array.from(weights).sort();
      return `family=${family.replace(/ /g, '+')}:wght@${sorted.join(';')}`;
    })
    .join('&');

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
