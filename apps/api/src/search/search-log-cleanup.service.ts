import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Prunes old SearchLog rows so the table doesn't grow unbounded.
 *
 * SearchLog is written for every anonymous search (used by the admin
 * "Most Searched Terms" widget). The widget only ever looks at recent
 * activity, so anything older than the TTL is dead weight in the DB.
 */
@Injectable()
export class SearchLogCleanupService {
  private readonly logger = new Logger(SearchLogCleanupService.name);

  /** Rows older than this are pruned. 90 days keeps a comfortable analytics window. */
  private readonly SEARCH_LOG_TTL_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleSearchLogCleanup(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.SEARCH_LOG_TTL_DAYS);

    try {
      const result = await this.prisma.searchLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(
          `SearchLog cleanup removed ${result.count} rows older than ${this.SEARCH_LOG_TTL_DAYS} days`,
        );
      }
    } catch (err) {
      this.logger.error('SearchLog cleanup failed', err);
    }
  }
}
