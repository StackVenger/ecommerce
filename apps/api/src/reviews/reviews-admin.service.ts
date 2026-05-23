import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  AdminReviewQueryDto,
  ModerateReviewDto,
} from './dto/moderate-review.dto';
import { ReviewsService } from './reviews.service';

@Injectable()
export class ReviewsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async findAll(query: AdminReviewQueryDto) {
    const { status, productId, page = '1', limit = '20' } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: {
            select: {
              id: true, name: true, slug: true,
              images: { select: { url: true }, orderBy: { isPrimary: 'desc' }, take: 3 },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        ...r,
        product: {
          ...r.product,
          images: r.product.images.map((img) => img.url),
        },
      })),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: dto.status,
        adminReply: dto.adminNote,
      },
    });

    // Status flip can promote a review into or out of APPROVED; refresh
    // the product's denormalized rating aggregates either way.
    await this.reviewsService.recomputeProductRatingStats(review.productId);

    return updated;
  }

  async respond(id: string, response: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { adminReply: response, repliedAt: new Date() },
    });
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id } });
    await this.reviewsService.recomputeProductRatingStats(review.productId);
    return { deleted: true };
  }
}
