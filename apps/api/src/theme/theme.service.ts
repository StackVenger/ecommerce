import { Injectable } from '@nestjs/common';

import { RevalidateService } from '../common/revalidate/revalidate.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateThemeDto } from './dto/update-theme.dto';

const DEFAULT_THEME = {
  colors: {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',
    secondary: '#64748b',
    secondaryLight: '#94a3b8',
    secondaryDark: '#475569',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    banglaFont: 'Noto Sans Bengali',
    monoFont: 'JetBrains Mono',
    baseFontSize: '16px',
    headingWeight: '700',
    bodyWeight: '400',
    lineHeight: '1.6',
  },
  borders: {
    radius: '8px',
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    radiusFull: '9999px',
    width: '1px',
    color: '#e2e8f0',
  },
  layout: {
    headerStyle: 'default',
    footerStyle: 'default',
    heroStyle: 'slider',
    productCardStyle: 'default',
    containerMaxWidth: '1280px',
    sidebarPosition: 'left',
  },
  customCSS: '',
  logoUrl: '',
  faviconUrl: '',
};

@Injectable()
export class ThemeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  private readonly THEME_WHERE = { group_key: { group: 'THEME' as const, key: 'config' } };

  async getTheme() {
    const settings = await this.prisma.settings.findUnique({
      where: this.THEME_WHERE,
    });

    if (!settings) {
      return DEFAULT_THEME;
    }

    try {
      const stored = JSON.parse(settings.value) as Partial<ThemeShape>;
      return this.mergeWithDefaults(stored);
    } catch {
      return DEFAULT_THEME;
    }
  }

  async updateTheme(dto: UpdateThemeDto) {
    const currentTheme = await this.getTheme();

    const updatedTheme = {
      colors: { ...currentTheme.colors, ...dto.colors },
      typography: { ...currentTheme.typography, ...dto.typography },
      borders: { ...currentTheme.borders, ...dto.borders },
      layout: { ...currentTheme.layout, ...dto.layout },
      customCSS: dto.customCSS !== undefined ? dto.customCSS : currentTheme.customCSS,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : currentTheme.logoUrl,
      faviconUrl: dto.faviconUrl !== undefined ? dto.faviconUrl : currentTheme.faviconUrl,
    };

    await this.prisma.settings.upsert({
      where: this.THEME_WHERE,
      create: {
        group: 'THEME',
        key: 'config',
        value: JSON.stringify(updatedTheme),
      },
      update: {
        value: JSON.stringify(updatedTheme),
      },
    });

    void this.revalidate.revalidate({ tags: ['site-config', 'theme'] });
    return updatedTheme;
  }

  async resetTheme() {
    await this.prisma.settings.upsert({
      where: this.THEME_WHERE,
      create: {
        group: 'THEME',
        key: 'config',
        value: JSON.stringify(DEFAULT_THEME),
      },
      update: {
        value: JSON.stringify(DEFAULT_THEME),
      },
    });

    void this.revalidate.revalidate({ tags: ['site-config', 'theme'] });
    return DEFAULT_THEME;
  }

  private mergeWithDefaults(stored: Partial<ThemeShape>): ThemeShape {
    return {
      colors: { ...DEFAULT_THEME.colors, ...(stored.colors ?? {}) },
      typography: { ...DEFAULT_THEME.typography, ...(stored.typography ?? {}) },
      borders: { ...DEFAULT_THEME.borders, ...(stored.borders ?? {}) },
      layout: { ...DEFAULT_THEME.layout, ...(stored.layout ?? {}) },
      customCSS: stored.customCSS ?? DEFAULT_THEME.customCSS,
      logoUrl: stored.logoUrl ?? DEFAULT_THEME.logoUrl,
      faviconUrl: stored.faviconUrl ?? DEFAULT_THEME.faviconUrl,
    };
  }

  generateCSSVariables(theme: ThemeShape): string {
    const vars: string[] = [];

    if (theme.colors) {
      for (const [key, value] of Object.entries(theme.colors)) {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        vars.push(`  --color-${cssKey}: ${String(value)};`);
      }
    }

    const t = theme.typography;
    if (t) {
      vars.push(`  --font-heading: '${t.headingFont}', sans-serif;`);
      vars.push(`  --font-body: '${t.bodyFont}', sans-serif;`);
      vars.push(`  --font-bangla: '${t.banglaFont}', sans-serif;`);
      vars.push(`  --font-mono: '${t.monoFont}', monospace;`);
      vars.push(`  --font-size-base: ${t.baseFontSize};`);
      vars.push(`  --font-weight-heading: ${t.headingWeight};`);
      vars.push(`  --font-weight-body: ${t.bodyWeight};`);
      vars.push(`  --line-height: ${t.lineHeight};`);
    }

    const b = theme.borders;
    if (b) {
      vars.push(`  --border-radius: ${b.radius};`);
      vars.push(`  --border-radius-sm: ${b.radiusSm};`);
      vars.push(`  --border-radius-md: ${b.radiusMd};`);
      vars.push(`  --border-radius-lg: ${b.radiusLg};`);
      vars.push(`  --border-radius-full: ${b.radiusFull};`);
      vars.push(`  --border-width: ${b.width};`);
      vars.push(`  --border-color: ${b.color};`);
    }

    if (theme.layout) {
      vars.push(`  --container-max-width: ${theme.layout.containerMaxWidth};`);
    }

    return `:root {\n${vars.join('\n')}\n}`;
  }
}

type ThemeShape = typeof DEFAULT_THEME;
