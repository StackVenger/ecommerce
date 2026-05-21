import { Module } from '@nestjs/common';

import { ProductQuestionsController } from './product-questions.controller';
import { ProductQuestionsService } from './product-questions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductQuestionsController],
  providers: [ProductQuestionsService],
  exports: [ProductQuestionsService],
})
export class ProductQuestionsModule {}
