import { normalizeToHtml } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

interface RichTextProps {
  html: string | null | undefined;
  /** Extra classes appended after the prose defaults. */
  className?: string;
  /** Override the wrapping element when needed (default `div`). */
  as?: 'div' | 'section' | 'article';
}

/**
 * Render admin-authored rich text (HTML from the TipTap editor) with
 * Tailwind Typography defaults. Plain-text legacy values are wrapped in
 * paragraphs by {@link normalizeToHtml} so they look the same as freshly
 * authored content.
 *
 * Trust model: the author is an authenticated admin, mirroring the
 * existing CMS pages route. If sanitisation is ever added, it lives in
 * one place — right here.
 */
export function RichText({ html, className, as: Tag = 'div' }: RichTextProps) {
  const safe = normalizeToHtml(html);
  if (!safe) {
    return null;
  }
  return (
    <Tag
      className={cn('prose prose-sm max-w-none sm:prose-base', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
