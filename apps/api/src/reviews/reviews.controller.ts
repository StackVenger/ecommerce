import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** POST /reviews — submit a new review */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return { data: await this.reviewsService.create(req.user.id, dto) };
  }

  /** GET /reviews/product/:productId — list approved reviews for a product */
  @Get('product/:productId')
  @UseGuards(OptionalAuthGuard)
  async getProductReviews(
    @Param('productId') productId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'newest' | 'highest' | 'lowest' | 'helpful',
    @Query('rating') rating?: string,
  ) {
    const ratingNum = rating ? Number(rating) : undefined;
    return {
      data: await this.reviewsService.getProductReviews(productId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy ?? 'newest',
        rating: Number.isFinite(ratingNum) ? ratingNum : undefined,
        currentUserId: req.user?.id,
      }),
    };
  }

  /** POST /reviews/:id/helpful — toggle a "helpful" upvote on a review */
  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleHelpful(@Param('id') id: string, @Req() req: any) {
    return { data: await this.reviewsService.toggleHelpful(id, req.user.id) };
  }

  /** GET /reviews/product/:productId/stats — aggregated review stats */
  @Get('product/:productId/stats')
  async getReviewStats(@Param('productId') productId: string) {
    return { data: await this.reviewsService.getReviewStats(productId) };
  }

  /** GET /reviews/:id — get a review */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.reviewsService.findById(id) };
  }

  /** PATCH /reviews/:id — update own review */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Req() req: any, @Body() body: Partial<CreateReviewDto>) {
    return { data: await this.reviewsService.update(id, req.user.id, body) };
  }

  /** DELETE /reviews/:id — delete own review */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return { data: await this.reviewsService.remove(id, req.user.id) };
  }
}
