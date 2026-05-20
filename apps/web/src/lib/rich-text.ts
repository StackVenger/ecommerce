/**
 * Helpers for the rich-text editor → storefront pipeline.
 *
 * Descriptions are stored as HTML strings (whatever TipTap emits). Legacy
 * rows still hold plain text from the old textareas, so the renderer
 * normalises bare text into safe HTML before handing it to React's
 * `dangerouslySetInnerHTML`.
 */

const HTML_TAG_PROBE = /<\/?[a-z][\s\S]*?>/i;

/** Cheap "does this look like HTML" check — enough to keep the
 *  normaliser idempotent on real editor output. */
export function isLikelyHtml(value: string): boolean {
  return HTML_TAG_PROBE.test(value);
}

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

/**
 * Convert a stored description into render-safe HTML.
 *
 * - Real HTML (anything matching {@link isLikelyHtml}) is returned as-is.
 * - Plain text is escaped, split into paragraphs on blank lines, and
 *   single newlines are rendered as `<br>` so legacy content keeps its
 *   visual structure.
 */
export function normalizeToHtml(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (isLikelyHtml(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
