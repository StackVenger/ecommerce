/**
 * Isomorphic colour helpers. Shared between the server-side layout
 * (which bakes the admin theme into the initial HTML) and the client
 * ThemeProvider (which applies live updates when the admin edits the
 * theme without a page reload).
 */

/**
 * Convert "#rrggbb" or "#rgb" to a space-separated HSL triple that fits
 * inside `hsl(var(--x))` in Tailwind. Values already in that shape are
 * returned unchanged so callers can feed either form without branching.
 *
 * Example: `"#dc2626"` → `"0 84% 50%"`.
 */
export function hexToHsl(input: string): string {
  const hex = input.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return hex;
  }

  const digits = match[1] ?? '';
  let r: number;
  let g: number;
  let b: number;
  if (digits.length === 3) {
    r = parseInt((digits[0] ?? '0').repeat(2), 16);
    g = parseInt((digits[1] ?? '0').repeat(2), 16);
    b = parseInt((digits[2] ?? '0').repeat(2), 16);
  } else {
    r = parseInt(digits.slice(0, 2), 16);
    g = parseInt(digits.slice(2, 4), 16);
    b = parseInt(digits.slice(4, 6), 16);
  }

  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      default:
        h = (rN - gN) / d + 4;
    }
    h *= 60;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Admin colour keys we expose, for both server and client writers. */
export interface ThemeColorsInput {
  primary?: string;
  primaryLight?: string;
  primaryDark?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryLight?: string;
  secondaryDark?: string;
  secondaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  background?: string;
  surface?: string;
  text?: string;
  textSecondary?: string;
  border?: string;
  success?: string;
  warning?: string;
  error?: string;
  destructive?: string;
  info?: string;
  [k: string]: string | undefined;
}

/**
 * Map admin colour keys to the Tailwind-shadcn CSS variable names that
 * `packages/ui/tailwind.config.ts` consumes. The returned object is the
 * set of CSS custom property assignments that need to land on `:root`.
 * Foregrounds default to sensible contrast values when the admin hasn't
 * set an explicit one.
 */
export function tailwindThemeVars(colors: ThemeColorsInput): Record<string, string> {
  const src: Record<string, string | undefined> = {
    '--background': colors.background,
    '--foreground': colors.text,
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground ?? '#ffffff',
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground ?? colors.text,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground ?? '#ffffff',
    '--muted': colors.surface ?? colors.secondary,
    '--muted-foreground': colors.textSecondary ?? colors.text,
    '--border': colors.border,
    '--input': colors.border,
    '--ring': colors.primary,
    '--destructive': colors.error ?? colors.destructive,
    '--destructive-foreground': '#ffffff',
    '--success': colors.success,
    '--success-foreground': '#ffffff',
    '--warning': colors.warning,
    '--warning-foreground': '#0f172a',
    '--info': colors.info,
    '--info-foreground': '#ffffff',
    '--card': colors.background,
    '--card-foreground': colors.text,
    '--popover': colors.background,
    '--popover-foreground': colors.text,
  };

  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(src)) {
    if (value) {
      out[name] = hexToHsl(value);
    }
  }
  return out;
}
