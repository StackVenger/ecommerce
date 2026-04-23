'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { tailwindThemeVars, type ThemeColorsInput } from '@/lib/theme/color-utils';

interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  banglaFont: string;
  monoFont: string;
  baseFontSize: string;
  headingWeight: string;
  bodyWeight: string;
  lineHeight: string;
}

interface ThemeBorders {
  radius: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
  width: string;
  color: string;
}

interface ThemeLayout {
  headerStyle: string;
  footerStyle: string;
  heroStyle: string;
  productCardStyle: string;
  containerMaxWidth: string;
  sidebarPosition: string;
}

interface ThemeConfig {
  colors: ThemeColors;
  typography: ThemeTypography;
  borders: ThemeBorders;
  layout: ThemeLayout;
  customCSS: string;
  logoUrl: string;
  faviconUrl: string;
}

interface ThemeContextValue {
  theme: ThemeConfig | null;
  loading: boolean;
  error: string | null;
  refreshTheme: () => Promise<void>;
}

const THEME_CACHE_KEY = 'bdshop_theme_cache';
const THEME_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  loading: true,
  error: null,
  refreshTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getCachedTheme(): ThemeConfig | null {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as {
      theme: ThemeConfig;
      timestamp: number;
    };
    if (Date.now() - parsed.timestamp > THEME_CACHE_TTL) {
      localStorage.removeItem(THEME_CACHE_KEY);
      return null;
    }

    return parsed.theme;
  } catch {
    return null;
  }
}

function setCachedTheme(theme: ThemeConfig): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ theme, timestamp: Date.now() }));
  } catch {
    // localStorage may be full or unavailable
  }
}

function generateCSSVariables(theme: ThemeConfig): string {
  const vars: string[] = [];

  // Colors: emit two flavours side by side.
  //
  // 1. Legacy `--color-*` in raw hex — consumed by any existing inline
  //    style / custom CSS that references e.g. `var(--color-primary)`.
  // 2. Tailwind shadcn-style `--primary`, `--accent`, ... in HSL-space-
  //    separated format, so `bg-primary`, `text-accent-foreground`, etc.
  //    resolve correctly. This is the same mapping the SSR helper in
  //    lib/theme/css-vars.ts produces, so live admin edits flip Tailwind
  //    classes without a reload.
  if (theme.colors) {
    const colorMap: Record<string, string> = {
      primary: theme.colors.primary,
      'primary-light': theme.colors.primaryLight,
      'primary-dark': theme.colors.primaryDark,
      secondary: theme.colors.secondary,
      'secondary-light': theme.colors.secondaryLight,
      'secondary-dark': theme.colors.secondaryDark,
      accent: theme.colors.accent,
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      'text-secondary': theme.colors.textSecondary,
      border: theme.colors.border,
      success: theme.colors.success,
      warning: theme.colors.warning,
      error: theme.colors.error,
      info: theme.colors.info,
    };

    Object.entries(colorMap).forEach(([key, value]) => {
      if (value) {
        vars.push(`--color-${key}: ${value}`);
      }
    });

    const twVars = tailwindThemeVars(theme.colors as ThemeColorsInput);
    for (const [name, value] of Object.entries(twVars)) {
      vars.push(`${name}: ${value}`);
    }
  }

  // Typography
  if (theme.typography) {
    vars.push(`--font-heading: '${theme.typography.headingFont}', sans-serif`);
    vars.push(`--font-body: '${theme.typography.bodyFont}', sans-serif`);
    vars.push(`--font-bangla: '${theme.typography.banglaFont}', sans-serif`);
    vars.push(`--font-mono: '${theme.typography.monoFont}', monospace`);
    vars.push(`--font-size-base: ${theme.typography.baseFontSize}`);
    vars.push(`--font-weight-heading: ${theme.typography.headingWeight}`);
    vars.push(`--font-weight-body: ${theme.typography.bodyWeight}`);
    vars.push(`--line-height: ${theme.typography.lineHeight}`);
  }

  // Borders
  if (theme.borders) {
    vars.push(`--border-radius: ${theme.borders.radius}`);
    vars.push(`--border-radius-sm: ${theme.borders.radiusSm}`);
    vars.push(`--border-radius-md: ${theme.borders.radiusMd}`);
    vars.push(`--border-radius-lg: ${theme.borders.radiusLg}`);
    vars.push(`--border-radius-full: ${theme.borders.radiusFull}`);
    vars.push(`--border-width: ${theme.borders.width}`);
    vars.push(`--border-color: ${theme.borders.color}`);
  }

  // Layout
  if (theme.layout) {
    vars.push(`--container-max-width: ${theme.layout.containerMaxWidth}`);
  }

  return `:root { ${vars.join('; ')} }`;
}

