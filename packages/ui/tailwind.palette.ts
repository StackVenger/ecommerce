import defaultColors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/**
 * Theme-aware colour palettes for the bento design system.
 *
 * Every shade of the palettes below is exposed to Tailwind as
 * `rgb(var(--palette-<name>-<shade>) / <alpha-value>)`, so utilities such as
 * `bg-gray-50`, `text-emerald-600` or `bg-rose-50/60` keep working with
 * opacity modifiers while their actual colour comes from CSS variables.
 *
 * `:root` carries the light values; `html.dark` swaps in a dark set derived
 * from the same hues: light tints (50–200) become deep warm tints, text
 * shades (700–950) lighten for contrast, and the warm gray scale inverts.
 * Toggling the `dark` class on <html> therefore re-themes the whole app
 * without per-component `dark:` variants.
 */

type Scale = Record<string, string>;

const SHADES = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

/** Warm neutral scale (light) — off-white canvas through near-black ink. */
const GRAY_LIGHT: Scale = {
  50: '#fbf9f6',
  100: '#f5f2ee',
  200: '#ebe7e1',
  300: '#dcd7d0',
  400: '#a8a49e',
  500: '#78746f',
  600: '#5b5854',
  700: '#44423f',
  800: '#2d2b29',
  900: '#1a1a1a',
  950: '#0d0c0b',
};

/** Warm neutral scale (dark) — inverted so text stays light and surfaces stay dark. */
const GRAY_DARK: Scale = {
  50: '#141210',
  100: '#24201c',
  200: '#302b27',
  300: '#3e3934',
  400: '#6f6a63',
  500: '#9a948c',
  600: '#b8b2aa',
  700: '#d3cec7',
  800: '#e7e3dd',
  900: '#f4f1ec',
  950: '#faf8f5',
};

/** Coral accent scale; 600 is the --primary token. */
const BRAND_LIGHT: Scale = {
  50: '#fff4ef',
  100: '#ffe7de',
  200: '#ffd0c0',
  300: '#fdb29b',
  400: '#f99177',
  500: '#f67e63',
  600: '#f46e54',
  700: '#dc5a40',
  800: '#b4452f',
  900: '#8a3525',
  950: '#4a1a10',
};

/** Dark-mode canvas the tints are blended toward (matches gray-50 dark). */
const DARK_CANVAS = GRAY_DARK['50'] as string;

/** Chromatic palettes the storefront/admin use, taken from Tailwind's defaults. */
const CHROMATIC = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Blend `a` toward `b` by `t` (0 = a, 1 = b) and return an "r g b" triplet. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
    .map((v) => Math.round(v))
    .join(' ');
}

const triplet = (hex: string) => hexToRgb(hex).join(' ');

/**
 * Derive a dark-mode scale from a light one:
 *  - 50/100/200: the palette's deepest shades pulled toward the canvas (soft tinted surfaces)
 *  - 300: a mid-dark tone (tinted borders)
 *  - 400–500: unchanged (icons, solid badges keep their identity)
 *  - 600–950: mirrored to the light end — these shades are overwhelmingly
 *    used as text on tints, which needs the lighter tone on a dark canvas
 */
function darkScale(light: Scale): Record<string, string> {
  const s = (k: string) => light[k] as string;
  return {
    50: mix(s('950'), DARK_CANVAS, 0.62),
    100: mix(s('900'), DARK_CANVAS, 0.55),
    200: mix(s('800'), DARK_CANVAS, 0.45),
    300: mix(s('700'), DARK_CANVAS, 0.25),
    400: triplet(s('400')),
    500: triplet(s('500')),
    600: triplet(s('400')),
    700: triplet(s('400')),
    800: triplet(s('300')),
    900: triplet(s('200')),
    950: triplet(s('100')),
  };
}

const lightScales: Record<string, Scale> = { gray: GRAY_LIGHT, brand: BRAND_LIGHT };
for (const name of CHROMATIC) {
  lightScales[name] = defaultColors[name] as unknown as Scale;
}

const cssVar = (name: string, shade: string) => `--palette-${name}-${shade}`;

/** Tailwind `colors` entries pointing at the palette variables. */
export const themeAwareColors: Record<string, Record<string, string>> = Object.fromEntries(
  Object.keys(lightScales).map((name) => [
    name,
    Object.fromEntries(
      SHADES.map((shade) => [shade, `rgb(var(${cssVar(name, shade)}) / <alpha-value>)`]),
    ),
  ]),
);

function varsFor(mode: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, light] of Object.entries(lightScales)) {
    const values =
      mode === 'light'
        ? Object.fromEntries(SHADES.map((s) => [s, triplet(light[s] as string)]))
        : name === 'gray'
          ? Object.fromEntries(SHADES.map((s) => [s, triplet(GRAY_DARK[s] as string)]))
          : darkScale(light);
    for (const shade of SHADES) {
      out[cssVar(name, shade)] = values[shade] as string;
    }
  }
  // Ink: the emphasis tile colour. In dark mode it lifts slightly above the
  // canvas so ink tiles still read as a distinct, raised surface.
  out['--palette-ink'] = mode === 'light' ? triplet('#1a1a1a') : triplet('#2a2521');
  out['--palette-ink-soft'] = mode === 'light' ? triplet('#262626') : triplet('#35302b');
  return out;
}

/**
 * Emits the palette variables:
 *  - `:root` → light values
 *  - `html.dark` → dark values
 *  - `html.dark .theme-light` → light values again, for regions that must stay
 *    light (e.g. printable invoices).
 */
export const paletteVarsPlugin = plugin(({ addBase }) => {
  const light = varsFor('light');
  addBase({
    ':root': light,
    'html.dark': varsFor('dark'),
    'html.dark .theme-light': light,
  });
});

export const inkColors = {
  DEFAULT: 'rgb(var(--palette-ink) / <alpha-value>)',
  soft: 'rgb(var(--palette-ink-soft) / <alpha-value>)',
};
