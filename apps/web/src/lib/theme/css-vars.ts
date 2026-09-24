import 'server-only';

import { fontStack, tailwindThemeVars } from './color-utils';

import type { ThemeConfig } from '@/lib/config/site-config';

/**
 * Build a `:root { --var: … }` block from a ThemeConfig so the initial
 * HTML already has the admin-set colors and typography applied.
 * Eliminates the flash of default-theme colors that the previous
 * client-only ThemeProvider exhibited.
 *
 * Typography values are emitted so the base rules in globals.css
 * (body, headings, .font-bengali) can read them and swap the rendered
 * font without a reload. The fonts themselves must be loaded separately
 * via the Google Fonts <link> the layout injects.
 */
export function themeToCssVars(theme: ThemeConfig): string {
  const vars = tailwindThemeVars(theme.colors ?? {});
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);

  const b = theme.borders ?? {};
  if (b.radius) {
    lines.push(`  --radius: ${b.radius};`);
  }
  if (b.radiusSm) {
    lines.push(`  --radius-sm: ${b.radiusSm};`);
  }
  if (b.radiusMd) {
    lines.push(`  --radius-md: ${b.radiusMd};`);
  }
  if (b.radiusLg) {
    lines.push(`  --radius-lg: ${b.radiusLg};`);
  }
  if (b.radiusFull) {
    lines.push(`  --radius-full: ${b.radiusFull};`);
  }
  if (b.width) {
    lines.push(`  --border-width: ${b.width};`);
  }
  if (b.color) {
    lines.push(`  --border-color: ${b.color};`);
  }

  const layout = theme.layout ?? {};
  if (layout.containerMaxWidth) {
    lines.push(`  --container-max-width: ${layout.containerMaxWidth};`);
  }

  const t = theme.typography ?? {};
  if (t.headingFont) {
    lines.push(`  --font-heading: ${fontStack(t.headingFont)};`);
  }
  if (t.bodyFont) {
    lines.push(`  --font-body: ${fontStack(t.bodyFont)};`);
  }
  if (t.banglaFont) {
    lines.push(`  --font-bangla: ${fontStack(t.banglaFont)};`);
  }
  if (t.monoFont) {
    lines.push(`  --font-mono: '${t.monoFont}', monospace;`);
  }
  if (t.baseFontSize) {
    lines.push(`  --font-size-base: ${t.baseFontSize};`);
  }
  if (t.headingWeight) {
    lines.push(`  --font-weight-heading: ${t.headingWeight};`);
  }
  if (t.bodyWeight) {
    lines.push(`  --font-weight-body: ${t.bodyWeight};`);
  }
  if (t.lineHeight) {
    lines.push(`  --line-height: ${t.lineHeight};`);
  }

  return `:root {\n${lines.join('\n')}\n}`;
}
