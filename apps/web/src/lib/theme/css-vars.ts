import 'server-only';

import { tailwindThemeVars } from './color-utils';

import type { ThemeConfig } from '@/lib/config/site-config';

/**
 * Build a `:root { --var: … }` block from a ThemeConfig so the initial
 * HTML already has the admin-set colors applied. Eliminates the flash
 * of default-theme colors that the previous client-only ThemeProvider
 * exhibited.
 */
export function themeToCssVars(theme: ThemeConfig): string {
  const vars = tailwindThemeVars(theme.colors ?? {});
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);

  const radius = theme.borders?.radius;
  if (radius) {
    lines.push(`  --radius: ${radius};`);
  }

  return `:root {\n${lines.join('\n')}\n}`;
}
