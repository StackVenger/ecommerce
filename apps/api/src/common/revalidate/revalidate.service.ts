import { Injectable, Logger } from '@nestjs/common';

/**
 * Fires a tag/path invalidation at the Next.js storefront so admin edits
 * become visible immediately instead of waiting for the default cache
 * window. Failures are logged but never thrown — a missed revalidation is
 * eventually consistent (the cache will expire on its own), so the
 * surrounding admin mutation must not fail because the webhook is down.
 *
 * Required env:
 *   WEB_URL            — storefront base URL (e.g. http://localhost:3000)
 *   REVALIDATE_SECRET  — shared secret matching the Next route handler
 *
 * Omit either and the service no-ops with a debug log. This keeps dev
 * ergonomic when the web app is not running.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  async revalidate(input: { tags?: string[]; paths?: string[] }): Promise<void> {
    const webUrl = process.env.WEB_URL;
    const secret = process.env.REVALIDATE_SECRET;

    if (!webUrl || !secret) {
      this.logger.debug(
        `Skipping revalidate (${input.tags?.length ?? 0} tags, ${
          input.paths?.length ?? 0
        } paths): WEB_URL / REVALIDATE_SECRET not configured`,
      );
      return;
    }

    const body = JSON.stringify({
      tags: input.tags ?? [],
      paths: input.paths ?? [],
    });

    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body,
        // Don't hang admin requests on a slow storefront.
        signal: AbortSignal.timeout(3_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Revalidate returned ${res.status}: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Revalidate call failed: ${message}`);
    }
  }
}
