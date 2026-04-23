import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RevalidateService } from '../common/revalidate/revalidate.service';
import { PrismaService } from '../prisma/prisma.service';

export type SettingsGroup = 'general' | 'email' | 'shipping' | 'tax' | 'payment' | 'seo';

/** Map lowercase URL param to DB enum value. */
function dbGroup(group: SettingsGroup): string {
  return group.toUpperCase();
}

interface SettingRecord {
  id: string;
  group: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  /** Retrieve all settings for a given group. */
  async getByGroup(group: SettingsGroup): Promise<Record<string, string>> {
    const g = dbGroup(group);
    const rows: SettingRecord[] = await this.prisma.$queryRaw`
      SELECT * FROM settings WHERE "group"::text = ${g} ORDER BY key
    `;

    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  /** Retrieve a single setting value. */
  async get(group: SettingsGroup, key: string): Promise<string> {
    const g = dbGroup(group);
    const rows: SettingRecord[] = await this.prisma.$queryRaw`
      SELECT * FROM settings WHERE "group"::text = ${g} AND key = ${key} LIMIT 1
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Setting ${group}.${key} not found`);
    }

    return rows[0].value;
  }

  /** Upsert multiple settings in a single group. */
  async updateGroup(
    group: SettingsGroup,
    data: Record<string, string>,
  ): Promise<Record<string, string>> {
    const entries = Object.entries(data);

    const g = dbGroup(group);
    await this.prisma.$transaction(
      entries.map(
        ([key, value]) =>
          this.prisma.$executeRaw`
          INSERT INTO settings ("id", "group", "key", "value", "updatedAt")
          VALUES (gen_random_uuid(), ${g}::"SettingsGroup", ${key}, ${value}, NOW())
          ON CONFLICT ("group", "key")
          DO UPDATE SET "value" = ${value}, "updatedAt" = NOW()
        `,
      ),
    );

    void this.revalidate.revalidate({ tags: ['site-config', 'settings'] });
    return this.getByGroup(group);
  }

  /** Delete a single setting. */
  async delete(group: SettingsGroup, key: string): Promise<void> {
    const g = dbGroup(group);
    await this.prisma.$executeRaw`
      DELETE FROM settings WHERE "group"::text = ${g} AND key = ${key}
    `;
    void this.revalidate.revalidate({ tags: ['site-config', 'settings'] });
  }

  /** Get all settings across all groups. */
  async getAll(): Promise<Record<SettingsGroup, Record<string, string>>> {
    const rows: SettingRecord[] = await this.prisma.$queryRaw`
      SELECT * FROM settings ORDER BY "group", key
    `;

    const result = {} as Record<SettingsGroup, Record<string, string>>;

    for (const row of rows) {
      const grp = row.group as SettingsGroup;
      if (!result[grp]) {
        result[grp] = {};
      }
      result[grp][row.key] = row.value;
    }

    return result;
  }

  /**
   * Public-safe subset of settings for the storefront.
   *
   * Anything sensitive (SMTP credentials, payment gateway keys, webhook
   * secrets) must stay out of this list. Values are typed (booleans /
   * numbers / arrays) so consumers don't each re-parse strings.
   */
  async getPublicSettings(): Promise<PublicSettings> {
    const rows: SettingRecord[] = await this.prisma.$queryRaw`
      SELECT * FROM settings
      WHERE ("group"::text, key) IN (${joinTuples(PUBLIC_KEYS)})
    `;

    const raw: Record<string, string> = {};
    for (const row of rows) {
      raw[`${row.group}.${row.key}`] = row.value;
    }

    return buildPublicSettings(raw);
  }
}

// --- Public settings whitelist -----------------------------------------
// (group, key) pairs considered safe to expose to unauthenticated clients.
// Numbers/booleans/arrays are parsed in `buildPublicSettings`.

