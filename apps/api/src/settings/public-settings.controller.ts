import { Controller, Get } from '@nestjs/common';

import { SettingsService } from './settings.service';

/**
 * Public, unauthenticated read of the storefront-safe settings subset.
 *
 * The storefront relies on a single request here for site identity,
 * currency, payment toggles, announcement copy, homepage section layout
 * and a few SEO fields. Sensitive keys (SMTP credentials, gateway API
 * keys, webhook secrets) are filtered out in `getPublicSettings`.
 */
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  async getPublic() {
    return { data: await this.settings.getPublicSettings() };
  }
}
