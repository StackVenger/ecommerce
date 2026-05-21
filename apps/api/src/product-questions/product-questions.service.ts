import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AnswerProductQuestionDto } from './dto/answer-question.dto';
import { CreateProductQuestionDto } from './dto/create-question.dto';

@Injectable()
export class ProductQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductQuestionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, status: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('You can only ask questions on active products');
    }

    return this.prisma.productQuestion.create({
      data: {
        productId: dto.productId,
        userId,
        question: dto.question.trim(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Public listing — newest questions first, answered ones bubble up
   * after their answered date. Two query passes keep the response shape
   * small and avoid joining every user record we don't need.
   */
  async findByProduct(
    productId: string,
    params: { page?: number; limit?: number; onlyAnswered?: boolean },
  ) {
    const { page = 1, limit = 10, onlyAnswered = false } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { productId };
    if (onlyAnswered) {
      where.answer = { not: null };
    }

    const [items, total, answeredCount] = await Promise.all([
      this.prisma.productQuestion.findMany({
        where,
        orderBy: [{ answeredAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          answerer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.productQuestion.count({ where: { productId } }),
      this.prisma.productQuestion.count({
        where: { productId, answer: { not: null } },
      }),
    ]);

    return {
      questions: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      answeredCount,
    };
  }

  async answer(id: string, adminUserId: string, dto: AnswerProductQuestionDto) {
    const existing = await this.prisma.productQuestion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Question not found');
    }
    return this.prisma.productQuestion.update({
      where: { id },
      data: {
        answer: dto.answer.trim(),
        answeredBy: adminUserId,
        answeredAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        answerer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.productQuestion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Question not found');
    }
    await this.prisma.productQuestion.delete({ where: { id } });
    return { deleted: true, id };
  }

  /** Admin listing — every question across the catalogue, paginated. */
  async findAllForAdmin(params: {
    page?: number;
    limit?: number;
    status?: 'all' | 'pending' | 'answered';
  }) {
    const { page = 1, limit = 20, status = 'all' } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status === 'pending') {
      where.answer = null;
    } else if (status === 'answered') {
      where.answer = { not: null };
    }

    const [items, total] = await Promise.all([
      this.prisma.productQuestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          answerer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.productQuestion.count({ where }),
    ]);

    return {
      questions: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }
}