const PUBLIC_KEYS: [string, string][] = [
  // GENERAL
  ['GENERAL', 'site_name'],
  ['GENERAL', 'site_name_bn'],
  ['GENERAL', 'site_tagline'],
  ['GENERAL', 'site_tagline_bn'],
  ['GENERAL', 'currency'],
  ['GENERAL', 'currency_symbol'],
  ['GENERAL', 'currency_position'],
  ['GENERAL', 'default_language'],
  ['GENERAL', 'supported_languages'],
  ['GENERAL', 'timezone'],
  ['GENERAL', 'date_format'],
  ['GENERAL', 'phone'],
  ['GENERAL', 'support_email'],
  ['GENERAL', 'address'],
  ['GENERAL', 'return_policy_days'],
  ['GENERAL', 'announcement_text'],
  ['GENERAL', 'announcement_text_bn'],
  ['GENERAL', 'announcement_enabled'],
  ['GENERAL', 'home_sections'],
  // SHIPPING
  ['SHIPPING', 'free_shipping_threshold'],
  ['SHIPPING', 'enable_free_shipping'],
  // TAX
  ['TAX', 'vat_percentage'],
  ['TAX', 'vat_included_in_price'],
  ['TAX', 'enable_tax'],
  // PAYMENT — booleans and limits only, never keys/secrets
  ['PAYMENT', 'enable_cod'],
  ['PAYMENT', 'enable_bkash'],
  ['PAYMENT', 'enable_nagad'],
  ['PAYMENT', 'enable_rocket'],
  ['PAYMENT', 'enable_stripe'],
  ['PAYMENT', 'cod_extra_charge'],
  ['PAYMENT', 'min_order_amount'],
  ['PAYMENT', 'max_cod_amount'],
  // SEO
  ['SEO', 'meta_title'],
  ['SEO', 'meta_description'],
  ['SEO', 'meta_keywords'],
  ['SEO', 'og_image'],
  ['SEO', 'google_analytics_id'],
  ['SEO', 'facebook_pixel_id'],
  ['SEO', 'allow_indexing'],
  // SOCIAL — all URLs, public
  ['SOCIAL', 'facebook_url'],
  ['SOCIAL', 'instagram_url'],
  ['SOCIAL', 'youtube_url'],
  ['SOCIAL', 'twitter_url'],
  ['SOCIAL', 'tiktok_url'],
  ['SOCIAL', 'whatsapp_number'],
];

export interface PublicSettings {
  general: {
    site_name: string;
    site_name_bn: string;
    site_tagline: string;
    site_tagline_bn: string;
    currency: string;
    currency_symbol: string;
    currency_position: 'before' | 'after';
    default_language: string;
    supported_languages: string[];
    timezone: string;
    date_format: string;
    phone: string;
    support_email: string;
    address: string;
    return_policy_days: number;
    announcement_text: string;
    announcement_text_bn: string;
    announcement_enabled: boolean;
    home_sections: unknown; // validated in web app
  };
  shipping: {
    free_shipping_threshold: number;
    enable_free_shipping: boolean;
  };
  tax: {
    vat_percentage: number;
    vat_included_in_price: boolean;
    enable_tax: boolean;
  };
  payment: {
    enable_cod: boolean;
    enable_bkash: boolean;
    enable_nagad: boolean;
    enable_rocket: boolean;
    enable_stripe: boolean;
    cod_extra_charge: number;
    min_order_amount: number;
    max_cod_amount: number;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string[];
    og_image: string;
    google_analytics_id: string;
    facebook_pixel_id: string;
    allow_indexing: boolean;
  };
  social: {
    facebook_url: string;
    instagram_url: string;
    youtube_url: string;
    twitter_url: string;
    tiktok_url: string;
    whatsapp_number: string;
  };
}

