import { Global, Module } from '@nestjs/common';

import { RevalidateService } from './revalidate.service';

/**
 * Global so every feature module can inject `RevalidateService` without
 * re-declaring it as a dependency. It holds no state and has no external
 * DB connection, so the global scope is safe.
 */
@Global()
@Module({
  providers: [RevalidateService],
  exports: [RevalidateService],
})
export class RevalidateModule {}