function getGoogleFontsUrl(typography: ThemeTypography): string {
  const fonts = new Set<string>();

  if (typography.headingFont) {
    fonts.add(`${typography.headingFont}:wght@${typography.headingWeight || '700'}`);
  }
  if (typography.bodyFont && typography.bodyFont !== typography.headingFont) {
    fonts.add(`${typography.bodyFont}:wght@${typography.bodyWeight || '400'};700`);
  }
  if (typography.banglaFont) {
    fonts.add(`${typography.banglaFont}:wght@400;700`);
  }
  if (typography.monoFont) {
    fonts.add(typography.monoFont);
  }

  if (fonts.size === 0) {
    return '';
  }

  const familyParam = Array.from(fonts)
    .map((f) => `family=${f.replace(/ /g, '+')}`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;
}

function applyThemeToDOM(theme: ThemeConfig): void {
  // Apply CSS variables
  const cssVarsStyleId = 'bdshop-theme-vars';
  let varsStyle = document.getElementById(cssVarsStyleId) as HTMLStyleElement | null;
  if (!varsStyle) {
    varsStyle = document.createElement('style');
    varsStyle.id = cssVarsStyleId;
    document.head.appendChild(varsStyle);
  }
  varsStyle.textContent = generateCSSVariables(theme);

  // Apply custom CSS
  const customCSSId = 'bdshop-custom-css';
  let customStyle = document.getElementById(customCSSId) as HTMLStyleElement | null;
  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = customCSSId;
    document.head.appendChild(customStyle);
  }
  customStyle.textContent = theme.customCSS || '';

  // Load Google Fonts
  if (theme.typography) {
    const fontsUrl = getGoogleFontsUrl(theme.typography);
    if (fontsUrl) {
      const fontsLinkId = 'bdshop-google-fonts';
      let fontsLink = document.getElementById(fontsLinkId) as HTMLLinkElement | null;
      if (!fontsLink) {
        fontsLink = document.createElement('link');
        fontsLink.id = fontsLinkId;
        fontsLink.rel = 'stylesheet';
        document.head.appendChild(fontsLink);
      }
      fontsLink.href = fontsUrl;
    }

    // Apply base font to body
    document.body.style.fontFamily = `var(--font-body)`;
    document.body.style.fontSize = `var(--font-size-base)`;
    document.body.style.lineHeight = `var(--line-height)`;
    document.body.style.fontWeight = `var(--font-weight-body)`;
    document.body.style.color = `var(--color-text)`;
    document.body.style.backgroundColor = `var(--color-background)`;
  }

  // Apply favicon
  if (theme.faviconUrl) {
    const faviconId = 'bdshop-favicon';
    let faviconLink = document.getElementById(faviconId) as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.id = faviconId;
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = theme.faviconUrl;
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export default function ThemeProvider({ children, apiBaseUrl = '/api' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTheme = useCallback(async () => {
    try {
      // Try cache first
      const cached = getCachedTheme();
      if (cached) {
        setTheme(cached);
        applyThemeToDOM(cached);
        setLoading(false);

        // Still fetch fresh theme in background
        void fetch(`${apiBaseUrl}/theme`)
          .then((res) => res.json() as Promise<ThemeConfig>)
          .then((freshTheme) => {
            setTheme(freshTheme);
            setCachedTheme(freshTheme);
            applyThemeToDOM(freshTheme);
          })
          .catch(() => {
            // Silently fail, we have cached version
          });
        return;
      }

      const response = await fetch(`${apiBaseUrl}/theme`);
      if (!response.ok) {
        throw new Error('Failed to fetch theme');
      }

      const data = (await response.json()) as ThemeConfig;
      setTheme(data);
      setCachedTheme(data);
      applyThemeToDOM(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load theme';
      // eslint-disable-next-line no-console
      console.error('Theme loading error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void fetchTheme();
  }, [fetchTheme]);

  // Listen for theme updates (e.g., from admin panel in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as {
            theme: ThemeConfig;
            timestamp: number;
          };
          setTheme(parsed.theme);
          applyThemeToDOM(parsed.theme);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshTheme = useCallback(async () => {
    localStorage.removeItem(THEME_CACHE_KEY);
    await fetchTheme();
  }, [fetchTheme]);

  const contextValue = useMemo(
    () => ({ theme, loading, error, refreshTheme }),
    [theme, loading, error, refreshTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

// Hook to get specific theme values
export function useThemeColors() {
  const { theme } = useTheme();
  return theme?.colors || null;
}

export function useThemeTypography() {
  const { theme } = useTheme();
  return theme?.typography || null;
}

export function useThemeLayout() {
  const { theme } = useTheme();
  return theme?.layout || null;
}

// Utility component for applying Bangla font
export function BanglaText({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-bangla)', ...props.style }}
      {...props}
    >
      {children}
    </span>
  );
}