function buildPublicSettings(raw: Record<string, string>): PublicSettings {
  const str = (k: string, d = '') => raw[k] ?? d;
  const num = (k: string, d = 0) => {
    const v = raw[k];
    if (v === undefined) {
      return d;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const bool = (k: string, d = false) => {
    const v = raw[k];
    if (v === undefined) {
      return d;
    }
    return v === 'true' || v === '1';
  };
  const arr = (k: string): string[] => {
    const v = raw[k];
    if (!v) {
      return [];
    }
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };
  const json = (k: string): unknown => {
    const v = raw[k];
    if (!v) {
      return null;
    }
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const currencyPos = str('GENERAL.currency_position', 'before');

  return {
    general: {
      site_name: str('GENERAL.site_name', 'ShopBD'),
      site_name_bn: str('GENERAL.site_name_bn', 'শপবিডি'),
      site_tagline: str('GENERAL.site_tagline', ''),
      site_tagline_bn: str('GENERAL.site_tagline_bn', ''),
      currency: str('GENERAL.currency', 'BDT'),
      currency_symbol: str('GENERAL.currency_symbol', '৳'),
      currency_position: currencyPos === 'after' ? 'after' : 'before',
      default_language: str('GENERAL.default_language', 'en'),
      supported_languages: arr('GENERAL.supported_languages'),
      timezone: str('GENERAL.timezone', 'Asia/Dhaka'),
      date_format: str('GENERAL.date_format', 'DD/MM/YYYY'),
      phone: str('GENERAL.phone'),
      support_email: str('GENERAL.support_email'),
      address: str('GENERAL.address'),
      return_policy_days: num('GENERAL.return_policy_days', 7),
      announcement_text: str('GENERAL.announcement_text'),
      announcement_text_bn: str('GENERAL.announcement_text_bn'),
      announcement_enabled: bool('GENERAL.announcement_enabled', false),
      home_sections: json('GENERAL.home_sections'),
    },
    shipping: {
      free_shipping_threshold: num('SHIPPING.free_shipping_threshold', 2000),
      enable_free_shipping: bool('SHIPPING.enable_free_shipping', true),
    },
    tax: {
      vat_percentage: num('TAX.vat_percentage', 15),
      vat_included_in_price: bool('TAX.vat_included_in_price', true),
      enable_tax: bool('TAX.enable_tax', false),
    },
    payment: {
      enable_cod: bool('PAYMENT.enable_cod', true),
      enable_bkash: bool('PAYMENT.enable_bkash', true),
      enable_nagad: bool('PAYMENT.enable_nagad', true),
      enable_rocket: bool('PAYMENT.enable_rocket', true),
      enable_stripe: bool('PAYMENT.enable_stripe', false),
      cod_extra_charge: num('PAYMENT.cod_extra_charge', 0),
      min_order_amount: num('PAYMENT.min_order_amount', 0),
      max_cod_amount: num('PAYMENT.max_cod_amount', 50000),
    },
    seo: {
      meta_title: str('SEO.meta_title'),
      meta_description: str('SEO.meta_description'),
      meta_keywords: arr('SEO.meta_keywords'),
      og_image: str('SEO.og_image'),
      google_analytics_id: str('SEO.google_analytics_id'),
      facebook_pixel_id: str('SEO.facebook_pixel_id'),
      allow_indexing: bool('SEO.allow_indexing', true),
    },
    social: {
      facebook_url: str('SOCIAL.facebook_url'),
      instagram_url: str('SOCIAL.instagram_url'),
      youtube_url: str('SOCIAL.youtube_url'),
      twitter_url: str('SOCIAL.twitter_url'),
      tiktok_url: str('SOCIAL.tiktok_url'),
      whatsapp_number: str('SOCIAL.whatsapp_number'),
    },
  };
}

/**
 * Render a list of `(group, key)` tuples as a Prisma.sql fragment suitable
 * for `IN` clauses.
 */
function joinTuples(pairs: [string, string][]): Prisma.Sql {
  const parts = pairs.map(([g, k]) => Prisma.sql`(${g}, ${k})`);
  return Prisma.join(parts);
}
