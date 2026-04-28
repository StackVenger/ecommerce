import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /** Submit a review (customer must have purchased the product). */
  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: 'DELIVERED' },
      },
    });

    if (!hasPurchased) {
      throw new BadRequestException('You can only review products you have purchased');
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: dto.images ?? [],
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** Get a single review by ID. */
  async findById(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  /** Update a user's own review. */
  async update(
    id: string,
    userId: string,
    data: Partial<Pick<CreateReviewDto, 'rating' | 'title' | 'comment'>>,
  ) {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new BadRequestException('You can only edit your own reviews');
    }

    return this.prisma.review.update({
      where: { id },
      data: { ...data, status: 'PENDING' },
    });
  }

  /** Delete a user's own review. */
  async remove(id: string, userId: string) {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({ where: { id } });
    if (Array.isArray(review.images) && review.images.length > 0) {
      await this.uploadService.deleteByUrls(review.images);
    }
    return { deleted: true };
  }

  /** Get paginated reviews for a product (only approved). */
  async getProductReviews(
    productId: string,
    params: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'highest' | 'lowest' | 'helpful';
    },
  ) {
    const { page = 1, limit = 10, sortBy = 'newest' } = params;
    const skip = (page - 1) * limit;

    const orderBy: Record<string, unknown> =
      sortBy === 'newest'
        ? { createdAt: 'desc' }
        : sortBy === 'highest'
          ? { rating: 'desc' }
          : sortBy === 'lowest'
            ? { rating: 'asc' }
            : { helpfulCount: 'desc' };

    const where = { productId, status: 'APPROVED' };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /** Get aggregate review statistics for a product. */
  async getReviewStats(productId: string) {
    const [stats, distribution] = await Promise.all([
      this.prisma.review.aggregate({
        where: { productId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: { id: true },
      }),
      // Get count per rating (1-5)
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId, status: 'APPROVED' },
        _count: { id: true },
        orderBy: { rating: 'desc' },
      }),
    ]);

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of distribution) {
      ratingDistribution[row.rating] = row._count.id;
    }

    return {
      averageRating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      totalReviews: stats._count.id,
      ratingDistribution,
    };
  }
}
