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
        // hasPurchased was just confirmed above — flag the review so the
        // storefront can show the "Verified Purchase" chip.
        isVerified: true,
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
      rating?: number;
      currentUserId?: string;
    },
  ) {
    const { page = 1, limit = 10, sortBy = 'newest', rating, currentUserId } = params;
    const skip = (page - 1) * limit;

    const orderBy: Record<string, unknown> =
      sortBy === 'newest'
        ? { createdAt: 'desc' }
        : sortBy === 'highest'
          ? { rating: 'desc' }
          : sortBy === 'lowest'
            ? { rating: 'asc' }
            : { helpfulCount: 'desc' };

    const where: Record<string, unknown> = { productId, status: 'APPROVED' };
    if (rating && rating >= 1 && rating <= 5) {
      where.rating = rating;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          // When a viewer is signed in, surface whether they've already
          // upvoted each review so the UI can render the thumb as filled.
          ...(currentUserId
            ? {
                helpfulVotes: {
                  where: { userId: currentUserId },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const enriched = reviews.map((r) => {
      const { helpfulVotes, ...rest } = r as typeof r & { helpfulVotes?: { id: string }[] };
      return {
        ...rest,
        viewerHasMarkedHelpful: Array.isArray(helpfulVotes) && helpfulVotes.length > 0,
      };
    });

    return {
      reviews: enriched,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Toggle the "helpful" vote for the given review on behalf of the user.
   * The join row enforces one vote per (reviewId, userId) pair, and the
   * counter on the review is kept in sync inside a transaction.
   */
  async toggleHelpful(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true, userId: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.status !== 'APPROVED') {
      throw new BadRequestException('Review is not available');
    }
    if (review.userId === userId) {
      throw new BadRequestException('You cannot mark your own review as helpful');
    }

    const existing = await this.prisma.reviewHelpful.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existing) {
      const result = await this.prisma.$transaction([
        this.prisma.reviewHelpful.delete({ where: { id: existing.id } }),
        this.prisma.review.update({
          where: { id: reviewId },
          data: { helpfulCount: { decrement: 1 } },
          select: { helpfulCount: true },
        }),
      ]);
      return { marked: false, helpfulCount: Math.max(0, result[1].helpfulCount) };
    }

    const result = await this.prisma.$transaction([
      this.prisma.reviewHelpful.create({ data: { reviewId, userId } }),
      this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      }),
    ]);
    return { marked: true, helpfulCount: result[1].helpfulCount };
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
