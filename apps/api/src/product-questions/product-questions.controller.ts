import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AnswerProductQuestionDto } from './dto/answer-question.dto';
import { CreateProductQuestionDto } from './dto/create-question.dto';
import { ProductQuestionsService } from './product-questions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('product-questions')
export class ProductQuestionsController {
  constructor(private readonly service: ProductQuestionsService) {}

  /** POST /product-questions — authenticated customer asks a question */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() dto: CreateProductQuestionDto) {
    return { data: await this.service.create(req.user.id, dto) };
  }

  /** GET /product-questions/product/:productId — public list */
  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('onlyAnswered') onlyAnswered?: string,
  ) {
    return {
      data: await this.service.findByProduct(productId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        onlyAnswered: onlyAnswered === 'true' || onlyAnswered === '1',
      }),
    };
  }

  /** GET /product-questions/admin — admin listing */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'all' | 'pending' | 'answered',
  ) {
    return {
      data: await this.service.findAllForAdmin({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        status: status ?? 'all',
      }),
    };
  }

  /** POST /product-questions/:id/answer — admin posts an answer */
  @Post(':id/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async answer(@Param('id') id: string, @Req() req: any, @Body() dto: AnswerProductQuestionDto) {
    return { data: await this.service.answer(id, req.user.id, dto) };
  }

  /** DELETE /product-questions/:id — admin removes a question */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    return { data: await this.service.remove(id) };
  }
}
