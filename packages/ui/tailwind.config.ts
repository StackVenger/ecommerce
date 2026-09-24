import type { Config } from 'tailwindcss';

import { inkColors, paletteVarsPlugin, themeAwareColors } from './tailwind.palette';

/**
 * Base Tailwind CSS configuration preset for @ecommerce/ui.
 *
 * This config is intended to be used as a preset in consuming
 * applications (e.g. apps/web) so that design tokens, animations,
 * and color definitions remain consistent across the monorepo.
 *
 * @example
 * ```ts
 * // apps/web/tailwind.config.ts
 * import uiPreset from '@ecommerce/ui/tailwind.config';
 *
 * const config: Config = {
 *   presets: [uiPreset],
 *   content: ['./src/**\/*.{ts,tsx}'],
 * };
 * ```
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        bengali: ['var(--font-noto-sans-bengali)', 'Noto Sans Bengali', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Bento design system palettes (see ./tailwind.palette.ts): warm
        // `gray`, coral `brand` and the Tailwind chromatic palettes all
        // resolve through CSS variables, so the `dark` class on <html>
        // re-themes every existing utility (light/dark mode).
        ...themeAwareColors,
        ink: inkColors,
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      screens: {
        xs: '475px',
        '3xl': '1920px',
      },
      borderRadius: {
        // Admin theme variants (see apps/web/src/lib/theme/css-vars.ts).
        // Fallbacks keep today's behaviour when the admin hasn't set the
        // variant — `rounded-lg` still collapses to `--radius`, etc.
        sm: 'var(--radius-sm, calc(var(--radius) - 4px))',
        md: 'var(--radius-md, calc(var(--radius) - 2px))',
        lg: 'var(--radius-lg, var(--radius))',
        full: 'var(--radius-full, 9999px)',
        // Scaled off the 1.5rem bento base radius (x1.4 / x1.8 / x2.2 / x2.6),
        // mirroring the reference design system, so small controls read as
        // pills and larger surfaces as soft bento tiles.
        xl: 'calc(var(--radius) * 1.4)',
        '2xl': 'calc(var(--radius) * 1.8)',
        '3xl': 'calc(var(--radius) * 2.2)',
        '4xl': 'calc(var(--radius) * 2.6)',
      },
      boxShadow: {
        // Soft, low-contrast elevation used by bento cards.
        bento: '0 1px 2px rgba(26, 26, 26, 0.04), 0 1px 1px rgba(26, 26, 26, 0.02)',
        'bento-hover': '0 20px 40px -12px rgba(26, 26, 26, 0.08)',
        'brand-glow': '0 12px 28px -8px rgba(244, 110, 84, 0.35)',
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
        shimmer: 'shimmer 2s infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), paletteVarsPlugin],
};

export default config;
