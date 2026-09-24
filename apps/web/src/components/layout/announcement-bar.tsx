'use client';

import { useEffect, useState } from 'react';

interface AnnouncementBarProps {
  /** Master on/off switch, settable from /admin/settings/general. */
  enabled?: boolean;
  /** English announcement copy. Empty string hides the bar. */
  text?: string;
  /** Optional Bengali translation; shown when the document is `lang="bn"`. */
  textBn?: string;
  /** Optional deep link wrapped around the text ("Shop Now" → /products). */
  link?: string;
  /** Unique id used for the session-storage dismiss key. */
  id?: string;
}

/**
 * Thin announcement strip above the header. All copy is admin-controlled;
 * a missing `text` (or `enabled=false`) makes this render nothing, so the
 * default path is silent unless the admin explicitly enables it.
 *
 * The bar is dismissible for the session. We persist the dismissal in
 * sessionStorage keyed by `id`, so replacing the text in admin naturally
 * re-surfaces the bar to every visitor on the next session.
 */
export function AnnouncementBar({
  enabled = false,
  text = '',
  textBn = '',
  link,
  id = 'default-announcement',
}: AnnouncementBarProps = {}) {
  const [hidden, setHidden] = useState(true);
  const [locale, setLocale] = useState<'en' | 'bn'>('en');

  const storageKey = `announcement-dismissed-${id}`;

  useEffect(() => {
    const dismissed = sessionStorage.getItem(storageKey);
    setHidden(Boolean(dismissed));

    if (document.documentElement.lang === 'bn') {
      setLocale('bn');
    }
  }, [storageKey]);

  if (!enabled) {
    return null;
  }
  const displayText = locale === 'bn' && textBn ? textBn : text;
  if (!displayText || hidden) {
    return null;
  }

  const handleDismiss = () => {
    setHidden(true);
    sessionStorage.setItem(storageKey, 'true');
  };

  return (
    <div
      className="relative w-full bg-ink px-10 py-2.5 text-center text-xs font-bold text-white"
      role="banner"
      aria-label="Announcement"
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>

        <p className="inline-flex flex-wrap items-center gap-1">
          {link ? (
            <a
              href={link}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {displayText}
            </a>
          ) : (
            <span>{displayText}</span>
          )}
        </p>

        {textBn && (
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')}
            className="ml-2 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-black opacity-80 transition-opacity hover:opacity-100"
            aria-label="Toggle language"
          >
            {locale === 'en' ? 'বাং' : 'EN'}
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
