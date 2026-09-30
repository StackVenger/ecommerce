import { Facebook, Instagram, MessageCircle, Music2, Twitter, Youtube } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Social profile settings from /admin/settings (all optional). */
export interface SocialSettings {
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  whatsapp_number?: string;
}

/** Only http(s) profile URLs are rendered, so a stored `javascript:` URL can't become a link. */
function safeUrl(url?: string): string | null {
  if (!url) {
    return null;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** Resolve the admin social settings into the links that are actually configured. */
export function socialLinksFrom(social?: SocialSettings) {
  const links: Array<{ label: string; href: string; icon: typeof Facebook }> = [];
  const add = (label: string, url: string | undefined, icon: typeof Facebook) => {
    const href = safeUrl(url);
    if (href) {
      links.push({ label, href, icon });
    }
  };
  add('Facebook', social?.facebook_url, Facebook);
  add('Twitter', social?.twitter_url, Twitter);
  add('Instagram', social?.instagram_url, Instagram);
  add('YouTube', social?.youtube_url, Youtube);
  add('TikTok', social?.tiktok_url, Music2);
  if (social?.whatsapp_number) {
    const digits = social.whatsapp_number.replace(/[^\d]/g, '');
    if (digits) {
      links.push({ label: 'WhatsApp', href: `https://wa.me/${digits}`, icon: MessageCircle });
    }
  }
  return links;
}

interface SocialLinksProps {
  social?: SocialSettings;
  /**
   * `onBrand`: bare white glyphs for the coral top bar.
   * `round`: filled circles for the footer brand column.
   * `default`: bare grey glyphs.
   */
  variant?: 'default' | 'onBrand' | 'round';
  /** Optional leading caption ("Follow Us:"). */
  label?: string;
  className?: string;
}

/** Row of the admin-configured social profile links; renders nothing when none are set. */
export function SocialLinks({ social, variant = 'default', label, className }: SocialLinksProps) {
  const links = socialLinksFrom(social);
  if (links.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && (
        <span
          className={cn(
            'text-[13px] font-light',
            variant === 'onBrand' ? 'text-white/80' : 'text-gray-500',
          )}
        >
          {label}
        </span>
      )}
      <ul className={cn('flex items-center', variant === 'round' ? 'gap-2.5' : 'gap-3.5')}>
        {links.map(({ label: name, href, icon: Icon }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={name}
              title={name}
              className={cn(
                'flex items-center justify-center transition-colors',
                variant === 'onBrand' && 'text-white hover:text-white/70',
                variant === 'default' && 'text-gray-500 hover:text-primary',
                variant === 'round' &&
                  'h-9 w-9 rounded-full bg-gray-100 text-gray-700 hover:bg-primary hover:text-white',
              )}
            >
              <Icon
                className={variant === 'round' ? 'h-4 w-4' : 'h-3.5 w-3.5'}
                strokeWidth={variant === 'round' ? 1.75 : 2}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
