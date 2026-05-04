import { BullModule } from '@nestjs/bull';
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EmailEventsService } from './email-events.service';
import { EmailQueueProcessor } from './email-queue.processor';
import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [ConfigModule, BullModule.registerQueue({ name: 'email' })],
  providers: [EmailService, EmailQueueService, EmailQueueProcessor, EmailEventsService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
