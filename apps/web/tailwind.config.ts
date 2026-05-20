import uiPreset from '@ecommerce/ui/tailwind.config';
import typography from '@tailwindcss/typography';

import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS configuration for the web storefront.
 *
 * Extends the shared UI preset from `@ecommerce/ui` to ensure
 * consistent design tokens across all packages while allowing
 * web-specific customizations.
 */
const config: Config = {
  presets: [uiPreset],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    './src/app/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        bengali: ['var(--font-noto-sans-bengali)', 'Noto Sans Bengali', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      gridTemplateColumns: {
        /** Product grid — auto-fill responsive */
        'product-grid': 'repeat(auto-fill, minmax(260px, 1fr))',
        /** Sidebar layout */
        'sidebar-layout': '280px 1fr',
        /** Dashboard layout */
        'dashboard-layout': '240px 1fr',
      },
      zIndex: {
        header: '40',
        sidebar: '30',
        overlay: '50',
        modal: '60',
        toast: '70',
        tooltip: '80',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [typography],
};

export default config;
